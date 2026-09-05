import type { LocalDayKey } from '@/progress/date'
import type { RepIncrement } from '@/progress/types'
import type { ExerciseSnapshot } from '@/progress/write/exercises/domain/Exercise'

export type PersistedExercise = ExerciseSnapshot

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
