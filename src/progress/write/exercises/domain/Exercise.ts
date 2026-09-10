import type { DailyGoalProgression } from '@/progress/write/exercises/domain/TrainingDay'

export type RegisterExerciseInput = {
  name: string
  dailyGoal: number
}

export type UpdateExerciseInput = RegisterExerciseInput

export type ExerciseLevelSnapshot = {
  level: number
  achievedAt: string
  previousDailyGoal: number
  nextDailyGoal: number
}

export type ExerciseLevel = Omit<ExerciseLevelSnapshot, 'achievedAt'> & {
  achievedAt: Date
}

export type ExerciseSnapshot = {
  id: string
  name: string
  dailyGoal: number
  levels: ExerciseLevelSnapshot[]
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}
export class DuplicateExerciseNameError extends Error {}
export class ExerciseNotFoundError extends Error {}
export class ExerciseArchivedError extends Error {}
export class ExerciseProgressionMismatchError extends Error {}

export function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase()
}

export class Exercise {
  private readonly _createdAt: Date
  private readonly _updatedAt: Date
  private readonly _archivedAt: Date | null
  private readonly _levels: ExerciseLevel[]

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dailyGoal: number,
    levels: ExerciseLevel[],
    createdAt: Date,
    updatedAt: Date,
    archivedAt: Date | null
  ) {
    this._levels = levels
      .map((level) => ({
        ...level,
        achievedAt: new Date(level.achievedAt.getTime())
      }))
      .sort((first, second) => first.level - second.level)
    this._createdAt = new Date(createdAt.getTime())
    this._updatedAt = new Date(updatedAt.getTime())
    this._archivedAt = archivedAt ? new Date(archivedAt.getTime()) : null
  }

  public static register(
    input: RegisterExerciseInput,
    id: string,
    now: Date
  ): Exercise {
    return new Exercise(
      id,
      input.name.trim(),
      input.dailyGoal,
      [],
      now,
      now,
      null
    )
  }

  public static restore(snapshot: ExerciseSnapshot): Exercise {
    return new Exercise(
      snapshot.id,
      snapshot.name,
      snapshot.dailyGoal,
      snapshot.levels.map((level) => ({
        ...level,
        achievedAt: new Date(level.achievedAt)
      })),
      new Date(snapshot.createdAt),
      new Date(snapshot.updatedAt),
      snapshot.archivedAt ? new Date(snapshot.archivedAt) : null
    )
  }

  public toSnapshot(): ExerciseSnapshot {
    return {
      id: this.id,
      name: this.name,
      dailyGoal: this.dailyGoal,
      levels: this._levels.map((level) => ({
        ...level,
        achievedAt: level.achievedAt.toISOString()
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      archivedAt: this.archivedAt?.toISOString() ?? null
    }
  }

  public updateDetails(input: UpdateExerciseInput, now: Date): Exercise {
    return new Exercise(
      this.id,
      input.name.trim(),
      input.dailyGoal,
      this._levels,
      this._createdAt,
      now,
      this._archivedAt
    )
  }

  public archive(now: Date): Exercise {
    return new Exercise(
      this.id,
      this.name,
      this.dailyGoal,
      this._levels,
      this._createdAt,
      now,
      now
    )
  }

  public reactivate(now: Date): Exercise {
    return new Exercise(
      this.id,
      this.name,
      this.dailyGoal,
      this._levels,
      this._createdAt,
      now,
      null
    )
  }

  public levelUp(
    progression: DailyGoalProgression,
    progressedAt: Date
  ): Exercise {
    if (
      progression.exerciseId !== this.id ||
      progression.previousDailyGoal !== this.dailyGoal ||
      progression.nextDailyGoal <= progression.previousDailyGoal
    ) {
      throw new ExerciseProgressionMismatchError(
        'The daily-goal progression does not match the current exercise.'
      )
    }

    return new Exercise(
      this.id,
      this.name,
      progression.nextDailyGoal,
      [
        ...this._levels,
        {
          level: this.level + 1,
          achievedAt: progressedAt,
          previousDailyGoal: progression.previousDailyGoal,
          nextDailyGoal: progression.nextDailyGoal
        }
      ],
      this._createdAt,
      progressedAt,
      this._archivedAt
    )
  }

  public get level(): number {
    return this._levels.at(-1)?.level ?? 1
  }

  public get levels(): ExerciseLevel[] {
    return this._levels.map((level) => ({
      ...level,
      achievedAt: new Date(level.achievedAt.getTime())
    }))
  }

  public get createdAt(): Date {
    return new Date(this._createdAt)
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt)
  }

  public get archivedAt(): Date | null {
    return this._archivedAt ? new Date(this._archivedAt) : null
  }

  public isArchived(): boolean {
    return this._archivedAt !== null
  }
}
