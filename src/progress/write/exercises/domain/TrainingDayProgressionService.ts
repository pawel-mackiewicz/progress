import type { LocalDayKey } from '@/progress/date'
import {
  ExerciseProgressionMismatchError,
  type Exercise
} from '@/progress/write/exercises/domain/Exercise'
import type {
  DailyGoalProgression,
  TrainingDay
} from '@/progress/write/exercises/domain/TrainingDay'

export type AppliedExerciseProgression = {
  exercise: Exercise
  previousDailyGoal: number
}

export type TrainingDayProgression = {
  finalizedTrainingDay: TrainingDay
  progressedExercises: AppliedExerciseProgression[]
}

export type TrainingDayProgressionConsistency = {
  day: LocalDayKey
  exerciseId: string
  expectedDailyGoal: number
  actualDailyGoal?: number
}

export class TrainingDayProgressionConsistencyError extends Error {
  public constructor(
    message: string,
    public readonly context: TrainingDayProgressionConsistency,
    options?: ErrorOptions
  ) {
    super(message, options)
  }
}

export class TrainingDayProgressionService {
  public apply(
    trainingDay: TrainingDay,
    allExercises: readonly Exercise[],
    progressedAt: Date
  ): TrainingDayProgression {
    const finalizedTrainingDay = trainingDay.finalize()
    const exercisesById = new Map(
      allExercises.map((exercise) => [exercise.id, exercise])
    )

    this.ensureTrainingExercisesAreConsistent(
      finalizedTrainingDay,
      exercisesById
    )

    const progressedExercises = finalizedTrainingDay
      .recalculateDailyGoals()
      .map((progression) =>
        this.applyProgression(
          finalizedTrainingDay,
          exercisesById,
          progression,
          progressedAt
        )
      )

    return { finalizedTrainingDay, progressedExercises }
  }

  private ensureTrainingExercisesAreConsistent(
    trainingDay: TrainingDay,
    exercisesById: ReadonlyMap<string, Exercise>
  ): void {
    for (const trainingExercise of trainingDay.exercises) {
      const exercise = exercisesById.get(trainingExercise.exerciseId)

      if (!exercise) {
        throw new TrainingDayProgressionConsistencyError(
          'A training-day exercise is missing from the canonical exercise collection.',
          {
            day: trainingDay.day,
            exerciseId: trainingExercise.exerciseId,
            expectedDailyGoal: trainingExercise.dailyGoal
          }
        )
      }

      if (exercise.dailyGoal !== trainingExercise.dailyGoal) {
        throw new TrainingDayProgressionConsistencyError(
          'The training-day goal does not match the canonical exercise goal.',
          {
            day: trainingDay.day,
            exerciseId: trainingExercise.exerciseId,
            expectedDailyGoal: trainingExercise.dailyGoal,
            actualDailyGoal: exercise.dailyGoal
          }
        )
      }
    }
  }

  private applyProgression(
    trainingDay: TrainingDay,
    exercisesById: ReadonlyMap<string, Exercise>,
    progression: DailyGoalProgression,
    progressedAt: Date
  ): AppliedExerciseProgression {
    const exercise = exercisesById.get(progression.exerciseId)

    if (!exercise) {
      throw new TrainingDayProgressionConsistencyError(
        'A progressed exercise is missing from the canonical exercise collection.',
        {
          day: trainingDay.day,
          exerciseId: progression.exerciseId,
          expectedDailyGoal: progression.previousDailyGoal
        }
      )
    }

    try {
      return {
        exercise: exercise.levelUp(progression, progressedAt),
        previousDailyGoal: progression.previousDailyGoal
      }
    } catch (error) {
      if (!(error instanceof ExerciseProgressionMismatchError)) {
        throw error
      }

      throw new TrainingDayProgressionConsistencyError(
        'The training-day goal does not match the canonical exercise goal.',
        {
          day: trainingDay.day,
          exerciseId: progression.exerciseId,
          expectedDailyGoal: progression.previousDailyGoal,
          actualDailyGoal: exercise.dailyGoal
        },
        { cause: error }
      )
    }
  }
}
