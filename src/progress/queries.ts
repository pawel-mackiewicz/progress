import { shiftLocalDay, type LocalDayKey } from '@/progress/date'
import { progressDatabase, type ProgressDatabase } from '@/progress/database'
import type {
  DashboardExercise,
  DashboardSnapshot,
  Exercise,
  ProgressQueries,
  RepLog
} from '@/progress/types'

function sortExercises(exercises: Exercise[]) {
  return [...exercises].sort((first, second) =>
    first.createdAt.localeCompare(second.createdAt)
  )
}

function calculateStreak(completedDays: Set<LocalDayKey>, today: LocalDayKey) {
  let cursor = completedDays.has(today) ? today : shiftLocalDay(today, -1)
  let streak = 0

  while (completedDays.has(cursor)) {
    streak += 1
    cursor = shiftLocalDay(cursor, -1)
  }

  return streak
}

function sumRepsByExercise(repLogs: RepLog[]) {
  const totals = new Map<string, number>()

  for (const repLog of repLogs) {
    totals.set(
      repLog.exerciseId,
      (totals.get(repLog.exerciseId) ?? 0) + repLog.amount
    )
  }

  return totals
}

function findPreviousMaxReps(repLogs: RepLog[]) {
  const totalsByExerciseAndDay = new Map<string, Map<LocalDayKey, number>>()
  const maximums = new Map<string, number>()

  for (const repLog of repLogs) {
    const dailyTotals =
      totalsByExerciseAndDay.get(repLog.exerciseId) ?? new Map()
    dailyTotals.set(
      repLog.day,
      (dailyTotals.get(repLog.day) ?? 0) + repLog.amount
    )
    totalsByExerciseAndDay.set(repLog.exerciseId, dailyTotals)
  }

  for (const [exerciseId, dailyTotals] of totalsByExerciseAndDay) {
    let maximum = 0

    for (const total of dailyTotals.values()) {
      maximum = Math.max(maximum, total)
    }

    maximums.set(exerciseId, maximum)
  }

  return maximums
}

export class DexieProgressQueries implements ProgressQueries {
  constructor(private readonly database: ProgressDatabase) {}

  async getExercise(id: string) {
    return this.database.exercises.get(id)
  }

  async getDashboard(
    day: LocalDayKey,
    monthStart: LocalDayKey,
    monthEnd: LocalDayKey
  ): Promise<DashboardSnapshot> {
    const [allExercises, repLogs, visibleCompletions, allCompletions] =
      await Promise.all([
        this.database.exercises.toArray(),
        this.database.repLogs.where('day').belowOrEqual(day).toArray(),
        this.database.dailyCompletions
          .where('day')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
        this.database.dailyCompletions.toArray()
      ])

    const activeExercises = sortExercises(
      allExercises.filter((exercise) => !exercise.archivedAt)
    )
    const todayTotals = sumRepsByExercise(
      repLogs.filter((repLog) => repLog.day === day)
    )
    const previousMaximums = findPreviousMaxReps(
      repLogs.filter((repLog) => repLog.day < day)
    )
    const exercises = activeExercises.map<DashboardExercise>((exercise) => {
      const completedReps = todayTotals.get(exercise.id) ?? 0

      return {
        ...exercise,
        completedReps,
        remainingReps: Math.max(exercise.dailyGoal - completedReps, 0),
        progressPercent: Math.min(
          Math.round((completedReps / exercise.dailyGoal) * 100),
          100
        ),
        isComplete: completedReps >= exercise.dailyGoal,
        previousMaxReps: previousMaximums.get(exercise.id) ?? 0
      }
    })
    const completedDaySet = new Set(
      allCompletions.map((completion) => completion.day)
    )

    return {
      day,
      exercises,
      archivedExercises: allExercises
        .filter((exercise) => exercise.archivedAt)
        .sort((first, second) =>
          String(second.archivedAt).localeCompare(String(first.archivedAt))
        ),
      completedDays: visibleCompletions.map((completion) => completion.day),
      isDayComplete: completedDaySet.has(day),
      currentStreak: calculateStreak(completedDaySet, day)
    }
  }
}

export const progressQueries = new DexieProgressQueries(progressDatabase)
