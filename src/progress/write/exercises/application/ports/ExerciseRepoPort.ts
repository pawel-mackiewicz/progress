import {
  type Exercise,
  normalizeExerciseName
} from '@/progress/write/exercises/domain/Exercise'

export interface ExerciseRepoPort {
  findById(id: string): Promise<Exercise | undefined>
  findAllActive(): Promise<Exercise[]>
  existsActiveByName(name: string, ignoredId?: string): Promise<boolean>
  save(exercise: Exercise): Promise<void>
}

export class FakeExerciseRepo implements ExerciseRepoPort {
  public readonly savedExercises: Exercise[] = []
  public readonly existingExercises: Exercise[] = []
  public readonly nameChecks: string[] = []

  public seed(exercise: Exercise): void {
    this.existingExercises.push(exercise)
  }

  public async findById(id: string): Promise<Exercise | undefined> {
    return [...this.existingExercises, ...this.savedExercises]
      .toReversed()
      .find((exercise) => exercise.id === id)
  }

  public async findAllActive(): Promise<Exercise[]> {
    const exercisesById = new Map<string, Exercise>()

    for (const exercise of [
      ...this.existingExercises,
      ...this.savedExercises
    ]) {
      exercisesById.set(exercise.id, exercise)
    }

    return [...exercisesById.values()]
      .filter((exercise) => !exercise.isArchived())
      .sort(
        (first, second) =>
          first.createdAt.getTime() - second.createdAt.getTime()
      )
  }

  public async existsActiveByName(
    name: string,
    ignoredId?: string
  ): Promise<boolean> {
    this.nameChecks.push(name)
    const normalizedName = normalizeExerciseName(name)

    return [...this.existingExercises, ...this.savedExercises].some(
      (exercise) =>
        !exercise.isArchived() &&
        exercise.id !== ignoredId &&
        normalizeExerciseName(exercise.name) === normalizedName
    )
  }

  public async save(exercise: Exercise): Promise<void> {
    this.savedExercises.push(exercise)
  }
}
