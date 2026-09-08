import type { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import type { DayOutcomeRepoPort } from '@/progress/write/exercises/application/ports/DayOutcomeRepoPort'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'

export class DexieDayOutcomeRepo implements DayOutcomeRepoPort {
  public constructor(private readonly database: ProgressDatabase) {}

  public async findLatestBefore(
    day: LocalDayKey
  ): Promise<DayOutcome | undefined> {
    const snapshot = await this.database.dayOutcomes
      .where('day')
      .below(day)
      .last()

    return snapshot ? DayOutcome.restore(snapshot) : undefined
  }

  public async save(outcome: DayOutcome): Promise<void> {
    await this.database.dayOutcomes.put(outcome.toSnapshot())
  }
}
