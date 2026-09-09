import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { AddRepCommand } from '@/progress/write/exercises/application/requests/AddRepCommand'
import { toLocalDayKey } from '@/progress/date'
import {
  ExerciseArchivedError,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export type AddRepResult = {
  repLogId: string
  dailyGoal: number
  completedReps: number
  isCompleted: boolean
}

export class AddRepUseCase implements UseCase<AddRepCommand, AddRepResult> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly exerciseRepo: ExerciseRepoPort,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly dailyCompletion: DailyCompletionPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: AddRepCommand): Promise<AddRepResult> {
    return this.unitOfWork.execute(async () => {
      const exercise = await this.exerciseRepo.findById(command.exerciseId)

      if (!exercise) {
        throw new ExerciseNotFoundError('Exercise not found.')
      }

      if (exercise.isArchived()) {
        throw new ExerciseArchivedError(
          'Cannot log reps for an archived exercise.'
        )
      }

      const now = this.clock.now()
      const today = toLocalDayKey(now)
      const trainingDay = await this.trainingDayRepo.findLatest()

      if (trainingDay?.day !== today || trainingDay.status !== 'OPEN') {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before recording reps.'
        )
      }

      const { trainingDay: updatedTrainingDay, repLog } =
        trainingDay.recordReps(
          command.exerciseId,
          command.amount,
          this.idGenerator.generate(),
          now
        )

      await this.trainingDayRepo.addRepLog(repLog)
      const progress = updatedTrainingDay.getExerciseProgress(
        command.exerciseId
      )
      await this.dailyCompletion.awardIfAllGoalsAreComplete(today, repLog.id)

      return {
        repLogId: repLog.id,
        ...progress
      }
    })
  }
}
