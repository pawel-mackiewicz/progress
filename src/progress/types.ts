import type { LocalDayKey } from '@/progress/date'
import type { DayOutcomeSnapshot } from '@/progress/write/exercises/domain/DayOutcome'

export const REP_INCREMENTS = [1, 5, 10] as const

export type RepIncrement = (typeof REP_INCREMENTS)[number]

export type Exercise = {
  id: string
  name: string
  dailyGoal: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type RepLog = {
  id: string
  exerciseId: string
  day: LocalDayKey
  amount: RepIncrement
  createdAt: string
}

export type DashboardExercise = Exercise & {
  completedReps: number
  remainingReps: number
  progressPercent: number
  isComplete: boolean
  yesterdayReps: number
  previousMaxReps: number
}

export type DashboardSnapshot = {
  day: LocalDayKey
  exercises: DashboardExercise[]
  archivedExercises: Exercise[]
  dayOutcomes: DayOutcomeSnapshot[]
  isDayComplete: boolean
}

export interface ProgressQueries {
  getExercise(id: string): Promise<Exercise | undefined>
  getDashboard(
    day: LocalDayKey,
    monthStart: LocalDayKey,
    monthEnd: LocalDayKey
  ): Promise<DashboardSnapshot>
}
