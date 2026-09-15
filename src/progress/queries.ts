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
    const todayRepLogs = repLogs
      .filter((repLog) => repLog.day === day)
      .map(RepLogEntity.restore)
    const trainingDay = TrainingDay.restore(
      currentTrainingDay ?? {
        day,
        status: 'OPEN',
        exercises: activeExercises.map((exercise) => ({
          exerciseId: exercise.id,
          name: exercise.name,
          dailyGoal: exercise.dailyGoal
        }))
      },
      todayRepLogs
    )
    const exercisesProgress = trainingDay.getExercisesProgress()
    const progressByExerciseId = new Map(
      exercisesProgress.map((progress) => [progress.exerciseId, progress])
    )
    const isDayComplete = trainingDay.isComplete
    const dayOutcomes = [...visibleOutcomes]

    if (isDayComplete && monthStart <= day && day <= monthEnd) {
      const existingOutcome = dayOutcomes.findIndex(
        (outcome) => outcome.day === day
      )
      const completedOutcome = { day, result: 'COMPLETED' as const }

      if (existingOutcome === -1) {
        dayOutcomes.push(completedOutcome)
      } else {
        dayOutcomes[existingOutcome] = completedOutcome
      }
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
        const progress = progressByExerciseId.get(exercise.id)

        if (!progress) {
          throw new Error('Active exercise is missing from the training day.')
        }

        const extraReps = Math.max(
          progress.completedReps - progress.dailyGoal,
          0
        )
        const extraRepsThreshold =
          progress.progressionThresholdReps - progress.dailyGoal

        return {
          ...exercise,
          dailyGoal: progress.dailyGoal,
          completedReps: progress.completedReps,
          remainingReps: Math.max(
            progress.dailyGoal - progress.completedReps,
            0
          ),
          progressPercent: Math.min(
            Math.round((progress.completedReps / progress.dailyGoal) * 100),
            100
          ),
          progressionThresholdReps: progress.progressionThresholdReps,
          remainingRepsToProgression: progress.remainingRepsToProgression,
          progressionPercent: Math.min(
            Math.round((extraReps / extraRepsThreshold) * 100),
            100
          ),
          isComplete: progress.isCompleted,
          isProgressionReady: progress.isProgressionReady,
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
      dayOutcomes,
      isDayComplete
    }
  }
}
