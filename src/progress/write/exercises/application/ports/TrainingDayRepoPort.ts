import type { LocalDayKey } from '@/progress/date'
import type { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

export interface TrainingDayRepoPort {
  findLatest(): Promise<TrainingDay | undefined>
  save(trainingDay: TrainingDay): Promise<void>
}

export class FakeTrainingDayRepo implements TrainingDayRepoPort {
  public readonly savedTrainingDays: TrainingDay[] = []
  public findLatestCalls = 0
  private readonly existingTrainingDays: TrainingDay[] = []

  public seed(trainingDay: TrainingDay): void {
    this.existingTrainingDays.push(trainingDay)
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

    return [...daysByKey.values()].sort((first, second) =>
      second.day.localeCompare(first.day)
    )[0]
  }

  public async save(trainingDay: TrainingDay): Promise<void> {
    this.savedTrainingDays.push(trainingDay)
  }
}
