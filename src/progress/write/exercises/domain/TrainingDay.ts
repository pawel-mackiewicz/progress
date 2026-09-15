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

export type ExerciseProgress = {
  exerciseId: string
  dailyGoal: number
  completedReps: number
  progressionThresholdReps: number
  remainingRepsToProgression: number
  isCompleted: boolean
  isProgressionReady: boolean
}

export type DailyGoalProgression = {
  exerciseId: string
  previousDailyGoal: number
  nextDailyGoal: number
}

export class TrainingDayFinalizedError extends Error {}
export class TrainingDayNotOpenForTodayError extends Error {}
export class TrainingDayNotFinalizedError extends Error {}
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

  public getExerciseProgress(exerciseId: string): ExerciseProgress {
    const exercise = this.exercisePlan.find(
      (item) => item.exerciseId === exerciseId
    )

    if (!exercise) {
      throw new ExerciseNotInTrainingDayError(
        'Exercise does not belong to the training day.'
      )
    }

    let completedReps = 0

    for (const repLog of this.logs) {
      if (repLog.exerciseId === exerciseId) {
        completedReps += repLog.amount
      }
    }

    return this.calculateExerciseProgress(exercise, completedReps)
  }

  public getExercisesProgress(): ExerciseProgress[] {
    const completedRepsByExercise = new Map<string, number>()

    for (const repLog of this.logs) {
      completedRepsByExercise.set(
        repLog.exerciseId,
        (completedRepsByExercise.get(repLog.exerciseId) ?? 0) + repLog.amount
      )
    }

    return this.exercisePlan.map((exercise) =>
      this.calculateExerciseProgress(
        exercise,
        completedRepsByExercise.get(exercise.exerciseId) ?? 0
      )
    )
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

  public recalculateDailyGoals(): DailyGoalProgression[] {
    if (this.status !== 'FINALIZED') {
      throw new TrainingDayNotFinalizedError(
        'Daily goals can only be recalculated after the training day is finalized.'
      )
    }

    const exercisesProgress = this.getExercisesProgress()

    if (
      exercisesProgress.length === 0 ||
      exercisesProgress.some((progress) => !progress.isCompleted)
    ) {
      return []
    }

    return exercisesProgress
      .filter((progress) => progress.isProgressionReady)
      .map((progress) => ({
        exerciseId: progress.exerciseId,
        previousDailyGoal: progress.dailyGoal,
        nextDailyGoal:
          progress.dailyGoal < 20
            ? progress.dailyGoal + 1
            : Math.round((progress.dailyGoal * 105) / 100)
      }))
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

  private calculateExerciseProgress(
    exercise: TrainingExerciseSnapshot,
    completedReps: number
  ): ExerciseProgress {
    const progressionThresholdReps =
      exercise.dailyGoal < 20
        ? exercise.dailyGoal + 2
        : Math.ceil((exercise.dailyGoal * 11) / 10)

    return {
      exerciseId: exercise.exerciseId,
      dailyGoal: exercise.dailyGoal,
      completedReps,
      progressionThresholdReps,
      remainingRepsToProgression: Math.max(
        0,
        progressionThresholdReps - completedReps
      ),
      isCompleted: completedReps >= exercise.dailyGoal,
      isProgressionReady: completedReps >= progressionThresholdReps
    }
  }
}
