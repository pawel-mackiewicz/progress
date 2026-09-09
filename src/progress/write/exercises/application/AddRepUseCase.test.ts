import { beforeEach, describe, expect, it } from 'vitest'

import { AddRepUseCase } from '@/progress/write/exercises/application/AddRepUseCase'
import { FakeDailyCompletion } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { LocalDayKey } from '@/progress/date'
import type { RepIncrement } from '@/progress/types'
import {
  Exercise,
  ExerciseArchivedError,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  ExerciseNotInTrainingDayError,
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'

class StoryUnitOfWork implements UnitOfWork {
  public executions = 0
  public isExecuting = false

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.executions += 1
    this.isExecuting = true

    try {
      return await action()
    } finally {
      this.isExecuting = false
    }
  }
}

class StoryTrainingDayRepo extends FakeTrainingDayRepo {
  public readonly additionsInsideTransaction: boolean[] = []

  public constructor(private readonly unitOfWork: StoryUnitOfWork) {
    super()
  }

  public override async addRepLog(repLog: RepLog): Promise<void> {
    this.additionsInsideTransaction.push(this.unitOfWork.isExecuting)
    await super.addRepLog(repLog)
  }
}

class StoryDailyCompletion extends FakeDailyCompletion {
  public readonly checksInsideTransaction: boolean[] = []

  public constructor(private readonly unitOfWork: StoryUnitOfWork) {
    super()
  }

  public override async awardIfAllGoalsAreComplete(
    day: LocalDayKey,
    triggerRepLogId: string | null = null
  ): Promise<void> {
    this.checksInsideTransaction.push(this.unitOfWork.isExecuting)
    await super.awardIfAllGoalsAreComplete(day, triggerRepLogId)
  }
}

class StoryIdGenerator implements IdGeneratorPort {
  public generations = 0

  public generate(): string {
    this.generations += 1
    return 'afternoon-set'
  }
}

describe('an athlete recording a set in today’s training', () => {
  const today = '2026-08-25' as const
  const yesterday = '2026-08-24' as const
  const now = new Date('2026-08-25T09:30:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let exerciseRepo: FakeExerciseRepo
  let trainingDayRepo: StoryTrainingDayRepo
  let dailyCompletion: StoryDailyCompletion
  let idGenerator: StoryIdGenerator
  let currentTime: Date
  let useCase: AddRepUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    trainingDayRepo = new StoryTrainingDayRepo(unitOfWork)
    dailyCompletion = new StoryDailyCompletion(unitOfWork)
    idGenerator = new StoryIdGenerator()
    currentTime = now
    useCase = new AddRepUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      dailyCompletion,
      idGenerator,
      { now: () => new Date(currentTime) }
    )
  })

  function givenAnExercise(
    id: string,
    dailyGoal: number,
    archivedAt: Date | null = null
  ) {
    const exercise = Exercise.restore({
      id,
      name: id,
      dailyGoal,
      createdAt: yesterday,
      updatedAt: yesterday,
      archivedAt: archivedAt?.toISOString() ?? null
    })
    exerciseRepo.seed(exercise)
    return exercise
  }

  function aRecordedSet(
    id: string,
    exerciseId: string,
    amount: RepIncrement,
    day: LocalDayKey = today
  ) {
    return RepLog.restore({
      id,
      exerciseId,
      day,
      amount,
      createdAt: now.toISOString()
    })
  }

  function givenATrainingDay(
    day: LocalDayKey,
    exercises: Exercise[],
    repLogs: RepLog[] = [],
    status: 'OPEN' | 'FINALIZED' = 'OPEN'
  ) {
    let trainingDay = TrainingDay.open(day, exercises, repLogs)

    if (status === 'FINALIZED') {
      trainingDay = trainingDay.finalize()
    }

    trainingDayRepo.seed(trainingDay)
  }

  function whenTheyAddFivePushUps() {
    return useCase.handle({ exerciseId: 'push-ups', amount: 5 })
  }

  function thenNothingWasWrittenOrChecked() {
    expect(trainingDayRepo.addedRepLogs).toHaveLength(0)
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(dailyCompletion.checks).toHaveLength(0)
  }

  it('adds earlier sets for that exercise and leaves other exercises out of its progress', async () => {
    const pushUps = givenAnExercise('push-ups', 40)
    const squats = givenAnExercise('squats', 20)
    givenATrainingDay(
      today,
      [pushUps, squats],
      [
        aRecordedSet('morning-push-ups', pushUps.id, 10),
        aRecordedSet('morning-squats', squats.id, 10)
      ]
    )

    const result = await whenTheyAddFivePushUps()

    expect(result).toEqual({
      repLogId: 'afternoon-set',
      dailyGoal: 40,
      completedReps: 15,
      isCompleted: false
    })
    expect(trainingDayRepo.addedRepLogs[0]?.toSnapshot()).toEqual({
      id: 'afternoon-set',
      exerciseId: 'push-ups',
      day: today,
      amount: 5,
      createdAt: now.toISOString()
    })
    expect(
      (await trainingDayRepo.findLatest())?.getExerciseProgress('push-ups')
    ).toEqual({ dailyGoal: 40, completedReps: 15, isCompleted: false })
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(dailyCompletion.checks).toEqual([
      { day: today, triggerRepLogId: 'afternoon-set' }
    ])
    expect(unitOfWork.executions).toBe(1)
    expect(trainingDayRepo.additionsInsideTransaction).toEqual([true])
    expect(dailyCompletion.checksInsideTransaction).toEqual([true])
  })

  it.each([
    { earlierReps: 5 as const, completedReps: 10 },
    { earlierReps: 10 as const, completedReps: 15 }
  ])(
    'marks $completedReps reps complete when the daily goal is 10',
    async ({ earlierReps, completedReps }) => {
      const pushUps = givenAnExercise('push-ups', 10)
      givenATrainingDay(
        today,
        [pushUps],
        [aRecordedSet('morning-set', pushUps.id, earlierReps)]
      )

      await expect(whenTheyAddFivePushUps()).resolves.toMatchObject({
        dailyGoal: 10,
        completedReps,
        isCompleted: true
      })
    }
  )

  it('reports when the exercise disappeared before the set was recorded', async () => {
    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      ExerciseNotFoundError
    )

    thenNothingWasWrittenOrChecked()
  })

  it('keeps archived exercises out of today’s rep story', async () => {
    givenAnExercise('push-ups', 20, new Date('2026-08-24T08:00:00.000Z'))

    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      ExerciseArchivedError
    )

    thenNothingWasWrittenOrChecked()
  })

  it('does not add a set for an exercise outside today’s plan', async () => {
    givenAnExercise('push-ups', 20)
    const squats = givenAnExercise('squats', 20)
    givenATrainingDay(today, [squats])

    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      ExerciseNotInTrainingDayError
    )

    thenNothingWasWrittenOrChecked()
  })

  it('asks the athlete to prepare a training day before recording reps', async () => {
    givenAnExercise('push-ups', 20)

    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasWrittenOrChecked()
  })

  it('rejects a stale training day left open overnight', async () => {
    const pushUps = givenAnExercise('push-ups', 20)
    givenATrainingDay(yesterday, [pushUps])

    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasWrittenOrChecked()
  })

  it('refuses to change today after it has been finalized', async () => {
    const pushUps = givenAnExercise('push-ups', 20)
    givenATrainingDay(today, [pushUps], [], 'FINALIZED')

    await expect(whenTheyAddFivePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasWrittenOrChecked()
  })
})
