import Dexie, { type EntityTable } from 'dexie'

import { shiftLocalDay, type LocalDayKey } from '@/progress/date'
import type {
  DailyCompletion,
  Exercise,
  ExerciseDraft,
  ExerciseProgress,
  HomeSnapshot,
  ProgressRepository,
  RecordRepsResult,
  RepIncrement,
  RepLog
} from '@/progress/types'

export class DuplicateExerciseNameError extends Error {}
export class ExerciseNotFoundError extends Error {}
export class ExerciseArchivedError extends Error {}

export class ProgressDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  repLogs!: EntityTable<RepLog, 'id'>
  dailyCompletions!: EntityTable<DailyCompletion, 'day'>

  constructor(name = 'progress') {
    super(name)

    this.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })
  }
}

function normalizeExerciseName(name: string) {
  return name.trim().toLocaleLowerCase()
}

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

export class DexieProgressRepository implements ProgressRepository {
  constructor(
    private readonly database: ProgressDatabase,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID()
  ) {}

  async getExercise(id: string) {
    return this.database.exercises.get(id)
  }

  async getHomeSnapshot(
    day: LocalDayKey,
    monthStart: LocalDayKey,
    monthEnd: LocalDayKey
  ): Promise<HomeSnapshot> {
    const [allExercises, repLogs, visibleCompletions, allCompletions] =
      await Promise.all([
        this.database.exercises.toArray(),
        this.database.repLogs.where('day').equals(day).toArray(),
        this.database.dailyCompletions
          .where('day')
          .between(monthStart, monthEnd, true, true)
          .toArray(),
        this.database.dailyCompletions.toArray()
      ])

    const activeExercises = sortExercises(
      allExercises.filter((exercise) => !exercise.archivedAt)
    )
    const totals = this.sumRepsByExercise(repLogs)
    const exercises = activeExercises.map<ExerciseProgress>((exercise) => {
      const completedReps = totals.get(exercise.id) ?? 0

      return {
        ...exercise,
        completedReps,
        remainingReps: Math.max(exercise.dailyGoal - completedReps, 0),
        progressPercent: Math.min(
          Math.round((completedReps / exercise.dailyGoal) * 100),
          100
        ),
        isComplete: completedReps >= exercise.dailyGoal
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

export const progressDatabase = new ProgressDatabase()
export const progressRepository = new DexieProgressRepository(progressDatabase)

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) {
    return false
  }

  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
