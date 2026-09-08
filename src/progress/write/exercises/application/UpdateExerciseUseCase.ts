import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { UpdateExerciseCommand } from '@/progress/write/exercises/application/requests/UpdateExerciseCommand'
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

export class UpdateExerciseUseCase implements UseCase<UpdateExerciseCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly dailyCompletion: DailyCompletionPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: UpdateExerciseCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const exercise = await this.findExercise(command.id)
      await this.ensureNameIsAvailable(command)
      const now = this.clock.now()
      const today = toLocalDayKey(now)
      const trainingDay = await this.trainingDayRepo.findLatestOnOrBefore(today)

      if (trainingDay?.day !== today || trainingDay.status !== 'OPEN') {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before updating an exercise.'
        )
      }

      const updatedExercise = exercise.updateDetails(command, now)
      const updatedTrainingDay = trainingDay.updateExercise(updatedExercise)

      await this.exerciseRepo.save(updatedExercise)
      await this.trainingDayRepo.save(updatedTrainingDay)
      await this.dailyCompletion.awardIfAllGoalsAreComplete(today)
    })
  }

  private async findExercise(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findById(id)

    if (!exercise) {
      throw new ExerciseNotFoundError('Exercise not found.')
    }

    return exercise
  }

  private async ensureNameIsAvailable(
    command: UpdateExerciseCommand
  ): Promise<void> {
    if (await this.exerciseRepo.existsActiveByName(command.name, command.id)) {
      throw new DuplicateExerciseNameError(
        'An active exercise with this name already exists.'
      )
    }
  }
}
