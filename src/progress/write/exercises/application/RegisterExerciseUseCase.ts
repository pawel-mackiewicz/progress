import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import { toLocalDayKey } from '@/progress/date'
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
      await this.addExerciseToTrainingDay(exercise, toLocalDayKey(now))
    })
  }

  private async addExerciseToTrainingDay(
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

    const activeExercises = await this.exerciseRepo.findAllActive()
    await this.trainingDayRepo.save(TrainingDay.open(today, activeExercises))
  }
}
