import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { LocalDayKey } from '@/progress/date'
import {
  DexieProgressRepository,
  DuplicateExerciseNameError,
  ProgressDatabase
} from '@/progress/repository'

describe('a training day saved on the athlete’s device', () => {
  const today = '2026-08-24' as LocalDayKey
  const monthStart = '2026-08-01' as LocalDayKey
  const monthEnd = '2026-08-31' as LocalDayKey
  const fixedNow = new Date('2026-08-24T08:00:00.000Z')
  let database: ProgressDatabase
  let databaseName: string
  let repository: DexieProgressRepository
  let idCounter: number

  beforeEach(() => {
    databaseName = `progress-story-${crypto.randomUUID()}`
    database = new ProgressDatabase(databaseName)
    idCounter = 0
    repository = new DexieProgressRepository(
      database,
      () => fixedNow,
      () => `story-id-${++idCounter}`
    )
  })

  afterEach(async () => {
    await database.delete()
  })

  async function givenAnExercise(name: string, dailyGoal: number) {
    return repository.createExercise({ name, dailyGoal }, today)
  }

  async function whenTheAthleteAdds(exerciseId: string, amount: 1 | 5 | 10) {
    return repository.recordReps(exerciseId, amount, today)
  }

  async function readToday() {
    return repository.getHomeSnapshot(today, monthStart, monthEnd)
  }

  it('keeps every completed set after the app is reopened', async () => {
    const pushUps = await givenAnExercise('Push-ups', 40)
    await whenTheAthleteAdds(pushUps.id, 5)
    await whenTheAthleteAdds(pushUps.id, 10)
    database.close()

    database = new ProgressDatabase(databaseName)
    repository = new DexieProgressRepository(database)
    const reopenedDay = await readToday()

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
    const completedDay = await readToday()

    expect(firstClear.didEarnDay).toBe(false)
    expect(perfectDay.didEarnDay).toBe(true)
    expect(completedDay.isDayComplete).toBe(true)
    expect(completedDay.completedDays).toContain(today)
  })

  it('takes back an accidental reward when its triggering set is undone', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    const reward = await whenTheAthleteAdds(pushUps.id, 5)

    await repository.undoRepLog(reward.repLogId)
    const correctedDay = await readToday()

    expect(correctedDay.exercises[0]?.completedReps).toBe(0)
    expect(correctedDay.isDayComplete).toBe(false)
    expect(correctedDay.completedDays).not.toContain(today)
  })

  it('never removes an earned calendar win when goals later change', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    await whenTheAthleteAdds(pushUps.id, 5)

    await repository.updateExercise(
      pushUps.id,
      { name: 'Push-ups', dailyGoal: 50 },
      today
    )
    await givenAnExercise('Pull-ups', 20)
    const changedDay = await readToday()

    expect(changedDay.exercises.map((exercise) => exercise.isComplete)).toEqual(
      [false, false]
    )
    expect(changedDay.isDayComplete).toBe(true)
    expect(changedDay.completedDays).toContain(today)
  })

  it('hides an archived quest without throwing away its reps and restores it later', async () => {
    const pullUps = await givenAnExercise('Pull-ups', 10)
    await whenTheAthleteAdds(pullUps.id, 5)

    await repository.archiveExercise(pullUps.id, today)
    const archivedDay = await readToday()
    expect(archivedDay.exercises).toHaveLength(0)
    expect(archivedDay.archivedExercises[0]?.name).toBe('Pull-ups')

    await repository.restoreExercise(pullUps.id, today)
    const restoredDay = await readToday()
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

    expect((await readToday()).currentStreak).toBe(2)

    await database.dailyCompletions.add({
      day: today,
      earnedAt: fixedNow.toISOString(),
      triggerRepLogId: null
    })

    expect((await readToday()).currentStreak).toBe(3)
  })
})
