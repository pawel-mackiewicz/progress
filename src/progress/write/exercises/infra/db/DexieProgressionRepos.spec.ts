import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProgressDatabase } from '@/db'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'
import { DexieDayOutcomeRepo } from '@/progress/write/exercises/infra/db/DexieDayOutcomeRepo'
import { DexiePlayerStatsRepo } from '@/progress/write/exercises/infra/db/DexiePlayerStatsRepo'

describe('an athlete’s progression stored on their device', () => {
  let databaseName: string
  let database: ProgressDatabase

  beforeEach(() => {
    databaseName = `progression-repos-${crypto.randomUUID()}`
    database = new ProgressDatabase(
      databaseName,
      () => new Date(2026, 7, 24, 8)
    )
  })

  afterEach(async () => {
    await database.delete()
  })

  it('starts with empty stats and restores the athlete’s latest update', async () => {
    const repository = new DexiePlayerStatsRepo(database)

    expect((await repository.get()).toSnapshot()).toEqual({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })

    await repository.save(
      PlayerStats.restore({
        currentStreak: 6,
        availableShields: 1,
        completedDaysTowardNextShield: 2
      })
    )

    expect((await repository.get()).toSnapshot()).toEqual({
      currentStreak: 6,
      availableShields: 1,
      completedDaysTowardNextShield: 2
    })
    expect(await database.playerStats.count()).toBe(1)
  })

  it('restores the latest outcome before an unfinished day', async () => {
    const repository = new DexieDayOutcomeRepo(database)
    await repository.save(new DayOutcome('2026-08-22', 'COMPLETED'))
    await repository.save(new DayOutcome('2026-08-23', 'SHIELDED'))
    await repository.save(new DayOutcome('2026-08-24', 'COMPLETED'))

    const latestFinishedDay = await repository.findLatestBefore('2026-08-24')

    expect(latestFinishedDay?.toSnapshot()).toEqual({
      day: '2026-08-23',
      result: 'SHIELDED'
    })
  })

  it('replays legacy wins and missed days without finalizing today', async () => {
    database.close()
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })
    legacyDatabase.version(2).stores({
      trainingDays: 'day'
    })
    await legacyDatabase.table('dailyCompletions').bulkAdd(
      [
        '2026-08-19',
        '2026-08-20',
        '2026-08-21',
        '2026-08-22',
        '2026-08-24'
      ].map((day) => ({
        day,
        earnedAt: new Date(2026, 7, 24, 8).toISOString(),
        triggerRepLogId: null
      }))
    )
    legacyDatabase.close()

    database = new ProgressDatabase(
      databaseName,
      () => new Date(2026, 7, 24, 8)
    )
    await database.open()

    expect(await database.dayOutcomes.toArray()).toEqual([
      { day: '2026-08-19', result: 'COMPLETED' },
      { day: '2026-08-20', result: 'COMPLETED' },
      { day: '2026-08-21', result: 'COMPLETED' },
      { day: '2026-08-22', result: 'COMPLETED' },
      { day: '2026-08-23', result: 'SHIELDED' }
    ])
    expect(await database.playerStats.get('current')).toEqual({
      currentStreak: 4,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })
  })
})
