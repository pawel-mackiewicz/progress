import type { LocalDayKey } from '@/progress/date'
import type { RepLog } from '@/progress/write/exercises/domain/RepLog'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

export interface TrainingDayRepoPort {
  findLatest(): Promise<TrainingDay | undefined>
  save(trainingDay: TrainingDay): Promise<void>
  addRepLog(repLog: RepLog): Promise<void>
  removeRepLog(repLogId: string): Promise<void>
}

export class FakeTrainingDayRepo implements TrainingDayRepoPort {
  public readonly savedTrainingDays: TrainingDay[] = []
  public readonly addedRepLogs: RepLog[] = []
  public readonly removedRepLogIds: string[] = []
  public findLatestCalls = 0
  private readonly existingTrainingDays: TrainingDay[] = []
  private readonly existingRepLogs: RepLog[] = []

  public seed(trainingDay: TrainingDay): void {
    this.existingTrainingDays.push(trainingDay)
    this.existingRepLogs.push(...trainingDay.repLogs)
  }

  public async findLatest(): Promise<TrainingDay | undefined> {
    this.findLatestCalls += 1
    const daysByKey = new Map<LocalDayKey, TrainingDay>()

    for (const trainingDay of [
      ...this.existingTrainingDays,
      ...this.savedTrainingDays
    ]) {
      daysByKey.set(trainingDay.day, trainingDay)
    }

    const latest = [...daysByKey.values()].sort((first, second) =>
      second.day.localeCompare(first.day)
    )[0]

    if (!latest) {
      return undefined
    }

    const repLogs = [...this.existingRepLogs, ...this.addedRepLogs].filter(
      (repLog) =>
        repLog.day === latest.day && !this.removedRepLogIds.includes(repLog.id)
    )
    const latestAlreadyHasEveryRepLog =
      latest.repLogs.length === repLogs.length &&
      latest.repLogs.every((repLog, index) => repLog.id === repLogs[index]?.id)

    return latestAlreadyHasEveryRepLog
      ? latest
      : TrainingDay.restore(latest.toSnapshot(), repLogs)
  }

  public async save(trainingDay: TrainingDay): Promise<void> {
    this.savedTrainingDays.push(trainingDay)
  }

  public async addRepLog(repLog: RepLog): Promise<void> {
    if (
      [...this.existingRepLogs, ...this.addedRepLogs].some(
        (existingRepLog) => existingRepLog.id === repLog.id
      )
    ) {
      throw new Error(`Rep log ${repLog.id} already exists.`)
    }

    this.addedRepLogs.push(repLog)
  }

  public async removeRepLog(repLogId: string): Promise<void> {
    this.removedRepLogIds.push(repLogId)
  }
}
