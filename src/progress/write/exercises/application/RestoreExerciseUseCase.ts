import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { RestoreExerciseCommand } from '@/progress/write/exercises/application/requests/RestoreExerciseCommand'
import { toLocalDayKey } from '@/progress/date'
import {
  DuplicateExerciseNameError,
  type Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class RestoreExerciseUseCase implements UseCase<RestoreExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: RestoreExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      await this.ensureNameIsAvailable(exercise)
      const now = this.clock.now()
      const today = toLocalDayKey(now)
      const trainingDay = await this.trainingDayRepo.findLatest()

      if (trainingDay?.day !== today || trainingDay.status !== 'OPEN') {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before restoring an exercise.'
        )
      }

      const restoredExercise = exercise.reactivate(now)

      await this.exerciseRepo.save(restoredExercise)
      await this.trainingDayRepo.save(trainingDay.addExercise(restoredExercise))
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
}
