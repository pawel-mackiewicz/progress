import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { RegisterExerciseCommand } from '@/progress/write/exercises/application/requests/RegisterExerciseCommand'
import {
  DuplicateExerciseNameError,
  Exercise
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class RegisterExerciseUseCase implements UseCase<RegisterExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
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

      const exercise = Exercise.register(
        command,
        this.idGenerator.generate(),
        this.clock.now()
      )

      await this.exerciseRepo.save(exercise)
    })
  }
}
