import type { LocalDayKey } from '@/progress/date'
import type { RepIncrement } from '@/progress/types'

export type PersistedExercise = {
  id: string
  name: string
  dailyGoal: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type PersistedRepLog = {
  id: string
  exerciseId: string
  day: LocalDayKey
  amount: RepIncrement
  createdAt: string
}

export type PersistedDailyCompletion = {
  day: LocalDayKey
  earnedAt: string
  triggerRepLogId: string | null
}
