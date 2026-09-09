import type { LocalDayKey } from '@/progress/date'

export interface DailyCompletionPort {
  awardIfAllGoalsAreComplete(
    day: LocalDayKey,
    triggerRepLogId?: string | null
  ): Promise<void>
}

export class FakeDailyCompletion implements DailyCompletionPort {
  public readonly checkedDays: LocalDayKey[] = []
  public readonly checks: {
    day: LocalDayKey
    triggerRepLogId: string | null
  }[] = []

  public async awardIfAllGoalsAreComplete(
    day: LocalDayKey,
    triggerRepLogId: string | null = null
  ): Promise<void> {
    this.checkedDays.push(day)
    this.checks.push({ day, triggerRepLogId })
  }
}
