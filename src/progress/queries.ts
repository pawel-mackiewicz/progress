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

function moveCompletedExercisesToBottom(exercises: DashboardExercise[]) {
  return [...exercises].sort(
    (first, second) => Number(first.isComplete) - Number(second.isComplete)
  )
}

const COMPLETED_DAYS_PER_SHIELD = 4
const MAX_SHIELDS = 2

function calculateStreakProtection(
  completedDays: Set<LocalDayKey>,
  today: LocalDayKey
) {
  // Rebuild the streak by replaying the athlete's history in date order.
  const firstCompletedDay = [...completedDays]
    .filter((day) => day <= today)
    .sort()[0]
  let currentStreak = 0
  let availableShields = 0
  let completedDaysTowardShield = 0
  const protectedDays: LocalDayKey[] = []

  if (!firstCompletedDay) {
    return { currentStreak, availableShields, protectedDays }
  }

  // An unfinished today is still in progress, so it does not count as missed yet.
  const lastFinishedDay = completedDays.has(today)
    ? today
    : shiftLocalDay(today, -1)

  for (
    let day = firstCompletedDay;
    day <= lastFinishedDay;
    day = shiftLocalDay(day, 1)
  ) {
    if (completedDays.has(day)) {
      currentStreak += 1
      completedDaysTowardShield += 1

      // Every four uninterrupted wins earns one shield, up to the inventory cap.
      if (completedDaysTowardShield === COMPLETED_DAYS_PER_SHIELD) {
        availableShields = Math.min(availableShields + 1, MAX_SHIELDS)
        completedDaysTowardShield = 0
      }

      continue
    }

    // A missed day restarts progress toward earning the next shield.
    completedDaysTowardShield = 0

    if (currentStreak === 0) {
      continue
    }

    // Spend a shield before allowing the missed day to break the streak.
    if (availableShields > 0) {
      availableShields -= 1
      protectedDays.push(day)
    } else {
      currentStreak = 0
    }
  }

  return { currentStreak, availableShields, protectedDays }
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
    const yesterday = shiftLocalDay(day, -1)
    const yesterdayTotals = sumRepsByExercise(
      repLogs.filter((repLog) => repLog.day === yesterday)
    )
    const previousMaximums = findPreviousMaxReps(
      repLogs.filter((repLog) => repLog.day < day)
    )
    const exercises = moveCompletedExercisesToBottom(
      activeExercises.map<DashboardExercise>((exercise) => {
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
          yesterdayReps: yesterdayTotals.get(exercise.id) ?? 0,
          previousMaxReps: previousMaximums.get(exercise.id) ?? 0
        }
      })
    )
    const completedDaySet = new Set(
      allCompletions.map((completion) => completion.day)
    )
    const streakProtection = calculateStreakProtection(completedDaySet, day)

    return {
      day,
      exercises,
      archivedExercises: allExercises
        .filter((exercise) => exercise.archivedAt)
        .sort((first, second) =>
          String(second.archivedAt).localeCompare(String(first.archivedAt))
        ),
      completedDays: visibleCompletions.map((completion) => completion.day),
      protectedDays: streakProtection.protectedDays.filter(
        (protectedDay) => protectedDay >= monthStart && protectedDay <= monthEnd
      ),
      isDayComplete: completedDaySet.has(day),
      currentStreak: streakProtection.currentStreak,
      availableShields: streakProtection.availableShields
    }
  }
}

export const progressQueries = new DexieProgressQueries(progressDatabase)
