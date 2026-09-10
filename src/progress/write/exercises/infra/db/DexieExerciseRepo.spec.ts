import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProgressDatabase } from '@/db'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'

describe('an exercise stored on the athlete’s device', () => {
  const now = new Date('2026-08-24T08:00:00.000Z')
  let databaseName: string
  let database: ProgressDatabase
  let repository: DexieExerciseRepo

  beforeEach(() => {
    databaseName = `exercise-repo-${crypto.randomUUID()}`
    database = new ProgressDatabase(databaseName)
    repository = new DexieExerciseRepo(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('persists the exercise snapshot as the device row', async () => {
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 40 },
      'exercise-1',
      now
    )

    await repository.save(exercise)

    expect(await database.exercises.get('exercise-1')).toEqual({
      id: 'exercise-1',
      name: 'Push-ups',
      dailyGoal: 40,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    })
    expect(await database.exerciseLevels.count()).toBe(0)
  })

  it('stores earned levels separately and restores them as one aggregate', async () => {
    const progressionTime = new Date('2026-08-25T08:00:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 20 },
      'exercise-1',
      now
    ).levelUp(
      {
        exerciseId: 'exercise-1',
        previousDailyGoal: 20,
        nextDailyGoal: 21
      },
      progressionTime
    )

    await repository.save(exercise)

    expect(await database.exercises.get('exercise-1')).toEqual({
      id: 'exercise-1',
      name: 'Push-ups',
      dailyGoal: 21,
      createdAt: now.toISOString(),
      updatedAt: progressionTime.toISOString(),
      archivedAt: null
    })
    expect(await database.exerciseLevels.toArray()).toEqual([
      {
        exerciseId: 'exercise-1',
        level: 2,
        achievedAt: progressionTime.toISOString(),
        previousDailyGoal: 20,
        nextDailyGoal: 21
      }
    ])

    const restoredExercise = await repository.findById('exercise-1')

    expect(restoredExercise?.level).toBe(2)
    expect(restoredExercise?.levels).toEqual(exercise.levels)
  })

  it('rolls back the exercise row when storing its earned level fails', async () => {
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 20 },
      'exercise-1',
      now
    ).levelUp(
      {
        exerciseId: 'exercise-1',
        previousDailyGoal: 20,
        nextDailyGoal: 21
      },
      new Date('2026-08-25T08:00:00.000Z')
    )
    database.exerciseLevels.hook('creating', () => {
      throw new Error('Level storage failed for the story.')
    })

    await expect(repository.save(exercise)).rejects.toThrow(
      'Level storage failed for the story.'
    )
    expect(await database.exercises.get('exercise-1')).toBeUndefined()
    expect(await database.exerciseLevels.count()).toBe(0)
  })

  it('finds normalized active names without reviving archived conflicts', async () => {
    await database.exercises.bulkAdd([
      {
        id: 'active-push-ups',
        name: 'Push-UPS',
        dailyGoal: 40,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        archivedAt: null
      },
      {
        id: 'archived-squats',
        name: 'Squats',
        dailyGoal: 40,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        archivedAt: now.toISOString()
      }
    ])

    expect(await repository.existsActiveByName('  push-ups  ')).toBe(true)
    expect(await repository.existsActiveByName('squats')).toBe(false)
  })

  it('rehydrates and replaces the same exercise as its plan changes', async () => {
    await database.exercises.add({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 40,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null
    })
    const exercise = await repository.findById('push-ups')

    if (!exercise) {
      throw new Error('The exercise was not available for the story.')
    }

    const updateTime = new Date('2026-08-25T09:30:00.000Z')
    await repository.save(
      exercise.updateDetails(
        { name: 'Slow push-ups', dailyGoal: 20 },
        updateTime
      )
    )

    expect(await database.exercises.count()).toBe(1)
    expect(await database.exercises.get('push-ups')).toMatchObject({
      name: 'Slow push-ups',
      dailyGoal: 20,
      createdAt: now.toISOString(),
      updatedAt: updateTime.toISOString()
    })
  })

  it('loads the complete collection and the active plan in creation order', async () => {
    await database.exercises.bulkAdd([
      {
        id: 'second',
        name: 'Squats',
        dailyGoal: 20,
        createdAt: '2026-08-24T09:00:00.000Z',
        updatedAt: '2026-08-24T09:00:00.000Z',
        archivedAt: null
      },
      {
        id: 'archived',
        name: 'Plank',
        dailyGoal: 20,
        createdAt: '2026-08-24T07:00:00.000Z',
        updatedAt: '2026-08-24T09:00:00.000Z',
        archivedAt: now.toISOString()
      },
      {
        id: 'first',
        name: 'Push-ups',
        dailyGoal: 20,
        createdAt: '2026-08-24T08:00:00.000Z',
        updatedAt: '2026-08-24T08:00:00.000Z',
        archivedAt: null
      }
    ])
    await database.exerciseLevels.bulkAdd([
      {
        exerciseId: 'first',
        level: 2,
        achievedAt: '2026-08-25T08:00:00.000Z',
        previousDailyGoal: 19,
        nextDailyGoal: 20
      },
      {
        exerciseId: 'second',
        level: 2,
        achievedAt: '2026-08-25T09:00:00.000Z',
        previousDailyGoal: 19,
        nextDailyGoal: 20
      },
      {
        exerciseId: 'second',
        level: 3,
        achievedAt: '2026-08-26T09:00:00.000Z',
        previousDailyGoal: 20,
        nextDailyGoal: 21
      }
    ])

    const allExercises = await repository.findAll()
    const activeExercises = await repository.findAllActive()

    expect(
      allExercises.map((exercise) => [exercise.id, exercise.level])
    ).toEqual([
      ['archived', 1],
      ['first', 2],
      ['second', 3]
    ])
    expect(
      activeExercises.map((exercise) => [exercise.id, exercise.level])
    ).toEqual([
      ['first', 2],
      ['second', 3]
    ])
  })

  it('upgrades legacy exercises as level-one aggregates without inventing history', async () => {
    database.close()
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(4).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      trainingDays: 'day',
      dayOutcomes: 'day',
      playerStats: ''
    })
    await legacyDatabase.table('exercises').add({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 40,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null
    })
    legacyDatabase.close()

    database = new ProgressDatabase(databaseName)
    repository = new DexieExerciseRepo(database)
    await database.open()

    const exercise = await repository.findById('push-ups')

    expect(exercise?.level).toBe(1)
    expect(exercise?.levels).toEqual([])
    expect(await database.exerciseLevels.count()).toBe(0)
  })
})
