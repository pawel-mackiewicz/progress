import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { UndoRepCommand } from '@/progress/write/exercises/application/requests/UndoRepCommand'
import { toLocalDayKey } from '@/progress/date'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export class UndoRepUseCase implements UseCase<UndoRepCommand> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly dailyCompletion: DailyCompletionPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(command: UndoRepCommand): Promise<void> {
    await this.unitOfWork.execute(async () => {
      const today = toLocalDayKey(this.clock.now())
      const trainingDay = await this.trainingDayRepo.findLatest()

      if (trainingDay?.day !== today || trainingDay.status !== 'OPEN') {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before undoing reps.'
        )
      }

      trainingDay.undoRepLog(command.repLogId)

      await this.trainingDayRepo.removeRepLog(command.repLogId)
      await this.dailyCompletion.reconcileAfterRepUndo(today, command.repLogId)
    })
  }
}
