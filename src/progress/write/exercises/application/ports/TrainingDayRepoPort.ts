import type { LocalDayKey } from '@/progress/date'
import type { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

export interface TrainingDayRepoPort {
  findLatestOnOrBefore(day: LocalDayKey): Promise<TrainingDay | undefined>
  save(trainingDay: TrainingDay): Promise<void>
}

export class FakeTrainingDayRepo implements TrainingDayRepoPort {
  public readonly savedTrainingDays: TrainingDay[] = []
  public readonly lookupDays: LocalDayKey[] = []
  private readonly existingTrainingDays: TrainingDay[] = []

  public seed(trainingDay: TrainingDay): void {
    this.existingTrainingDays.push(trainingDay)
  }

  public async findLatestOnOrBefore(
    day: LocalDayKey
  ): Promise<TrainingDay | undefined> {
    this.lookupDays.push(day)
    const daysByKey = new Map<LocalDayKey, TrainingDay>()

    for (const trainingDay of [
      ...this.existingTrainingDays,
      ...this.savedTrainingDays
    ]) {
      daysByKey.set(trainingDay.day, trainingDay)
    }

    return [...daysByKey.values()]
      .filter((trainingDay) => trainingDay.day <= day)
      .sort((first, second) => second.day.localeCompare(first.day))[0]
  }

  public async save(trainingDay: TrainingDay): Promise<void> {
    this.savedTrainingDays.push(trainingDay)
  }
}
