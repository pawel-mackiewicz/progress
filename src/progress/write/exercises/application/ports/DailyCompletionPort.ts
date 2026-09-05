import type { LocalDayKey } from '@/progress/date'

export interface DailyCompletionPort {
  awardIfAllGoalsAreComplete(day: LocalDayKey): Promise<void>
}

export class FakeDailyCompletion implements DailyCompletionPort {
  public readonly checkedDays: LocalDayKey[] = []

  public async awardIfAllGoalsAreComplete(day: LocalDayKey): Promise<void> {
    this.checkedDays.push(day)
  }
}
