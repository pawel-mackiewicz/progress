import type { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import type { DailyCompletionPort } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import type { ClockPort } from '@/progress/write/shared/ClockPort'

export class DexieDailyCompletion implements DailyCompletionPort {
  public constructor(
    private readonly database: ProgressDatabase,
    private readonly clock: ClockPort
  ) {}

  public async awardIfAllGoalsAreComplete(day: LocalDayKey): Promise<void> {
    if (await this.database.dailyCompletions.get(day)) {
      return
    }

    const [exercises, repLogs] = await Promise.all([
      this.database.exercises.toArray(),
      this.database.repLogs.where('day').equals(day).toArray()
    ])
    const activeExercises = exercises.filter(
      (exercise) => exercise.archivedAt === null
    )

    if (activeExercises.length === 0) {
      return
    }

    const completedReps = new Map<string, number>()

    for (const repLog of repLogs) {
      completedReps.set(
        repLog.exerciseId,
        (completedReps.get(repLog.exerciseId) ?? 0) + repLog.amount
      )
    }

    const allGoalsAreComplete = activeExercises.every(
      (exercise) => (completedReps.get(exercise.id) ?? 0) >= exercise.dailyGoal
    )

    if (allGoalsAreComplete) {
      await this.database.dailyCompletions.add({
        day,
        earnedAt: this.clock.now().toISOString(),
        triggerRepLogId: null
      })
    }
  }
}
