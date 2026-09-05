import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { RestoreExerciseCommand } from '@/progress/write/exercises/application/requests/RestoreExerciseCommand'
import {
  DuplicateExerciseNameError,
  type Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class RestoreExerciseUseCase implements UseCase<RestoreExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: RestoreExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      await this.ensureNameIsAvailable(exercise)
      await this.restoreExercise(exercise)
    })
  }

  private async findExercise(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findById(id)

    if (!exercise) {
      throw new ExerciseNotFoundError('Exercise not found.')
    }

    return exercise
  }

  private async ensureNameIsAvailable(exercise: Exercise): Promise<void> {
    if (
      await this.exerciseRepo.existsActiveByName(exercise.name, exercise.id)
    ) {
      throw new DuplicateExerciseNameError(
        'An active exercise with this name already exists.'
      )
    }
  }

  private async restoreExercise(exercise: Exercise): Promise<void> {
    await this.exerciseRepo.save(exercise.reactivate(this.clock.now()))
  }
}
