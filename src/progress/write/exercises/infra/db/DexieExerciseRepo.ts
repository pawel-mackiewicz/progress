import type { ProgressDatabase } from '@/db'
import type {
  PersistedExercise,
  PersistedExerciseLevel
} from '@/progress/infra/db/PersistedProgress'
import type { ExerciseRepoPort } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import {
  Exercise,
  type ExerciseLevelSnapshot,
  normalizeExerciseName
} from '@/progress/write/exercises/domain/Exercise'

export class DexieExerciseRepo implements ExerciseRepoPort {
  public constructor(private readonly database: ProgressDatabase) {}

  public async findById(id: string): Promise<Exercise | undefined> {
    const [exercise, levels] = await Promise.all([
      this.database.exercises.get(id),
      this.database.exerciseLevels.where('exerciseId').equals(id).toArray()
    ])

    return exercise ? this.restoreExercise(exercise, levels) : undefined
  }

  public async findAll(): Promise<Exercise[]> {
    const [exercises, levels] = await Promise.all([
      this.database.exercises.toArray(),
      this.database.exerciseLevels.toArray()
    ])
    const levelsByExerciseId = new Map<string, PersistedExerciseLevel[]>()

    for (const level of levels) {
      const exerciseLevels = levelsByExerciseId.get(level.exerciseId) ?? []
      exerciseLevels.push(level)
      levelsByExerciseId.set(level.exerciseId, exerciseLevels)
    }

    return exercises
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt))
      .map((exercise) =>
        this.restoreExercise(
          exercise,
          levelsByExerciseId.get(exercise.id) ?? []
        )
      )
  }

  public async findAllActive(): Promise<Exercise[]> {
    return (await this.findAll()).filter((exercise) => !exercise.isArchived())
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
    const { levels, ...persistedExercise } = exercise.toSnapshot()
    const persistedLevels = levels.map<PersistedExerciseLevel>((level) => ({
      ...level,
      exerciseId: exercise.id
    }))

    await this.database.transaction(
      'rw',
      [this.database.exercises, this.database.exerciseLevels],
      async () => {
        await this.database.exercises.put(persistedExercise)
        await this.database.exerciseLevels
          .where('exerciseId')
          .equals(exercise.id)
          .delete()

        if (persistedLevels.length > 0) {
          await this.database.exerciseLevels.bulkAdd(persistedLevels)
        }
      }
    )
  }

  private restoreExercise(
    exercise: PersistedExercise,
    levels: PersistedExerciseLevel[]
  ): Exercise {
    return Exercise.restore({
      ...exercise,
      levels: levels.map<ExerciseLevelSnapshot>((level) => ({
        level: level.level,
        achievedAt: level.achievedAt,
        previousDailyGoal: level.previousDailyGoal,
        nextDailyGoal: level.nextDailyGoal
      }))
    })
  }
}
