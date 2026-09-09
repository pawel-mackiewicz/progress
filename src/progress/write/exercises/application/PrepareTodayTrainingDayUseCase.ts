import { shiftLocalDay, toLocalDayKey, type LocalDayKey } from '@/progress/date'
import type { DayOutcomeRepoPort } from '@/progress/write/exercises/application/ports/DayOutcomeRepoPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { PlayerStatsRepoPort } from '@/progress/write/exercises/application/ports/PlayerStatsRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class PrepareTodayTrainingDayUseCase implements UseCase<
  void,
  LocalDayKey
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly playerStatsRepo: PlayerStatsRepoPort,
    private readonly dayOutcomeRepo: DayOutcomeRepoPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(): Promise<LocalDayKey> {
    return this.unitOfWork.execute(async () => {
      const today = toLocalDayKey(this.clock.now())
      const latestTrainingDay = await this.trainingDayRepo.findLatest()

      if (latestTrainingDay?.day === today) {
        if (latestTrainingDay.status !== 'OPEN') {
          throw new TrainingDayNotOpenForTodayError(
            'Today’s training day has already been finalized.'
          )
        }

        return today
      }

      if (latestTrainingDay?.status === 'OPEN') {
        await this.trainingDayRepo.save(latestTrainingDay.finalize())
      }

      await this.finalizeElapsedDays(latestTrainingDay, today)

      const activeExercises = await this.exerciseRepo.findAllActive()
      await this.trainingDayRepo.save(TrainingDay.open(today, activeExercises))

      return today
    })
  }

  private async finalizeElapsedDays(
    latestTrainingDay: TrainingDay | undefined,
    today: LocalDayKey
  ): Promise<void> {
    const latestOutcome = await this.dayOutcomeRepo.findLatestBefore(today)
    const firstUnprocessedDay = latestOutcome
      ? shiftLocalDay(latestOutcome.day, 1)
      : latestTrainingDay?.day

    if (!firstUnprocessedDay || firstUnprocessedDay >= today) {
      return
    }

    let stats = await this.playerStatsRepo.get()

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
  }
}
