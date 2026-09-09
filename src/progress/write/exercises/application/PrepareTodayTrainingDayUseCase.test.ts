import { beforeEach, describe, expect, it } from 'vitest'

import type { LocalDayKey } from '@/progress/date'
import { PrepareTodayTrainingDayUseCase } from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'
import { FakeDayOutcomeRepo } from '@/progress/write/exercises/application/ports/DayOutcomeRepoPort'
import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { FakePlayerStatsRepo } from '@/progress/write/exercises/application/ports/PlayerStatsRepoPort'
import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { DayOutcome } from '@/progress/write/exercises/domain/DayOutcome'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'

class StoryUnitOfWork implements UnitOfWork {
  public executions = 0

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.executions += 1
    return action()
  }
}

describe('an athlete preparing today by opening the dashboard', () => {
  const today = '2026-08-24' as const
  const now = new Date('2026-08-24T08:00:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let exerciseRepo: FakeExerciseRepo
  let trainingDayRepo: FakeTrainingDayRepo
  let playerStatsRepo: FakePlayerStatsRepo
  let dayOutcomeRepo: FakeDayOutcomeRepo
  let useCase: PrepareTodayTrainingDayUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    trainingDayRepo = new FakeTrainingDayRepo()
    playerStatsRepo = new FakePlayerStatsRepo()
    dayOutcomeRepo = new FakeDayOutcomeRepo()
    useCase = new PrepareTodayTrainingDayUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      playerStatsRepo,
      dayOutcomeRepo,
      { now: () => now }
    )
  })

  function givenAnExerciseWithThisName(
    name: string,
    archivedAt: Date | null = null,
    id = 'existing-exercise'
  ) {
    const exercise = Exercise.restore({
      id,
      name,
      dailyGoal: 20,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: archivedAt?.toISOString() ?? null
    })
    exerciseRepo.seed(exercise)
    return exercise
  }

  function givenATrainingDay(
    day: LocalDayKey,
    exercises: Exercise[],
    status: 'OPEN' | 'FINALIZED' = 'OPEN',
    repLogs: RepLog[] = []
  ) {
    let trainingDay = TrainingDay.open(day, exercises, repLogs)

    if (status === 'FINALIZED') {
      trainingDay = trainingDay.finalize()
    }

    trainingDayRepo.seed(trainingDay)
  }

  function givenACompletedTrainingDay(day: LocalDayKey, exercise: Exercise) {
    const firstSet = RepLog.restore({
      id: `${day}-first-set`,
      exerciseId: exercise.id,
      day,
      amount: 10,
      createdAt: now.toISOString()
    })
    const finishingSet = RepLog.restore({
      id: `${day}-finishing-set`,
      exerciseId: exercise.id,
      day,
      amount: 10,
      createdAt: now.toISOString()
    })

    givenATrainingDay(day, [exercise], 'OPEN', [firstSet, finishingSet])
  }

  async function whenTheyOpenTheDashboard() {
    return useCase.handle()
  }

  it('opens an empty plan on the first visit before any exercise is registered', async () => {
    const preparation = await whenTheyOpenTheDashboard()

    expect(preparation.day).toBe(today)
    expect(preparation.stats.toSnapshot()).toEqual({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })

    expect(unitOfWork.executions).toBe(1)
    expect(
      trainingDayRepo.savedTrainingDays.map((day) => day.toSnapshot())
    ).toEqual([{ day: today, status: 'OPEN', exercises: [] }])
    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(dayOutcomeRepo.savedOutcomes).toHaveLength(0)
    expect(playerStatsRepo.savedStats).toHaveLength(0)
  })

  it('keeps today’s plan and completed sets when the dashboard refreshes again', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    givenACompletedTrainingDay(today, squats)
    const originalDay = await trainingDayRepo.findLatest()

    const firstPreparation = await whenTheyOpenTheDashboard()
    const refreshedPreparation = await whenTheyOpenTheDashboard()

    expect(firstPreparation.stats).toBe(refreshedPreparation.stats)
    expect(refreshedPreparation.day).toBe(today)
    expect(refreshedPreparation.stats.currentStreak).toBe(0)
    expect(await trainingDayRepo.findLatest()).toBe(originalDay)
    expect(originalDay?.isComplete).toBe(true)
    expect(originalDay?.repLogs).toHaveLength(2)
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(dayOutcomeRepo.savedOutcomes).toHaveLength(0)
    expect(playerStatsRepo.savedStats).toHaveLength(0)
  })

  it('settles yesterday only once when the athlete opens the dashboard repeatedly', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    givenACompletedTrainingDay('2026-08-23', squats)

    await whenTheyOpenTheDashboard()
    const refreshedPreparation = await whenTheyOpenTheDashboard()

    expect(trainingDayRepo.savedTrainingDays).toHaveLength(2)
    expect(
      dayOutcomeRepo.savedOutcomes.map((outcome) => outcome.toSnapshot())
    ).toEqual([{ day: '2026-08-23', result: 'COMPLETED' }])
    expect(playerStatsRepo.savedStats).toHaveLength(1)
    expect(playerStatsRepo.savedStats[0]?.currentStreak).toBe(1)
    expect(refreshedPreparation.stats.currentStreak).toBe(1)
  })

  it('reports an already finalized today without reopening or changing it', async () => {
    givenATrainingDay(today, [], 'FINALIZED')

    await expect(whenTheyOpenTheDashboard()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(dayOutcomeRepo.savedOutcomes).toHaveLength(0)
    expect(playerStatsRepo.savedStats).toHaveLength(0)
  })

  it('closes yesterday and opens today with every active exercise', async () => {
    const squats = givenAnExerciseWithThisName(
      'Squats',
      null,
      'existing-squats'
    )
    givenAnExerciseWithThisName('Archived plank', now, 'archived-plank')
    givenATrainingDay('2026-08-23', [squats])

    await whenTheyOpenTheDashboard()

    expect(
      trainingDayRepo.savedTrainingDays.map((trainingDay) =>
        trainingDay.toSnapshot()
      )
    ).toEqual([
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
          { exerciseId: 'existing-squats', name: 'Squats', dailyGoal: 20 }
        ]
      }
    ])
  })

  it('completes yesterday and advances the athlete’s progression', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    givenACompletedTrainingDay('2026-08-23', squats)
    playerStatsRepo.seed(
      PlayerStats.restore({
        currentStreak: 3,
        availableShields: 0,
        completedDaysTowardNextShield: 3
      })
    )

    const preparation = await whenTheyOpenTheDashboard()

    expect(
      dayOutcomeRepo.savedOutcomes.map((outcome) => outcome.toSnapshot())
    ).toEqual([{ day: '2026-08-23', result: 'COMPLETED' }])
    expect(playerStatsRepo.savedStats[0]?.toSnapshot()).toEqual({
      currentStreak: 4,
      availableShields: 1,
      completedDaysTowardNextShield: 0
    })
    expect(preparation.stats).toBe(playerStatsRepo.savedStats[0])
  })

  it('spends earned protection before a longer absence breaks the streak', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    givenACompletedTrainingDay('2026-08-20', squats)
    playerStatsRepo.seed(
      PlayerStats.restore({
        currentStreak: 3,
        availableShields: 0,
        completedDaysTowardNextShield: 3
      })
    )

    await whenTheyOpenTheDashboard()

    expect(
      dayOutcomeRepo.savedOutcomes.map((outcome) => outcome.toSnapshot())
    ).toEqual([
      { day: '2026-08-20', result: 'COMPLETED' },
      { day: '2026-08-21', result: 'SHIELDED' },
      { day: '2026-08-22', result: 'FAILED' },
      { day: '2026-08-23', result: 'FAILED' }
    ])
    expect(playerStatsRepo.savedStats[0]?.toSnapshot()).toEqual({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0
    })
  })

  it('leaves an already closed previous day untouched', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    givenATrainingDay('2026-08-23', [squats], 'FINALIZED')
    dayOutcomeRepo.seed(new DayOutcome('2026-08-23', 'FAILED'))

    await whenTheyOpenTheDashboard()

    expect(trainingDayRepo.savedTrainingDays).toHaveLength(1)
    expect(trainingDayRepo.savedTrainingDays[0]?.day).toBe(today)
    expect(dayOutcomeRepo.savedOutcomes).toHaveLength(0)
    expect(playerStatsRepo.savedStats).toHaveLength(0)
  })
})
