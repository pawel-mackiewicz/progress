export type RegisterExerciseInput = {
  name: string
  dailyGoal: number
}

export type RestoreExerciseInput = {
  id: string
  name: string
  dailyGoal: number
  createdAt: Date
  updatedAt: Date
  archivedAt: Date | null
}

export class DuplicateExerciseNameError extends Error {}

export function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase()
}

export class Exercise {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dailyGoal: number,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
    private readonly _archivedAt: Date | null
  ) {}

  public static register(
    input: RegisterExerciseInput,
    id: string,
    now: Date
  ): Exercise {
    return new Exercise(id, input.name.trim(), input.dailyGoal, now, now, null)
  }

  public static restore(input: RestoreExerciseInput): Exercise {
    return new Exercise(
      input.id,
      input.name,
      input.dailyGoal,
      input.createdAt,
      input.updatedAt,
      input.archivedAt
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
