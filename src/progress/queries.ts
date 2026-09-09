import type { ProgressDatabase } from '@/db'
import { shiftLocalDay, type LocalDayKey } from '@/progress/date'
import type {
  DashboardExercise,
  DashboardSnapshot,
  Exercise,
  ProgressQueries,
  RepLog
} from '@/progress/types'
import { RepLog as RepLogEntity } from '@/progress/write/exercises/domain/RepLog'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

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
    const [allExercises, repLogs, currentTrainingDay, visibleOutcomes] =
      await Promise.all([
        this.database.exercises.toArray(),
        this.database.repLogs.where('day').belowOrEqual(day).toArray(),
        this.database.trainingDays.get(day),
        this.database.dayOutcomes
          .where('day')
          .between(monthStart, monthEnd, true, true)
          .toArray()
      ])

    const activeExercises = sortExercises(
      allExercises.filter((exercise) => !exercise.archivedAt)
    )
    const todayTotals = sumRepsByExercise(
      repLogs.filter((repLog) => repLog.day === day)
    )
    const isDayComplete = currentTrainingDay
      ? TrainingDay.restore(
          currentTrainingDay,
          repLogs
            .filter((repLog) => repLog.day === day)
            .map(RepLogEntity.restore)
        ).isComplete
      : false
    const completedDays = visibleOutcomes
      .filter((outcome) => outcome.result === 'COMPLETED')
      .map((outcome) => outcome.day)

    if (
      isDayComplete &&
      monthStart <= day &&
      day <= monthEnd &&
      !completedDays.includes(day)
    ) {
      completedDays.push(day)
    }
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
    return {
      day,
      exercises,
      archivedExercises: allExercises
        .filter((exercise) => exercise.archivedAt)
        .sort((first, second) =>
          String(second.archivedAt).localeCompare(String(first.archivedAt))
        ),
      completedDays,
      protectedDays: visibleOutcomes
        .filter((outcome) => outcome.result === 'SHIELDED')
        .map((outcome) => outcome.day),
      isDayComplete
    }
  }
}
