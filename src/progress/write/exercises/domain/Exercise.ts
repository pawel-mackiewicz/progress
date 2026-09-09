export type RegisterExerciseInput = {
  name: string
  dailyGoal: number
}

export type UpdateExerciseInput = RegisterExerciseInput

export type ExerciseSnapshot = {
  id: string
  name: string
  dailyGoal: number
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}
export class DuplicateExerciseNameError extends Error {}
export class ExerciseNotFoundError extends Error {}
export class ExerciseArchivedError extends Error {}

export function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase()
}

export class Exercise {
  private readonly _createdAt: Date
  private readonly _updatedAt: Date
  private readonly _archivedAt: Date | null

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dailyGoal: number,
    createdAt: Date,
    updatedAt: Date,
    archivedAt: Date | null
  ) {
    this._createdAt = new Date(createdAt.getTime())
    this._updatedAt = new Date(updatedAt.getTime())
    this._archivedAt = archivedAt ? new Date(archivedAt.getTime()) : null
  }

  public static register(
    input: RegisterExerciseInput,
    id: string,
    now: Date
  ): Exercise {
    return new Exercise(id, input.name.trim(), input.dailyGoal, now, now, null)
  }

  public static restore(snapshot: ExerciseSnapshot): Exercise {
    return new Exercise(
      snapshot.id,
      snapshot.name,
      snapshot.dailyGoal,
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
      this._createdAt,
      now,
      null
    )
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
