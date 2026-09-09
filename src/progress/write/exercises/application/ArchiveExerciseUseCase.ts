import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { ArchiveExerciseCommand } from '@/progress/write/exercises/application/requests/ArchiveExerciseCommand'
import {
  type Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export type ArchiveExerciseResult = {
  didCompleteDay: boolean
}

export class ArchiveExerciseUseCase implements UseCase<
  ArchiveExerciseCommand,
  ArchiveExerciseResult
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(
    command: ArchiveExerciseCommand
  ): Promise<ArchiveExerciseResult> {
    return this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      const trainingDay = await this.trainingDayRepo.findLatest()

      if (trainingDay?.day !== command.day || trainingDay.status !== 'OPEN') {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before archiving an exercise.'
        )
      }

      const archivedExercise = exercise.archive(this.clock.now())
      const updatedTrainingDay = trainingDay.removeExercise(exercise.id)

      await this.exerciseRepo.save(archivedExercise)
      await this.trainingDayRepo.save(updatedTrainingDay)

      return {
        didCompleteDay: !trainingDay.isComplete && updatedTrainingDay.isComplete
      }
    })
  }

  private async findExercise(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findById(id)

    if (!exercise) {
      throw new ExerciseNotFoundError('Exercise not found.')
    }

    return exercise
  }
}
