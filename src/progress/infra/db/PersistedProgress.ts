import type { LocalDayKey } from '@/progress/date'
import type { DayOutcomeSnapshot } from '@/progress/write/exercises/domain/DayOutcome'
import type { ExerciseSnapshot } from '@/progress/write/exercises/domain/Exercise'
import type { PlayerStatsSnapshot } from '@/progress/write/exercises/domain/PlayerStats'
import type { RepLogSnapshot } from '@/progress/write/exercises/domain/RepLog'
import type { TrainingDaySnapshot } from '@/progress/write/exercises/domain/TrainingDay'

export type PersistedExercise = ExerciseSnapshot
export type PersistedRepLog = RepLogSnapshot

export type PersistedDailyCompletion = {
  day: LocalDayKey
  earnedAt: string
  triggerRepLogId: string | null
}

export type PersistedTrainingDay = TrainingDaySnapshot
export type PersistedDayOutcome = DayOutcomeSnapshot
export type PersistedPlayerStats = PlayerStatsSnapshot
