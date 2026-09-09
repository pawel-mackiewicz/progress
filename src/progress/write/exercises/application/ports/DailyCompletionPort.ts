import type { LocalDayKey } from '@/progress/date'

export interface DailyCompletionPort {
  awardIfAllGoalsAreComplete(
    day: LocalDayKey,
    triggerRepLogId?: string | null
  ): Promise<void>
  reconcileAfterRepUndo(day: LocalDayKey, repLogId: string): Promise<void>
}

export class FakeDailyCompletion implements DailyCompletionPort {
  public readonly checkedDays: LocalDayKey[] = []
  public readonly checks: {
    day: LocalDayKey
    triggerRepLogId: string | null
  }[] = []
  public readonly repUndos: { day: LocalDayKey; repLogId: string }[] = []

  public async awardIfAllGoalsAreComplete(
    day: LocalDayKey,
    triggerRepLogId: string | null = null
  ): Promise<void> {
    this.checkedDays.push(day)
    this.checks.push({ day, triggerRepLogId })
  }

  public async reconcileAfterRepUndo(
    day: LocalDayKey,
    repLogId: string
  ): Promise<void> {
    this.repUndos.push({ day, repLogId })
  }
}
