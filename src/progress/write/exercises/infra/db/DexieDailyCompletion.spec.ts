import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProgressDatabase } from '@/db'
import { DexieDailyCompletion } from '@/progress/write/exercises/infra/db/DexieDailyCompletion'

describe('a completed training day stored on the athlete’s device', () => {
  const day = '2026-08-24' as const
  const earnedAt = new Date('2026-08-24T12:00:00.000Z')
  let database: ProgressDatabase
  let currentTime: Date
  let completion: DexieDailyCompletion

  beforeEach(async () => {
    database = new ProgressDatabase(`daily-completion-${crypto.randomUUID()}`)
    currentTime = earnedAt
    completion = new DexieDailyCompletion(database, {
      now: () => new Date(currentTime)
    })
    await database.exercises.add({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 10,
      createdAt: earnedAt.toISOString(),
      updatedAt: earnedAt.toISOString(),
      archivedAt: null
    })
    await database.repLogs.add({
      id: 'winning-set',
      exerciseId: 'push-ups',
      day,
      amount: 10,
      createdAt: earnedAt.toISOString()
    })
  })

  afterEach(async () => {
    await database.delete()
  })

  it('remembers the completing set and never replaces an already-earned day', async () => {
    await completion.awardIfAllGoalsAreComplete(day, 'winning-set')
    currentTime = new Date('2026-08-24T13:00:00.000Z')

    await completion.awardIfAllGoalsAreComplete(day, 'later-set')

    expect(await database.dailyCompletions.toArray()).toEqual([
      {
        day,
        earnedAt: earnedAt.toISOString(),
        triggerRepLogId: 'winning-set'
      }
    ])
  })

  it('stores no rep trigger when another kind of change completes the day', async () => {
    await completion.awardIfAllGoalsAreComplete(day)

    expect(await database.dailyCompletions.get(day)).toEqual({
      day,
      earnedAt: earnedAt.toISOString(),
      triggerRepLogId: null
    })
  })
})
