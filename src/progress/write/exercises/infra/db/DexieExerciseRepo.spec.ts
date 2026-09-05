import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProgressDatabase } from '@/db'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'

describe('an exercise stored on the athlete’s device', () => {
  const now = new Date('2026-08-24T08:00:00.000Z')
  let database: ProgressDatabase
  let repository: DexieExerciseRepo

  beforeEach(() => {
    database = new ProgressDatabase(`exercise-repo-${crypto.randomUUID()}`)
    repository = new DexieExerciseRepo(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('translates the domain exercise into the existing persisted row', async () => {
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
})
