import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { SetAlternativeActivityPercentageCommand } from '@/progress/write/exercises/application/requests/SetAlternativeActivityPercentageCommand'
import { toLocalDayKey } from '@/progress/date'
import { AlternativeActivityPercentage } from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'
import type { UseCase } from '@/progress/write/shared/UseCase'

export type SetAlternativeActivityPercentageResult = {
  didCompleteDay: boolean
}

export class SetAlternativeActivityPercentageUseCase implements UseCase<
  SetAlternativeActivityPercentageCommand,
  SetAlternativeActivityPercentageResult
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly trainingDayRepo: TrainingDayRepoPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(
    command: SetAlternativeActivityPercentageCommand
  ): Promise<SetAlternativeActivityPercentageResult> {
    return this.unitOfWork.execute(async () => {
      const today = toLocalDayKey(this.clock.now())
      const trainingDay = await this.trainingDayRepo.findLatest()

      if (
        command.day !== today ||
        trainingDay?.day !== today ||
        trainingDay.status !== 'OPEN'
      ) {
        throw new TrainingDayNotOpenForTodayError(
          'Open the dashboard to prepare today’s training day before changing alternative activity credit.'
        )
      }

      const percentage = AlternativeActivityPercentage.from(command.percentage)

      if (trainingDay.alternativeActivityPercentage === percentage.value) {
        return { didCompleteDay: false }
      }

      const updatedTrainingDay =
        trainingDay.setAlternativeActivityPercentage(percentage)

      await this.trainingDayRepo.save(updatedTrainingDay)

      return {
        didCompleteDay: !trainingDay.isComplete && updatedTrainingDay.isComplete
      }
    })
  }
}
