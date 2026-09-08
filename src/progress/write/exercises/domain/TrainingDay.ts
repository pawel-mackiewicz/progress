import type { LocalDayKey } from '@/progress/date'
import type { RepIncrement } from '@/progress/types'
import type { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'

export type TrainingDayStatus = 'OPEN' | 'FINALIZED'

export type TrainingExerciseSnapshot = {
  exerciseId: string
  name: string
  dailyGoal: number
}

export type TrainingDaySnapshot = {
  day: LocalDayKey
  status: TrainingDayStatus
  exercises: TrainingExerciseSnapshot[]
}

export class TrainingDayFinalizedError extends Error {}
export class TrainingDayNotOpenForTodayError extends Error {}
export class ExerciseNotInTrainingDayError extends Error {}
export class RepLogNotInOpenDayError extends Error {}

function snapshotExercise(exercise: Exercise): TrainingExerciseSnapshot {
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    dailyGoal: exercise.dailyGoal
  }
}

export class TrainingDay {
  private readonly exercisePlan: TrainingExerciseSnapshot[]
  private readonly logs: RepLog[]

  private constructor(
    public readonly day: LocalDayKey,
    public readonly status: TrainingDayStatus,
    exercisePlan: TrainingExerciseSnapshot[],
    logs: RepLog[]
  ) {
    this.exercisePlan = exercisePlan.map((exercise) => ({ ...exercise }))
    this.logs = [...logs]
  }

  public static open(
    day: LocalDayKey,
    exercises: Exercise[],
    repLogs: RepLog[] = []
  ): TrainingDay {
    return new TrainingDay(
      day,
      'OPEN',
      exercises.map(snapshotExercise),
      repLogs
    )
  }

  public static restore(
    snapshot: TrainingDaySnapshot,
    repLogs: RepLog[]
  ): TrainingDay {
    return new TrainingDay(
      snapshot.day,
      snapshot.status,
      snapshot.exercises,
      repLogs
    )
  }

  public get exercises(): TrainingExerciseSnapshot[] {
    return this.exercisePlan.map((exercise) => ({ ...exercise }))
  }

  public get repLogs(): RepLog[] {
    return [...this.logs]
  }

  public get isComplete(): boolean {
    if (this.exercisePlan.length === 0) {
      return false
    }

    const totals = new Map<string, number>()

    for (const repLog of this.logs) {
      totals.set(
        repLog.exerciseId,
        (totals.get(repLog.exerciseId) ?? 0) + repLog.amount
      )
    }

    return this.exercisePlan.every(
      (exercise) => (totals.get(exercise.exerciseId) ?? 0) >= exercise.dailyGoal
    )
  }

  public get hasExercises(): boolean {
    return this.exercisePlan.length > 0
  }

  public addExercise(exercise: Exercise): TrainingDay {
    this.ensureOpen()

    return new TrainingDay(
      this.day,
      this.status,
      [
        ...this.exercisePlan.filter((item) => item.exerciseId !== exercise.id),
        snapshotExercise(exercise)
      ],
      this.logs
    )
  }

  public updateExercise(exercise: Exercise): TrainingDay {
    this.ensureOpen()

    if (!this.exercisePlan.some((item) => item.exerciseId === exercise.id)) {
      throw new ExerciseNotInTrainingDayError(
        'Exercise does not belong to the open training day.'
      )
    }

    return new TrainingDay(
      this.day,
      this.status,
      this.exercisePlan.map((item) =>
        item.exerciseId === exercise.id ? snapshotExercise(exercise) : item
      ),
      this.logs
    )
  }

  public removeExercise(exerciseId: string): TrainingDay {
    this.ensureOpen()

    return new TrainingDay(
      this.day,
      this.status,
      this.exercisePlan.filter(
        (exercise) => exercise.exerciseId !== exerciseId
      ),
      this.logs
    )
  }

  public recordReps(
    exerciseId: string,
    amount: RepIncrement,
    id: string,
    now: Date
  ): { trainingDay: TrainingDay; repLog: RepLog } {
    this.ensureOpen()

    if (!this.exercisePlan.some((item) => item.exerciseId === exerciseId)) {
      throw new ExerciseNotInTrainingDayError(
        'Cannot record reps for an exercise outside the open training day.'
      )
    }

    const repLog = RepLog.record(exerciseId, this.day, amount, id, now)

    return {
      trainingDay: new TrainingDay(this.day, this.status, this.exercisePlan, [
        ...this.logs,
        repLog
      ]),
      repLog
    }
  }

  public undoRepLog(repLogId: string): TrainingDay {
    this.ensureOpen()

    if (!this.logs.some((repLog) => repLog.id === repLogId)) {
      throw new RepLogNotInOpenDayError(
        'The rep log does not belong to the open training day.'
      )
    }

    return new TrainingDay(
      this.day,
      this.status,
      this.exercisePlan,
      this.logs.filter((repLog) => repLog.id !== repLogId)
    )
  }

  public finalize(): TrainingDay {
    this.ensureOpen()

    return new TrainingDay(this.day, 'FINALIZED', this.exercisePlan, this.logs)
  }

  public toSnapshot(): TrainingDaySnapshot {
    return {
      day: this.day,
      status: this.status,
      exercises: this.exercises
    }
  }

  private ensureOpen(): void {
    if (this.status === 'FINALIZED') {
      throw new TrainingDayFinalizedError(
        'A finalized training day cannot be changed.'
      )
    }
  }
}
