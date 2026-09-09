import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'
import { DexieTrainingDayRepo } from '@/progress/write/exercises/infra/db/DexieTrainingDayRepo'

describe('a training day stored on the athlete’s device', () => {
  const now = new Date('2026-08-24T08:00:00.000Z')
  let databaseName: string
  let database: ProgressDatabase
  let repository: DexieTrainingDayRepo

  beforeEach(() => {
    databaseName = `training-day-repo-${crypto.randomUUID()}`
    database = new ProgressDatabase(databaseName)
    repository = new DexieTrainingDayRepo(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  function anExercise(id: string) {
    return Exercise.register({ name: id, dailyGoal: 20 }, id, now)
  }

  async function givenARepLog(day: LocalDayKey) {
    await database.repLogs.add({
      id: 'morning-set',
      exerciseId: 'push-ups',
      day,
      amount: 10,
      createdAt: now.toISOString()
    })
  }

  it('restores the latest plan together with its rep story', async () => {
    const day = '2026-08-24'
    await repository.save(
      TrainingDay.open('2026-08-22', [anExercise('old-plank')])
    )
    await repository.save(TrainingDay.open(day, [anExercise('push-ups')]))
    await givenARepLog(day)

    const restoredDay = await repository.findLatest()

    expect(restoredDay?.toSnapshot()).toEqual({
      day,
      status: 'OPEN',
      exercises: [{ exerciseId: 'push-ups', name: 'push-ups', dailyGoal: 20 }]
    })
    expect(restoredDay?.repLogs.map((repLog) => repLog.toSnapshot())).toEqual([
      {
        id: 'morning-set',
        exerciseId: 'push-ups',
        day,
        amount: 10,
        createdAt: now.toISOString()
      }
    ])
  })

  it('inserts one set into the rep story without replacing the plan or its earlier sets', async () => {
    const day = '2026-08-24'
    const trainingDay = TrainingDay.open(day, [anExercise('push-ups')])
    await repository.save(trainingDay)
    await givenARepLog(day)
    const afternoonSet = RepLog.record(
      'push-ups',
      day,
      5,
      'afternoon-set',
      new Date('2026-08-24T12:00:00.000Z')
    )

    await repository.addRepLog(afternoonSet)

    const restoredDay = await repository.findLatest()
    expect(restoredDay?.repLogs.map((repLog) => repLog.id)).toEqual([
      'morning-set',
      'afternoon-set'
    ])
    expect(await database.trainingDays.get(day)).toEqual(
      trainingDay.toSnapshot()
    )
    expect(await database.repLogs.count()).toBe(2)

    await expect(repository.addRepLog(afternoonSet)).rejects.toBeDefined()
    expect(await database.repLogs.count()).toBe(2)
  })

  it('removes one mistaken set without replacing the plan or its earlier sets', async () => {
    const day = '2026-08-24'
    const trainingDay = TrainingDay.open(day, [anExercise('push-ups')])
    await repository.save(trainingDay)
    await givenARepLog(day)
    await database.repLogs.add({
      id: 'afternoon-set',
      exerciseId: 'push-ups',
      day,
      amount: 5,
      createdAt: new Date('2026-08-24T12:00:00.000Z').toISOString()
    })

    await repository.removeRepLog('afternoon-set')

    const restoredDay = await repository.findLatest()
    expect(restoredDay?.repLogs.map((repLog) => repLog.id)).toEqual([
      'morning-set'
    ])
    expect(await database.trainingDays.get(day)).toEqual(
      trainingDay.toSnapshot()
    )
    expect(await database.repLogs.count()).toBe(1)
  })

  it('replaces the same day when its plan is finalized', async () => {
    const openDay = TrainingDay.open('2026-08-24', [anExercise('push-ups')])
    await repository.save(openDay)

    await repository.save(openDay.finalize())

    expect(await database.trainingDays.count()).toBe(1)
    expect(await database.trainingDays.get('2026-08-24')).toMatchObject({
      status: 'FINALIZED'
    })
  })

  it('adds the new store without losing version-one training history', async () => {
    database.close()
    const legacyDatabase = new Dexie(databaseName)
    legacyDatabase.version(1).stores({
      exercises: 'id, archivedAt, createdAt',
      repLogs: 'id, day, [exerciseId+day], createdAt',
      dailyCompletions: 'day, earnedAt'
    })
    await legacyDatabase.table('exercises').add({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 20,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null
    })
    await legacyDatabase.table('repLogs').add({
      id: 'legacy-set',
      exerciseId: 'push-ups',
      day: '2026-08-23',
      amount: 10,
      createdAt: now.toISOString()
    })
    legacyDatabase.close()

    database = new ProgressDatabase(databaseName)
    await database.open()

    expect(await database.exercises.get('push-ups')).toBeDefined()
    expect(await database.repLogs.get('legacy-set')).toBeDefined()
    expect(await database.trainingDays.count()).toBe(0)
  })
})
