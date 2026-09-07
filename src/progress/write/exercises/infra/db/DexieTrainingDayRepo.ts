import type { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import type { TrainingDayRepoPort } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

export class DexieTrainingDayRepo implements TrainingDayRepoPort {
  public constructor(private readonly database: ProgressDatabase) {}

  public async findLatestOnOrBefore(
    day: LocalDayKey
  ): Promise<TrainingDay | undefined> {
    const snapshot = await this.database.trainingDays
      .where('day')
      .belowOrEqual(day)
      .last()

    if (!snapshot) {
      return undefined
    }

    const repLogs = await this.database.repLogs
      .where('day')
      .equals(snapshot.day)
      .sortBy('createdAt')

    return TrainingDay.restore(snapshot, repLogs.map(RepLog.restore))
  }

  public async save(trainingDay: TrainingDay): Promise<void> {
    await this.database.trainingDays.put(trainingDay.toSnapshot())
  }
}
