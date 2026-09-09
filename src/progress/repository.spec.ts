import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProgressDatabase } from '@/db'
import type { LocalDayKey } from '@/progress/date'
import { DexieProgressQueries } from '@/progress/queries'
import type { RepIncrement } from '@/progress/types'
import { AddRepUseCase } from '@/progress/write/exercises/application/AddRepUseCase'
import { ArchiveExerciseUseCase } from '@/progress/write/exercises/application/ArchiveExerciseUseCase'
import { PrepareTodayTrainingDayUseCase } from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import { RestoreExerciseUseCase } from '@/progress/write/exercises/application/RestoreExerciseUseCase'
import { UndoRepUseCase } from '@/progress/write/exercises/application/UndoRepUseCase'
import { UpdateExerciseUseCase } from '@/progress/write/exercises/application/UpdateExerciseUseCase'
import { DuplicateExerciseNameError } from '@/progress/write/exercises/domain/Exercise'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import { DexieDailyCompletion } from '@/progress/write/exercises/infra/db/DexieDailyCompletion'
import { DexieDayOutcomeRepo } from '@/progress/write/exercises/infra/db/DexieDayOutcomeRepo'
import { DexieExerciseRepo } from '@/progress/write/exercises/infra/db/DexieExerciseRepo'
import { DexiePlayerStatsRepo } from '@/progress/write/exercises/infra/db/DexiePlayerStatsRepo'
import { DexieTrainingDayRepo } from '@/progress/write/exercises/infra/db/DexieTrainingDayRepo'
import { DexieUnitOfWork } from '@/progress/write/shared/infra/db/DexieUnitOfWork'

class StoryIdGenerator {
  public latestId = ''
  private counter = 0

  public generate() {
    this.latestId = `story-id-${++this.counter}`
    return this.latestId
  }
}

describe('a training day saved on the athlete’s device', () => {
  const today = '2026-08-24' as LocalDayKey
  const monthStart = '2026-08-01' as LocalDayKey
  const monthEnd = '2026-08-31' as LocalDayKey
  const fixedNow = new Date('2026-08-24T08:00:00.000Z')
  let database: ProgressDatabase
  let databaseName: string
  let addRep: AddRepUseCase
  let undoRep: UndoRepUseCase
  let queries: DexieProgressQueries
  let registerExercise: RegisterExerciseUseCase
  let prepareTodayTrainingDay: PrepareTodayTrainingDayUseCase
  let trainingDayRepo: DexieTrainingDayRepo
  let now: Date
  let updateExercise: UpdateExerciseUseCase
  let archiveExercise: ArchiveExerciseUseCase
  let restoreExercise: RestoreExerciseUseCase
  let idGenerator: StoryIdGenerator

  beforeEach(() => {
    databaseName = `progress-story-${crypto.randomUUID()}`
    database = new ProgressDatabase(databaseName)
    now = new Date(fixedNow)
    idGenerator = new StoryIdGenerator()
    const unitOfWork = new DexieUnitOfWork(database)
    const exerciseRepo = new DexieExerciseRepo(database)
    trainingDayRepo = new DexieTrainingDayRepo(database)
    const playerStatsRepo = new DexiePlayerStatsRepo(database)
    const dayOutcomeRepo = new DexieDayOutcomeRepo(database)
    const clock = { now: () => now }
    prepareTodayTrainingDay = new PrepareTodayTrainingDayUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      playerStatsRepo,
      dayOutcomeRepo,
      clock
    )
    registerExercise = new RegisterExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      idGenerator,
      clock
    )
    const dailyCompletion = new DexieDailyCompletion(database, clock)
    addRep = new AddRepUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      dailyCompletion,
      idGenerator,
      clock
    )
    undoRep = new UndoRepUseCase(
      unitOfWork,
      trainingDayRepo,
      dailyCompletion,
      clock
    )
    updateExercise = new UpdateExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      dailyCompletion,
      clock
    )
    archiveExercise = new ArchiveExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      dailyCompletion,
      clock
    )
    restoreExercise = new RestoreExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      clock
    )
    queries = new DexieProgressQueries(database)
  })

  afterEach(async () => {
    await database.delete()
  })

  async function givenAnExercise(name: string, dailyGoal: number) {
    await whenTheyOpenTheDashboard()
    await registerExercise.handle({ name, dailyGoal })
    const exercise = await database.exercises.get(idGenerator.latestId)

    if (!exercise) {
      throw new Error('The exercise was not persisted for the story.')
    }

    return exercise
  }

  async function whenTheyOpenTheDashboard() {
    return prepareTodayTrainingDay.handle()
  }

  async function givenTheyCompletedTodayAndReturnedTomorrow() {
    const exercise = await givenAnExercise('Push-ups', 1)
    await whenTheAthleteAdds(exercise.id, 1)
    now = new Date('2026-08-25T08:00:00.000Z')
  }

  async function whenTheAthleteAdds(exerciseId: string, amount: RepIncrement) {
    return addRep.handle({ exerciseId, amount })
  }

  async function givenTheAthleteAddedOn(
    exerciseId: string,
    amount: RepIncrement,
    day: LocalDayKey
  ) {
    await database.repLogs.add({
      id: idGenerator.generate(),
      exerciseId,
      day,
      amount,
      createdAt: `${day}T08:00:00.000Z`
    })
  }

  async function readDashboard(day = today) {
    return queries.getDashboard(day, monthStart, monthEnd)
  }

  it('closes the previous plan and persists today with every active exercise', async () => {
    await database.exercises.add({
      id: 'existing-squats',
      name: 'Squats',
      dailyGoal: 20,
      createdAt: '2026-08-23T08:00:00.000Z',
      updatedAt: '2026-08-23T08:00:00.000Z',
      archivedAt: null
    })
    await database.trainingDays.add({
      day: '2026-08-23',
      status: 'OPEN',
      exercises: [
        { exerciseId: 'existing-squats', name: 'Squats', dailyGoal: 20 }
      ]
    })

    await whenTheyOpenTheDashboard()
    await registerExercise.handle({ name: 'Push-ups', dailyGoal: 40 })

    expect(await database.trainingDays.toArray()).toEqual([
      {
        day: '2026-08-23',
        status: 'FINALIZED',
        exercises: [
          { exerciseId: 'existing-squats', name: 'Squats', dailyGoal: 20 }
        ]
      },
      {
        day: today,
        status: 'OPEN',
        exercises: [
          { exerciseId: 'existing-squats', name: 'Squats', dailyGoal: 20 },
          {
            exerciseId: idGenerator.latestId,
            name: 'Push-ups',
            dailyGoal: 40
          }
        ]
      }
    ])
    expect(await database.dayOutcomes.toArray()).toEqual([
      { day: '2026-08-23', result: 'FAILED' }
    ])
    expect(await database.playerStats.get('current')).toEqual({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })
  })

  it('rejects registration if the impossible finalized-today state appears', async () => {
    await database.trainingDays.add({
      day: today,
      status: 'FINALIZED',
      exercises: []
    })

    await expect(
      registerExercise.handle({ name: 'Push-ups', dailyGoal: 40 })
    ).rejects.toBeInstanceOf(TrainingDayNotOpenForTodayError)

    expect(await database.exercises.count()).toBe(0)
    expect(await database.trainingDays.get(today)).toEqual({
      day: today,
      status: 'FINALIZED',
      exercises: []
    })
  })

  it('settles the completed day once when two dashboard visits arrive together', async () => {
    await givenTheyCompletedTodayAndReturnedTomorrow()

    const preparations = await Promise.all([
      whenTheyOpenTheDashboard(),
      whenTheyOpenTheDashboard()
    ])

    expect(preparations.map((preparation) => preparation.day)).toEqual([
      '2026-08-25',
      '2026-08-25'
    ])
    expect(
      preparations.map((preparation) => preparation.stats.currentStreak)
    ).toEqual([1, 1])

    expect(await database.trainingDays.toArray()).toMatchObject([
      { day: today, status: 'FINALIZED' },
      { day: '2026-08-25', status: 'OPEN' }
    ])
    expect(await database.dayOutcomes.toArray()).toEqual([
      { day: today, result: 'COMPLETED' }
    ])
    expect(await database.playerStats.get('current')).toEqual({
      currentStreak: 1,
      availableShields: 0,
      completedDaysTowardNextShield: 1
    })
  })

  it('keeps yesterday and its rewards untouched if opening the new day fails', async () => {
    await givenTheyCompletedTodayAndReturnedTomorrow()
    const save = trainingDayRepo.save.bind(trainingDayRepo)
    const storageFailure = new Error('The new day could not be saved')
    const failingSave = vi
      .spyOn(trainingDayRepo, 'save')
      .mockImplementation(async (day) => {
        if (day.day === '2026-08-25') {
          throw storageFailure
        }

        await save(day)
      })

    await expect(whenTheyOpenTheDashboard()).rejects.toBe(storageFailure)

    expect(await database.trainingDays.toArray()).toMatchObject([
      { day: today, status: 'OPEN' }
    ])
    expect(await database.dayOutcomes.count()).toBe(0)
    expect(await database.playerStats.get('current')).toBeUndefined()
    expect(await database.repLogs.count()).toBe(1)

    failingSave.mockRestore()
    await whenTheyOpenTheDashboard()

    expect(await database.dayOutcomes.toArray()).toEqual([
      { day: today, result: 'COMPLETED' }
    ])
    expect(await database.playerStats.get('current')).toMatchObject({
      currentStreak: 1
    })
  })

  it('rolls the new exercise back if adding it to today’s plan fails', async () => {
    await whenTheyOpenTheDashboard()
    const storageFailure = new Error('The updated plan could not be saved')
    vi.spyOn(trainingDayRepo, 'save').mockRejectedValueOnce(storageFailure)

    await expect(
      registerExercise.handle({ name: 'Push-ups', dailyGoal: 40 })
    ).rejects.toBe(storageFailure)

    expect(await database.exercises.count()).toBe(0)
    expect(await database.trainingDays.get(today)).toEqual({
      day: today,
      status: 'OPEN',
      exercises: []
    })
  })

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

    await whenTheAthleteAdds(pushUps.id, 10)

    expect((await readDashboard()).isDayComplete).toBe(false)

    await whenTheAthleteAdds(pullUps.id, 5)
    const completedDay = await readDashboard()

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

    await undoRep.handle({ repLogId: reward.repLogId })
    const correctedDay = await readDashboard()

    expect(correctedDay.exercises[0]?.completedReps).toBe(0)
    expect(correctedDay.isDayComplete).toBe(false)
    expect(correctedDay.completedDays).not.toContain(today)
  })

  it('never removes an earned calendar win when goals later change', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    await whenTheAthleteAdds(pushUps.id, 5)

    await updateExercise.handle({
      id: pushUps.id,
      name: 'Push-ups',
      dailyGoal: 50,
      day: today
    })
    await givenAnExercise('Pull-ups', 20)
    const changedDay = await readDashboard()

    expect(changedDay.exercises.map((exercise) => exercise.isComplete)).toEqual(
      [false, false]
    )
    expect(changedDay.isDayComplete).toBe(true)
    expect(changedDay.completedDays).toContain(today)
  })

  it('awards today when a corrected goal matches the work already done', async () => {
    const pushUps = await givenAnExercise('Push-ups', 10)
    await whenTheAthleteAdds(pushUps.id, 5)

    await updateExercise.handle({
      id: pushUps.id,
      name: 'Push-ups',
      dailyGoal: 5,
      day: today
    })

    expect(await readDashboard()).toMatchObject({
      isDayComplete: true,
      completedDays: [today]
    })
  })

  it('hides an archived quest without throwing away its reps and restores it later', async () => {
    const pullUps = await givenAnExercise('Pull-ups', 10)
    await whenTheAthleteAdds(pullUps.id, 5)

    await archiveExercise.handle({ id: pullUps.id, day: today })
    const archivedDay = await readDashboard()
    expect(archivedDay.exercises).toHaveLength(0)
    expect(archivedDay.archivedExercises[0]?.name).toBe('Pull-ups')

    await restoreExercise.handle({ id: pullUps.id })
    const restoredDay = await readDashboard()
    expect(restoredDay.exercises[0]).toMatchObject({
      name: 'Pull-ups',
      completedReps: 5
    })
  })

  it('awards today when archiving the only unfinished quest clears the plan', async () => {
    const pushUps = await givenAnExercise('Push-ups', 5)
    const pullUps = await givenAnExercise('Pull-ups', 5)
    await whenTheAthleteAdds(pushUps.id, 5)

    await archiveExercise.handle({ id: pullUps.id, day: today })

    expect(await readDashboard()).toMatchObject({
      isDayComplete: true,
      completedDays: [today]
    })
  })

  it('protects the dashboard from confusing duplicate active names', async () => {
    await givenAnExercise('Push-ups', 20)

    await expect(givenAnExercise('  push-UPS  ', 50)).rejects.toBeInstanceOf(
      DuplicateExerciseNameError
    )
  })

  it('shows only finalized shield protection in the requested calendar month', async () => {
    await database.dayOutcomes.bulkAdd([
      { day: '2026-07-31', result: 'SHIELDED' },
      { day: '2026-08-20', result: 'COMPLETED' },
      { day: '2026-08-21', result: 'SHIELDED' },
      { day: '2026-08-22', result: 'FAILED' },
      { day: '2026-09-01', result: 'SHIELDED' }
    ])

    expect((await readDashboard()).protectedDays).toEqual(['2026-08-21'])
  })

  it('shows the best total result from earlier training days', async () => {
    const pushUps = await givenAnExercise('Push-ups', 40)
    const squats = await givenAnExercise('Squats', 50)
    const pullUps = await givenAnExercise('Pull-ups', 30)

    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-20')
    await givenTheAthleteAddedOn(pushUps.id, 5, '2026-08-20')
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-21')
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-21')
    await whenTheAthleteAdds(pushUps.id, 10)
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-25')
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-25')
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-25')
    await givenTheAthleteAddedOn(squats.id, 5, '2026-08-22')

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

    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-22')
    await givenTheAthleteAddedOn(pushUps.id, 10, '2026-08-23')
    await givenTheAthleteAddedOn(pushUps.id, 5, '2026-08-23')
    await whenTheAthleteAdds(pushUps.id, 10)
    await givenTheAthleteAddedOn(squats.id, 5, '2026-08-22')

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
