import type { LocalDayKey } from '@/progress/date'
import type { RepIncrement } from '@/progress/types'

export type RepLogSnapshot = {
  id: string
  exerciseId: string
  day: LocalDayKey
  amount: RepIncrement
  createdAt: string
}

export class RepLog {
  private constructor(
    public readonly id: string,
    public readonly exerciseId: string,
    public readonly day: LocalDayKey,
    public readonly amount: RepIncrement,
    private readonly _createdAt: Date
  ) {}

  public static record(
    exerciseId: string,
    day: LocalDayKey,
    amount: RepIncrement,
    id: string,
    now: Date
  ): RepLog {
    return new RepLog(id, exerciseId, day, amount, new Date(now.getTime()))
  }

  public static restore(snapshot: RepLogSnapshot): RepLog {
    return new RepLog(
      snapshot.id,
      snapshot.exerciseId,
      snapshot.day,
      snapshot.amount,
      new Date(snapshot.createdAt)
    )
  }

  public get createdAt(): Date {
    return new Date(this._createdAt)
  }

  public toSnapshot(): RepLogSnapshot {
    return {
      id: this.id,
      exerciseId: this.exerciseId,
      day: this.day,
      amount: this.amount,
      createdAt: this._createdAt.toISOString()
    }
  }
}
