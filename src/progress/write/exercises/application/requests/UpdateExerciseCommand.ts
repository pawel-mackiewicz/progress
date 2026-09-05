import type { LocalDayKey } from '@/progress/date'

export type UpdateExerciseCommand = {
  id: string
  name: string
  dailyGoal: number
  day: LocalDayKey
}
