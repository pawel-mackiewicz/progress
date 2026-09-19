import type { LocalDayKey } from '@/progress/date'
import type { AlternativeActivityPercentageValue } from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
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
  effectiveDailyGoal: number
  completedReps: number
  remainingReps: number
  progressPercent: number
  alternativeActivityProgressPercent: number
  progressionThresholdReps: number
  remainingRepsToProgression: number
  progressionPercent: number
  isComplete: boolean
  isProgressionReady: boolean
  yesterdayReps: number
  previousMaxReps: number
}

export type DashboardSnapshot = {
  day: LocalDayKey
  alternativeActivityPercentage: AlternativeActivityPercentageValue
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
