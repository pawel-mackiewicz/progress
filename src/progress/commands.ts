import type { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import type {
  ProgressCommands,
  RecordRepsResult,
  RepIncrement,
  RepLog
} from '@/progress/types'
import {
  ExerciseArchivedError,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'

export { ExerciseArchivedError } from '@/progress/write/exercises/domain/Exercise'

export class DexieProgressCommands implements ProgressCommands {
  constructor(
    private readonly database: ProgressDatabase,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID()
  ) {}

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
