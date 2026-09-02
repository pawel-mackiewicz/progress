import { progressDatabase, type ProgressDatabase } from '@/progress/database'
import type { LocalDayKey } from '@/progress/date'
import type {
  Exercise,
  ExerciseDraft,
  ProgressCommands,
  RecordRepsResult,
  RepIncrement,
  RepLog
} from '@/progress/types'

export class DuplicateExerciseNameError extends Error {}
export class ExerciseNotFoundError extends Error {}
export class ExerciseArchivedError extends Error {}

function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase()
}

export class DexieProgressCommands implements ProgressCommands {
  constructor(
    private readonly database: ProgressDatabase,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID()
  ) {}

  async createExercise(draft: ExerciseDraft, _day: LocalDayKey) {
    void _day
    const timestamp = this.now().toISOString()
    const exercise: Exercise = {
      id: this.createId(),
      name: draft.name.trim(),
      dailyGoal: draft.dailyGoal,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null
    }

    await this.database.transaction('rw', this.database.exercises, async () => {
      await this.assertUniqueActiveName(exercise.name)
      await this.database.exercises.add(exercise)
    })

    return exercise
  }

  async updateExercise(id: string, draft: ExerciseDraft, day: LocalDayKey) {
    return this.database.transaction(
      'rw',
      [
        this.database.exercises,
        this.database.repLogs,
        this.database.dailyCompletions
      ],
      async () => {
        const exercise = await this.requireExercise(id)
        await this.assertUniqueActiveName(draft.name, id)
        const updatedExercise: Exercise = {
          ...exercise,
          name: draft.name.trim(),
          dailyGoal: draft.dailyGoal,
          updatedAt: this.now().toISOString()
        }

        await this.database.exercises.put(updatedExercise)
        await this.awardDayIfComplete(day, null)

        return updatedExercise
      }
    )
  }

  async archiveExercise(id: string, day: LocalDayKey) {
    await this.database.transaction(
      'rw',
      [
        this.database.exercises,
        this.database.repLogs,
        this.database.dailyCompletions
      ],
      async () => {
        const exercise = await this.requireExercise(id)
        const timestamp = this.now().toISOString()

        await this.database.exercises.put({
          ...exercise,
          archivedAt: timestamp,
          updatedAt: timestamp
        })
        await this.awardDayIfComplete(day, null)
      }
    )
  }

  async restoreExercise(id: string, _day: LocalDayKey) {
    void _day
    await this.database.transaction('rw', this.database.exercises, async () => {
      const exercise = await this.requireExercise(id)
      await this.assertUniqueActiveName(exercise.name, id)
      await this.database.exercises.put({
        ...exercise,
        archivedAt: null,
        updatedAt: this.now().toISOString()
      })
    })
  }

  async recordReps(
    exerciseId: string,
    amount: RepIncrement,
    day: LocalDayKey
  ): Promise<RecordRepsResult> {
    return this.database.transaction(
      'rw',
      [
        this.database.exercises,
        this.database.repLogs,
        this.database.dailyCompletions
      ],
      async () => {
        const exercise = await this.requireExercise(exerciseId)

        if (exercise.archivedAt) {
          throw new ExerciseArchivedError(
            'Cannot log reps for an archived exercise.'
          )
        }

        const repLog: RepLog = {
          id: this.createId(),
          exerciseId,
          day,
          amount,
          createdAt: this.now().toISOString()
        }

        await this.database.repLogs.add(repLog)
        const didEarnDay = await this.awardDayIfComplete(day, repLog.id)

        return {
          repLogId: repLog.id,
          didEarnDay
        }
      }
    )
  }

  async undoRepLog(repLogId: string) {
    await this.database.transaction(
      'rw',
      [
        this.database.exercises,
        this.database.repLogs,
        this.database.dailyCompletions
      ],
      async () => {
        const repLog = await this.database.repLogs.get(repLogId)

        if (!repLog) {
          return
        }

        await this.database.repLogs.delete(repLogId)
        const completion = await this.database.dailyCompletions.get(repLog.day)

        if (completion?.triggerRepLogId !== repLogId) {
          return
        }

        if (await this.areAllGoalsComplete(repLog.day)) {
          await this.database.dailyCompletions.update(repLog.day, {
            triggerRepLogId: null
          })
          return
        }

        await this.database.dailyCompletions.delete(repLog.day)
      }
    )
  }

  private async assertUniqueActiveName(name: string, ignoredId?: string) {
    const normalizedName = normalizeExerciseName(name)
    const exercises = await this.database.exercises.toArray()
    const duplicate = exercises.some(
      (exercise) =>
        !exercise.archivedAt &&
        exercise.id !== ignoredId &&
        normalizeExerciseName(exercise.name) === normalizedName
    )

    if (duplicate) {
      throw new DuplicateExerciseNameError(
        'An active exercise with this name already exists.'
      )
    }
  }

  private async requireExercise(id: string) {
    const exercise = await this.database.exercises.get(id)

    if (!exercise) {
      throw new ExerciseNotFoundError('Exercise not found.')
    }

    return exercise
  }

  private async awardDayIfComplete(
    day: LocalDayKey,
    triggerRepLogId: string | null
  ) {
    if (await this.database.dailyCompletions.get(day)) {
      return false
    }

    if (!(await this.areAllGoalsComplete(day))) {
      return false
    }

    await this.database.dailyCompletions.add({
      day,
      earnedAt: this.now().toISOString(),
      triggerRepLogId
    })

    return true
  }

  private async areAllGoalsComplete(day: LocalDayKey) {
    const [exercises, repLogs] = await Promise.all([
      this.database.exercises.toArray(),
      this.database.repLogs.where('day').equals(day).toArray()
    ])
    const activeExercises = exercises.filter((exercise) => !exercise.archivedAt)

    if (activeExercises.length === 0) {
      return false
    }

    const totals = this.sumRepsByExercise(repLogs)

    return activeExercises.every(
      (exercise) => (totals.get(exercise.id) ?? 0) >= exercise.dailyGoal
    )
  }

  private sumRepsByExercise(repLogs: RepLog[]) {
    const totals = new Map<string, number>()

    for (const repLog of repLogs) {
      totals.set(
        repLog.exerciseId,
        (totals.get(repLog.exerciseId) ?? 0) + repLog.amount
      )
    }

    return totals
  }
}

export const progressCommands = new DexieProgressCommands(progressDatabase)
