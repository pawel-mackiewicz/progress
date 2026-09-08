import type { LocalDayKey } from '@/progress/date'
import type { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'

export interface DayOutcomeRepoPort {
  findLatestBefore(day: LocalDayKey): Promise<DayOutcome | undefined>
  save(outcome: DayOutcome): Promise<void>
}

export class FakeDayOutcomeRepo implements DayOutcomeRepoPort {
  public readonly savedOutcomes: DayOutcome[] = []
  private readonly existingOutcomes: DayOutcome[] = []

  public seed(outcome: DayOutcome): void {
    this.existingOutcomes.push(outcome)
  }

  public async findLatestBefore(
    day: LocalDayKey
  ): Promise<DayOutcome | undefined> {
    const outcomesByDay = new Map<LocalDayKey, DayOutcome>()

    for (const outcome of [...this.existingOutcomes, ...this.savedOutcomes]) {
      outcomesByDay.set(outcome.day, outcome)
    }

    return [...outcomesByDay.values()]
      .filter((outcome) => outcome.day < day)
      .sort((first, second) => second.day.localeCompare(first.day))[0]
  }

  public async save(outcome: DayOutcome): Promise<void> {
    this.savedOutcomes.push(outcome)
  }
}
