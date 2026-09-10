import { shiftLocalDay, toLocalDayKey, type LocalDayKey } from '@/progress/date'
import type { DayOutcomeRepoPort } from '@/progress/write/exercises/application/ports/DayOutcomeRepoPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { PlayerStatsRepoPort } from '@/progress/write/exercises/application/ports/PlayerStatsRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import type { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
import type { TrainingDayProgressionService } from '@/progress/write/exercises/domain/TrainingDayProgressionService'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export type ProgressedExerciseForCelebration = {
  exerciseId: string
  name: string
  level: number
  previousDailyGoal: number
  nextDailyGoal: number
}

export type PreparedTodayTrainingDay = {
  day: LocalDayKey
  stats: PlayerStats
  progressedExercises: ProgressedExerciseForCelebration[]
}

export class PrepareTodayTrainingDayUseCase implements UseCase<
  void,
  PreparedTodayTrainingDay
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly playerStatsRepo: PlayerStatsRepoPort,
    private readonly dayOutcomeRepo: DayOutcomeRepoPort,
    private readonly trainingDayProgression: TrainingDayProgressionService,
    private readonly clock: ClockPort
  ) {}

  public async handle(): Promise<PreparedTodayTrainingDay> {
    return this.unitOfWork.execute(async () => {
      const now = this.clock.now()
      const today = toLocalDayKey(now)
      const latestTrainingDay = await this.trainingDayRepo.findLatest()

      if (latestTrainingDay?.day === today) {
        if (latestTrainingDay.status !== 'OPEN') {
          throw new TrainingDayNotOpenForTodayError(
            'Today’s training day has already been finalized.'
          )
        }

        return {
          day: today,
          stats: await this.playerStatsRepo.get(),
          progressedExercises: []
        }
      }

      let progressedExercises: ProgressedExerciseForCelebration[] = []

      if (latestTrainingDay?.status === 'OPEN') {
        // TODO: Report progression consistency failures through application
        // observability once the app has an error-reporting boundary.
        const progression = this.trainingDayProgression.apply(
          latestTrainingDay,
          await this.exerciseRepo.findAll(),
          now
        )

        await this.trainingDayRepo.save(progression.finalizedTrainingDay)

        for (const progressedExercise of progression.progressedExercises) {
          await this.exerciseRepo.save(progressedExercise.exercise)
        }

        progressedExercises = progression.progressedExercises.map(
          ({ exercise, previousDailyGoal }) => ({
            exerciseId: exercise.id,
            name: exercise.name,
            level: exercise.level,
            previousDailyGoal,
            nextDailyGoal: exercise.dailyGoal
          })
        )
      }

      const stats = await this.finalizeElapsedDays(latestTrainingDay, today)

      const activeExercises = await this.exerciseRepo.findAllActive()
      await this.trainingDayRepo.save(TrainingDay.open(today, activeExercises))

      return { day: today, stats, progressedExercises }
    })
  }

  private async finalizeElapsedDays(
    latestTrainingDay: TrainingDay | undefined,
    today: LocalDayKey
  ): Promise<PlayerStats> {
    let stats = await this.playerStatsRepo.get()
    const latestOutcome = await this.dayOutcomeRepo.findLatestBefore(today)
    const firstUnprocessedDay = latestOutcome
      ? shiftLocalDay(latestOutcome.day, 1)
      : latestTrainingDay?.day

    if (!firstUnprocessedDay || firstUnprocessedDay >= today) {
      return stats
    }

    for (
      let day = firstUnprocessedDay;
      day < today;
      day = shiftLocalDay(day, 1)
    ) {
      const isComplete =
        day === latestTrainingDay?.day && latestTrainingDay.isComplete
      const transition = stats.apply(isComplete)

      stats = transition.stats
      await this.dayOutcomeRepo.save(new DayOutcome(day, transition.result))
    }

    await this.playerStatsRepo.save(stats)
    return stats
  }
}
