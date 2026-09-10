import type { DayOutcomeSnapshot } from '@/progress/write/exercises/domain/DayOutcome'
import type {
  ExerciseLevelSnapshot,
  ExerciseSnapshot
} from '@/progress/write/exercises/domain/Exercise'
import type { PlayerStatsSnapshot } from '@/progress/write/exercises/domain/PlayerStats'
import type { RepLogSnapshot } from '@/progress/write/exercises/domain/RepLog'
import type { TrainingDaySnapshot } from '@/progress/write/exercises/domain/TrainingDay'

export type PersistedExercise = Omit<ExerciseSnapshot, 'levels'>
export type PersistedExerciseLevel = ExerciseLevelSnapshot & {
  exerciseId: string
}
export type PersistedRepLog = RepLogSnapshot

export type PersistedTrainingDay = TrainingDaySnapshot
export type PersistedDayOutcome = DayOutcomeSnapshot
export type PersistedPlayerStats = PlayerStatsSnapshot
