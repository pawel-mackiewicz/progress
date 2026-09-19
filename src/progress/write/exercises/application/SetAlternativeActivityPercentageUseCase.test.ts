import { beforeEach, describe, expect, it } from 'vitest'

import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { SetAlternativeActivityPercentageUseCase } from '@/progress/write/exercises/application/SetAlternativeActivityPercentageUseCase'
import type { LocalDayKey } from '@/progress/date'
import {
  AlternativeActivityPercentage,
  InvalidAlternativeActivityPercentageError,
  type AlternativeActivityPercentageValue
} from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
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
  public readonly savesInsideTransaction: boolean[] = []

  public constructor(private readonly unitOfWork: StoryUnitOfWork) {
    super()
  }

  public override async save(trainingDay: TrainingDay): Promise<void> {
    this.savesInsideTransaction.push(this.unitOfWork.isExecuting)
    await super.save(trainingDay)
  }
}

describe('an athlete crediting today with another activity', () => {
  const today = '2026-08-25' as const
  const yesterday = '2026-08-24' as const
  const now = new Date('2026-08-25T09:30:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let trainingDayRepo: StoryTrainingDayRepo
  let useCase: SetAlternativeActivityPercentageUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    trainingDayRepo = new StoryTrainingDayRepo(unitOfWork)
    useCase = new SetAlternativeActivityPercentageUseCase(
      unitOfWork,
      trainingDayRepo,
      { now: () => now }
    )
  })

  function aPushUpPlan() {
    return Exercise.register(
      { name: 'Push-ups', dailyGoal: 10 },
      'push-ups',
      now
    )
  }

  function fivePushUps(day: LocalDayKey) {
    return RepLog.restore({
      id: `${day}-morning-set`,
      exerciseId: 'push-ups',
      day,
      amount: 5,
      createdAt: now.toISOString()
    })
  }

  function givenATrainingDay(
    day: LocalDayKey,
    options: {
      percentage?: AlternativeActivityPercentageValue
      status?: 'OPEN' | 'FINALIZED'
      withFivePushUps?: boolean
    } = {}
  ) {
    let trainingDay = TrainingDay.open(
      day,
      [aPushUpPlan()],
      options.withFivePushUps ? [fivePushUps(day)] : []
    )

    if (options.percentage !== undefined) {
      trainingDay = trainingDay.setAlternativeActivityPercentage(
        AlternativeActivityPercentage.from(options.percentage)
      )
    }

    if (options.status === 'FINALIZED') {
      trainingDay = trainingDay.finalize()
    }

    trainingDayRepo.seed(trainingDay)
  }

  function whenTheyCredit(percentage: AlternativeActivityPercentageValue) {
    return useCase.handle({ day: today, percentage })
  }

  function thenNothingWasSaved() {
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
  }

  it('completes the remaining half and saves the decision in one transaction', async () => {
    givenATrainingDay(today, { withFivePushUps: true })

    await expect(whenTheyCredit(50)).resolves.toEqual({
      didCompleteDay: true
    })

    expect(trainingDayRepo.savedTrainingDays[0]?.toSnapshot()).toMatchObject({
      day: today,
      alternativeActivityPercentage: 50
    })
    expect(unitOfWork.executions).toBe(1)
    expect(trainingDayRepo.savesInsideTransaction).toEqual([true])
  })

  it('reopens the day when the credited share is reduced', async () => {
    givenATrainingDay(today, {
      percentage: 50,
      withFivePushUps: true
    })

    await expect(whenTheyCredit(25)).resolves.toEqual({
      didCompleteDay: false
    })

    expect(trainingDayRepo.savedTrainingDays[0]).toMatchObject({
      alternativeActivityPercentage: 25,
      isComplete: false
    })
  })

  it('does not rewrite the same contribution on a retry', async () => {
    givenATrainingDay(today, { percentage: 50 })

    await expect(whenTheyCredit(50)).resolves.toEqual({
      didCompleteDay: false
    })

    thenNothingWasSaved()
  })

  it('keeps an empty plan incomplete even with full credit', async () => {
    trainingDayRepo.seed(TrainingDay.open(today, []))

    await expect(whenTheyCredit(100)).resolves.toEqual({
      didCompleteDay: false
    })

    expect(trainingDayRepo.savedTrainingDays[0]?.isComplete).toBe(false)
  })

  it('rejects a percentage outside the selectable set without saving', async () => {
    givenATrainingDay(today)

    await expect(
      whenTheyCredit(10 as AlternativeActivityPercentageValue)
    ).rejects.toBeInstanceOf(InvalidAlternativeActivityPercentageError)

    thenNothingWasSaved()
  })

  it('rejects a decision left open overnight', async () => {
    givenATrainingDay(today)

    await expect(
      useCase.handle({ day: yesterday, percentage: 50 })
    ).rejects.toBeInstanceOf(TrainingDayNotOpenForTodayError)

    thenNothingWasSaved()
  })

  it('asks the athlete to prepare today before applying credit', async () => {
    givenATrainingDay(yesterday)

    await expect(whenTheyCredit(50)).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasSaved()
  })

  it('keeps a finalized training day unchanged', async () => {
    givenATrainingDay(today, { status: 'FINALIZED' })

    await expect(whenTheyCredit(50)).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasSaved()
  })
})
