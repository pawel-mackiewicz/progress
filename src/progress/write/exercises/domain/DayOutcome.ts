import type { LocalDayKey } from '@/progress/date'

export type DayResult = 'COMPLETED' | 'SHIELDED' | 'FAILED'

export type DayOutcomeSnapshot = {
  day: LocalDayKey
  result: DayResult
}

export class DayOutcome {
  public constructor(
    public readonly day: LocalDayKey,
    public readonly result: DayResult
  ) {
    Object.freeze(this)
  }

  public toSnapshot(): DayOutcomeSnapshot {
    return { day: this.day, result: this.result }
  }
}
