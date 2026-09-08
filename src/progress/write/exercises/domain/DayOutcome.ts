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

  public static restore(snapshot: DayOutcomeSnapshot): DayOutcome {
    return new DayOutcome(snapshot.day, snapshot.result)
  }

  public toSnapshot(): DayOutcomeSnapshot {
    return { day: this.day, result: this.result }
  }
}
