import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  DexieProgressCommands,
  DuplicateExerciseNameError
} from '@/progress/commands'
import { ProgressDatabase } from '@/progress/database'
import type { LocalDayKey } from '@/progress/date'
import { DexieProgressQueries } from '@/progress/queries'

describe('a training day saved on the athlete’s device', () => {
  const today = '2026-08-24' as LocalDayKey
  const monthStart = '2026-08-01' as LocalDayKey
  const monthEnd = '2026-08-31' as LocalDayKey
  const fixedNow = new Date('2026-08-24T08:00:00.000Z')
  let database: ProgressDatabase
  let databaseName: string
  let commands: DexieProgressCommands
  let queries: DexieProgressQueries
  let idCounter: number

  beforeEach(() => {
    databaseName = `progress-story-${crypto.randomUUID()}`
    database = new ProgressDatabase(databaseName)
    idCounter = 0
    commands = new DexieProgressCommands(
      database,
      () => fixedNow,
      () => `story-id-${++idCounter}`
    )
    queries = new DexieProgressQueries(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  async function givenAnExercise(name: string, dailyGoal: number) {
    return commands.createExercise({ name, dailyGoal }, today)
  }

  async function whenTheAthleteAdds(
    exerciseId: string,
    amount: 1 | 5 | 10,
    day = today
  ) {
    return commands.recordReps(exerciseId, amount, day)
  }

  async function readDashboard(day = today) {
    return queries.getDashboard(day, monthStart, monthEnd)
  }

  async function givenCompletedDays(...days: LocalDayKey[]) {
    await database.dailyCompletions.bulkAdd(
      days.map((day) => ({
        day,
        earnedAt: fixedNow.toISOString(),
        triggerRepLogId: null
      }))
    )
  }

  it('keeps every completed set after the app is reopened', async () => {
    const pushUps = await givenAnExercise('Push-ups', 40)
    await whenTheAthleteAdds(pushUps.id, 5)
    await whenTheAthleteAdds(pushUps.id, 10)
    database.close()

    database = new ProgressDatabase(databaseName)
    queries = new DexieProgressQueries(database)
    const reopenedDay = await readDashboard()

    expect(reopenedDay.exercises[0]).toMatchObject({
      name: 'Push-ups',
      completedReps: 15,
      dailyGoal: 40,
      isComplete: false
    })
  })

  it('awards the day only after every active quest is cleared', async () => {
    const pushUps = await givenAnExercise('Push-ups', 10)
    const pullUps = await givenAnExercise('Pull-ups', 5)

    const firstClear = await whenTheAthleteAdds(pushUps.id, 10)
    const perfectDay = await whenTheAthleteAdds(pullUps.id, 5)
    const completedDay = await readDashboard()

    expect(firstClear.didEarnDay).toBe(false)
    expect(perfectDay.didEarnDay).toBe(true)
    expect(completedDay.isDayComplete).toBe(true)
    expect(completedDay.completedDays).toContain(today)
  })

  it('moves cleared quests below every quest that still needs work', async () => {
    const pushUps = await givenAnExercise('Push-ups', 10)
    await givenAnExercise('Squats', 10)
    const pullUps = await givenAnExercise('Pull-ups', 10)

    await whenTheAthleteAdds(pushUps.id, 10)
    await whenTheAthleteAdds(pullUps.id, 10)
    const trainingDay = await readDashboard()

    expect(trainingDay.exercises.map((exercise) => exercise.name)).toEqual([
      'Squats',
      'Push-ups',
      'Pull-ups'
    ])
  })

  it('takes back an accidental reward when its triggering set is undone', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    const reward = await whenTheAthleteAdds(pushUps.id, 5)

    await commands.undoRepLog(reward.repLogId)
    const correctedDay = await readDashboard()

    expect(correctedDay.exercises[0]?.completedReps).toBe(0)
    expect(correctedDay.isDayComplete).toBe(false)
    expect(correctedDay.completedDays).not.toContain(today)
  })

  it('never removes an earned calendar win when goals later change', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    await whenTheAthleteAdds(pushUps.id, 5)

    await commands.updateExercise(
      pushUps.id,
      { name: 'Push-ups', dailyGoal: 50 },
      today
    )
    await givenAnExercise('Pull-ups', 20)
    const changedDay = await readDashboard()

    expect(changedDay.exercises.map((exercise) => exercise.isComplete)).toEqual(
      [false, false]
    )
    expect(changedDay.isDayComplete).toBe(true)
    expect(changedDay.completedDays).toContain(today)
  })

  it('hides an archived quest without throwing away its reps and restores it later', async () => {
    const pullUps = await givenAnExercise('Pull-ups', 10)
    await whenTheAthleteAdds(pullUps.id, 5)

    await commands.archiveExercise(pullUps.id, today)
    const archivedDay = await readDashboard()
    expect(archivedDay.exercises).toHaveLength(0)
    expect(archivedDay.archivedExercises[0]?.name).toBe('Pull-ups')

    await commands.restoreExercise(pullUps.id, today)
    const restoredDay = await readDashboard()
    expect(restoredDay.exercises[0]).toMatchObject({
      name: 'Pull-ups',
      completedReps: 5
    })
  })

  it('protects the dashboard from confusing duplicate active names', async () => {
    await givenAnExercise('Push-ups', 20)

    await expect(givenAnExercise('  push-UPS  ', 50)).rejects.toBeInstanceOf(
      DuplicateExerciseNameError
    )
  })

  it('continues a streak through yesterday until today is cleared', async () => {
    await database.dailyCompletions.bulkAdd([
      {
        day: '2026-08-22',
        earnedAt: fixedNow.toISOString(),
        triggerRepLogId: null
      },
      {
        day: '2026-08-23',
        earnedAt: fixedNow.toISOString(),
        triggerRepLogId: null
      }
    ])

    expect((await readDashboard()).currentStreak).toBe(2)

    await database.dailyCompletions.add({
      day: today,
      earnedAt: fixedNow.toISOString(),
      triggerRepLogId: null
    })

    expect((await readDashboard()).currentStreak).toBe(3)
  })

  it('stocks one shield every four uninterrupted wins, up to two', async () => {
    await givenCompletedDays(
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20'
    )

    expect(await readDashboard('2026-08-20')).toMatchObject({
      currentStreak: 4,
      availableShields: 1
    })

    await givenCompletedDays(
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28'
    )

    expect(await readDashboard('2026-08-28')).toMatchObject({
      currentStreak: 12,
      availableShields: 2
    })
  })

  it('waits until a day has passed before spending its shield', async () => {
    await givenCompletedDays(
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23'
    )

    expect(await readDashboard()).toMatchObject({
      currentStreak: 4,
      availableShields: 1,
      protectedDays: []
    })
  })

  it('keeps the streak alive when a shield covers one missed day', async () => {
    await givenCompletedDays(
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22'
    )

    const streakBeforeTheMiss = await readDashboard('2026-08-22')
    const streakAfterTheMiss = await readDashboard()

    expect(streakBeforeTheMiss).toMatchObject({
      currentStreak: 4,
      availableShields: 1
    })
    expect(streakAfterTheMiss).toMatchObject({
      currentStreak: 4,
      availableShields: 0,
      protectedDays: ['2026-08-23']
    })
  })

  it('spends two shields on two missed days before the streak falls', async () => {
    await givenCompletedDays(
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21'
    )

    expect(await readDashboard()).toMatchObject({
      currentStreak: 8,
      availableShields: 0,
      protectedDays: ['2026-08-22', '2026-08-23']
    })

    expect(await readDashboard('2026-08-25')).toMatchObject({
      currentStreak: 0,
      availableShields: 0
    })
  })

  it('earns the next shield after four new wins following a protected miss', async () => {
    await givenCompletedDays(
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-19',
      '2026-08-20'
    )

    expect(await readDashboard('2026-08-20')).toMatchObject({
      currentStreak: 8,
      availableShields: 0,
      protectedDays: ['2026-08-18']
    })

    await givenCompletedDays('2026-08-21', '2026-08-22')

    expect(await readDashboard('2026-08-22')).toMatchObject({
      currentStreak: 10,
      availableShields: 1,
      protectedDays: ['2026-08-18']
    })
  })

  it('takes back a newly earned shield when the winning set is undone', async () => {
    const pushUps = await givenAnExercise('Push-ups', 1)
    await givenCompletedDays('2026-08-21', '2026-08-22', '2026-08-23')
    const winningSet = await whenTheAthleteAdds(pushUps.id, 1)

    expect(await readDashboard()).toMatchObject({
      currentStreak: 4,
      availableShields: 1
    })

    await commands.undoRepLog(winningSet.repLogId)

    expect(await readDashboard()).toMatchObject({
      currentStreak: 3,
      availableShields: 0
    })
  })

  it('shows the best total result from earlier training days', async () => {
    const pushUps = await givenAnExercise('Push-ups', 40)
    const squats = await givenAnExercise('Squats', 50)
    const pullUps = await givenAnExercise('Pull-ups', 30)

    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-20')
    await whenTheAthleteAdds(pushUps.id, 5, '2026-08-20')
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-21')
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-21')
    await whenTheAthleteAdds(pushUps.id, 10)
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-25')
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-25')
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-25')
    await whenTheAthleteAdds(squats.id, 5, '2026-08-22')

    const dashboard = await readDashboard()

    expect(
      dashboard.exercises.find((exercise) => exercise.id === pushUps.id)
    ).toMatchObject({
      completedReps: 10,
      previousMaxReps: 20
    })
    expect(
      dashboard.exercises.find((exercise) => exercise.id === squats.id)
    ).toMatchObject({
      previousMaxReps: 5
    })
    expect(
      dashboard.exercises.find((exercise) => exercise.id === pullUps.id)
    ).toMatchObject({
      previousMaxReps: 0
    })
  })

  it('remembers exactly what each exercise achieved yesterday', async () => {
    const pushUps = await givenAnExercise('Push-ups', 40)
    const squats = await givenAnExercise('Squats', 50)

    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-22')
    await whenTheAthleteAdds(pushUps.id, 10, '2026-08-23')
    await whenTheAthleteAdds(pushUps.id, 5, '2026-08-23')
    await whenTheAthleteAdds(pushUps.id, 10)
    await whenTheAthleteAdds(squats.id, 5, '2026-08-22')

    const dashboard = await readDashboard()

    expect(
      dashboard.exercises.find((exercise) => exercise.id === pushUps.id)
    ).toMatchObject({
      yesterdayReps: 15
    })
    expect(
      dashboard.exercises.find((exercise) => exercise.id === squats.id)
    ).toMatchObject({
      yesterdayReps: 0
    })
  })
})
