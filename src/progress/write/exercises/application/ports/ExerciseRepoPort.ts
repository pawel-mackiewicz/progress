import {
  type Exercise,
  normalizeExerciseName
} from '@/progress/write/exercises/domain/Exercise'

export interface ExerciseRepoPort {
  existsActiveByName(name: string): Promise<boolean>
  save(exercise: Exercise): Promise<void>
}

export class FakeExerciseRepo implements ExerciseRepoPort {
  public readonly savedExercises: Exercise[] = []
  public readonly existingExercises: Exercise[] = []
  public readonly nameChecks: string[] = []

  public seed(exercise: Exercise): void {
    this.existingExercises.push(exercise)
  }

  public async existsActiveByName(name: string): Promise<boolean> {
    this.nameChecks.push(name)
    const normalizedName = normalizeExerciseName(name)

    return [...this.existingExercises, ...this.savedExercises].some(
      (exercise) =>
        !exercise.isArchived() &&
        normalizeExerciseName(exercise.name) === normalizedName
    )
  }

  public async save(exercise: Exercise): Promise<void> {
    this.savedExercises.push(exercise)
  }
}
