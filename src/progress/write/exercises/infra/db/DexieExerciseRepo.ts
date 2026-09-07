import type { ProgressDatabase } from '@/db'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import {
  Exercise,
  normalizeExerciseName
} from '@/progress/write/exercises/domain/Exercise'

export class DexieExerciseRepo implements ExerciseRepoPort {
  public constructor(private readonly database: ProgressDatabase) {}

  public async findById(id: string): Promise<Exercise | undefined> {
    const exercise = await this.database.exercises.get(id)

    return exercise ? Exercise.restore(exercise) : undefined
  }

  public async findAllActive(): Promise<Exercise[]> {
    const exercises = await this.database.exercises.toArray()

    return exercises
      .filter((exercise) => exercise.archivedAt === null)
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      .map(Exercise.restore)
  }

  public async existsActiveByName(
    name: string,
    ignoredId?: string
  ): Promise<boolean> {
    const normalizedName = normalizeExerciseName(name)
    const exercises = await this.database.exercises.toArray()

    return exercises.some(
      (exercise) =>
        exercise.archivedAt === null &&
        exercise.id !== ignoredId &&
        normalizeExerciseName(exercise.name) === normalizedName
    )
  }

  public async save(exercise: Exercise): Promise<void> {
    await this.database.exercises.put(exercise.toSnapshot())
  }
}
