import type { LocalDayKey } from '@/progress/date'

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

export type DailyCompletion = {
  day: LocalDayKey
  earnedAt: string
  triggerRepLogId: string | null
}

export type ExerciseDraft = Pick<Exercise, 'name' | 'dailyGoal'>

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
  completedDays: LocalDayKey[]
  isDayComplete: boolean
  currentStreak: number
}

export type RecordRepsResult = {
  repLogId: string
  didEarnDay: boolean
}

export interface ProgressQueries {
  getExercise(id: string): Promise<Exercise | undefined>
  getDashboard(
    day: LocalDayKey,
    monthStart: LocalDayKey,
    monthEnd: LocalDayKey
  ): Promise<DashboardSnapshot>
}

export interface ProgressCommands {
  createExercise(draft: ExerciseDraft, day: LocalDayKey): Promise<Exercise>
  updateExercise(
    id: string,
    draft: ExerciseDraft,
    day: LocalDayKey
  ): Promise<Exercise>
  archiveExercise(id: string, day: LocalDayKey): Promise<void>
  restoreExercise(id: string, day: LocalDayKey): Promise<void>
  recordReps(
    exerciseId: string,
    amount: RepIncrement,
    day: LocalDayKey
  ): Promise<RecordRepsResult>
  undoRepLog(repLogId: string): Promise<void>
}
