import { beforeEach, describe, expect, it } from 'vitest'

import { UndoRepUseCase } from '@/progress/write/exercises/application/UndoRepUseCase'
import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import type { LocalDayKey } from '@/progress/date'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  RepLogNotInOpenDayError,
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
  public readonly removalsInsideTransaction: boolean[] = []

  public constructor(private readonly unitOfWork: StoryUnitOfWork) {
    super()
  }

  public override async removeRepLog(repLogId: string): Promise<void> {
    this.removalsInsideTransaction.push(this.unitOfWork.isExecuting)
    await super.removeRepLog(repLogId)
  }
}

describe('an athlete undoing a mistaken set from today’s training', () => {
  const today = '2026-08-25' as const
  const yesterday = '2026-08-24' as const
  const now = new Date('2026-08-25T09:30:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let trainingDayRepo: StoryTrainingDayRepo
  let currentTime: Date
  let useCase: UndoRepUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    trainingDayRepo = new StoryTrainingDayRepo(unitOfWork)
    currentTime = now
    useCase = new UndoRepUseCase(unitOfWork, trainingDayRepo, {
      now: () => new Date(currentTime)
    })
  })

  function aPushUpPlan() {
    return Exercise.restore({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 20,
      createdAt: yesterday,
      updatedAt: yesterday,
      archivedAt: null
    })
  }

  function aRecordedSet(id: string, amount: 5 | 10) {
    return RepLog.restore({
      id,
      exerciseId: 'push-ups',
      day: today,
      amount,
      createdAt: now.toISOString()
    })
  }

  function givenATrainingDay(
    day: LocalDayKey,
    repLogs: RepLog[] = [],
    status: 'OPEN' | 'FINALIZED' = 'OPEN'
  ) {
    let trainingDay = TrainingDay.open(day, [aPushUpPlan()], repLogs)

    if (status === 'FINALIZED') {
      trainingDay = trainingDay.finalize()
    }

    trainingDayRepo.seed(trainingDay)
  }

  function whenTheyUndoTheAfternoonSet() {
    return useCase.handle({ repLogId: 'afternoon-set' })
  }

  function thenNothingWasRemoved() {
    expect(trainingDayRepo.removedRepLogIds).toHaveLength(0)
  }

  it('removes only that set in the same transaction', async () => {
    givenATrainingDay(today, [
      aRecordedSet('morning-set', 10),
      aRecordedSet('afternoon-set', 5)
    ])

    await whenTheyUndoTheAfternoonSet()

    expect(
      (await trainingDayRepo.findLatest())?.repLogs.map((repLog) => repLog.id)
    ).toEqual(['morning-set'])
    expect(unitOfWork.executions).toBe(1)
    expect(trainingDayRepo.removalsInsideTransaction).toEqual([true])
  })

  it('reports when the set is not part of today’s open rep story', async () => {
    givenATrainingDay(today, [aRecordedSet('morning-set', 10)])

    await expect(whenTheyUndoTheAfternoonSet()).rejects.toBeInstanceOf(
      RepLogNotInOpenDayError
    )

    thenNothingWasRemoved()
  })

  it('asks the athlete to prepare today before undoing reps', async () => {
    await expect(whenTheyUndoTheAfternoonSet()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasRemoved()
  })

  it('rejects an undo left open overnight', async () => {
    givenATrainingDay(today, [aRecordedSet('afternoon-set', 5)])
    currentTime = new Date('2026-08-26T09:30:00.000Z')

    await expect(whenTheyUndoTheAfternoonSet()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasRemoved()
  })

  it('keeps a finalized training day unchanged', async () => {
    givenATrainingDay(today, [aRecordedSet('afternoon-set', 5)], 'FINALIZED')

    await expect(whenTheyUndoTheAfternoonSet()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasRemoved()
  })
})
