import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { DayOutcomeRepoPort } from '@/progress/write/exercises/application/ports/DayOutcomeRepoPort'
import type { PlayerStatsRepoPort } from '@/progress/write/exercises/application/ports/PlayerStatsRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import { shiftLocalDay, toLocalDayKey } from '@/progress/date'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import {
  DuplicateExerciseNameError,
  Exercise
} from '@/progress/write/exercises/domain/Exercise'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class RegisterExerciseUseCase implements UseCase<RegisterExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly playerStatsRepo: PlayerStatsRepoPort,
    private readonly dayOutcomeRepo: DayOutcomeRepoPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: RegisterExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      if (await this.exerciseRepo.existsActiveByName(command.name)) {
        throw new DuplicateExerciseNameError(
          'An active exercise with this name already exists.'
        )
      }

      const now = this.clock.now()
      const exercise = Exercise.register(
        command,
        this.idGenerator.generate(),
        now
      )

      await this.exerciseRepo.save(exercise)
      await this.updateSystemState(exercise, toLocalDayKey(now))
    })
  }

  private async updateSystemState(
    exercise: Exercise,
    today: ReturnType<typeof toLocalDayKey>
  ): Promise<void> {
    const latestTrainingDay =
      await this.trainingDayRepo.findLatestOnOrBefore(today)

    if (latestTrainingDay?.day === today) {
      await this.trainingDayRepo.save(latestTrainingDay.addExercise(exercise))
      return
    }

    if (latestTrainingDay?.status === 'OPEN') {
      await this.trainingDayRepo.save(latestTrainingDay.finalize())
    }

    await this.finalizeElapsedDays(latestTrainingDay, today)

    const activeExercises = await this.exerciseRepo.findAllActive()
    await this.trainingDayRepo.save(TrainingDay.open(today, activeExercises))
  }

  private async finalizeElapsedDays(
    latestTrainingDay: TrainingDay | undefined,
    today: ReturnType<typeof toLocalDayKey>
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
