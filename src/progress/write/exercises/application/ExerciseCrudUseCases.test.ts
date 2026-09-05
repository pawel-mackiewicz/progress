import { beforeEach, describe, expect, it } from 'vitest'

import { ArchiveExerciseUseCase } from '@/progress/write/exercises/application/ArchiveExerciseUseCase'
import { FakeDailyCompletion } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { RestoreExerciseUseCase } from '@/progress/write/exercises/application/RestoreExerciseUseCase'
import { UpdateExerciseUseCase } from '@/progress/write/exercises/application/UpdateExerciseUseCase'
import {
  DuplicateExerciseNameError,
  Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'

class StoryUnitOfWork implements UnitOfWork {
  public executions = 0

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.executions += 1
    return action()
  }
}

describe('an athlete maintaining their exercise plan', () => {
  const today = '2026-08-25' as const
  const creationTime = new Date('2026-08-24T08:00:00.000Z')
  const now = new Date('2026-08-25T09:30:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let exerciseRepo: FakeExerciseRepo
  let dailyCompletion: FakeDailyCompletion
  let clock: ClockPort
  let updateExercise: UpdateExerciseUseCase
  let archiveExercise: ArchiveExerciseUseCase
  let restoreExercise: RestoreExerciseUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    dailyCompletion = new FakeDailyCompletion()
    clock = { now: () => now }
    updateExercise = new UpdateExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      dailyCompletion,
      clock
    )
    archiveExercise = new ArchiveExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      dailyCompletion,
      clock
    )
    restoreExercise = new RestoreExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      clock
    )
  })

  function givenAnExercise(
    id: string,
    name: string,
    archivedAt: Date | null = null
  ) {
    exerciseRepo.seed(
      Exercise.restore({
        id,
        name,
        dailyGoal: 40,
        createdAt: creationTime.toISOString(),
        updatedAt: creationTime.toISOString(),
        archivedAt: archivedAt?.toISOString() ?? null
      })
    )
  }

  it('updates its details and checks whether the easier plan completes today', async () => {
    givenAnExercise('push-ups', 'Push-ups')

    await updateExercise.handle({
      id: 'push-ups',
      name: '  Slow push-ups  ',
      dailyGoal: 20,
      day: today
    })

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises[0]).toMatchObject({
      id: 'push-ups',
      name: 'Slow push-ups',
      dailyGoal: 20
    })
    expect(exerciseRepo.savedExercises[0]?.updatedAt).toEqual(now)
    expect(dailyCompletion.checkedDays).toEqual([today])
  })

  it('does not let an update borrow another active exercise name', async () => {
    givenAnExercise('push-ups', 'Push-ups')
    givenAnExercise('pull-ups', 'Pull-ups')

    await expect(
      updateExercise.handle({
        id: 'push-ups',
        name: '  PULL-ups ',
        dailyGoal: 20,
        day: today
      })
    ).rejects.toBeInstanceOf(DuplicateExerciseNameError)

    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(dailyCompletion.checkedDays).toHaveLength(0)
  })

  it('archives an exercise and checks whether the remaining plan completes today', async () => {
    givenAnExercise('push-ups', 'Push-ups')

    await archiveExercise.handle({ id: 'push-ups', day: today })

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises[0]?.archivedAt).toEqual(now)
    expect(dailyCompletion.checkedDays).toEqual([today])
  })

  it('restores an archived exercise when its name is still available', async () => {
    givenAnExercise('push-ups', 'Push-ups', creationTime)

    await restoreExercise.handle({ id: 'push-ups' })

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises[0]?.archivedAt).toBeNull()
    expect(exerciseRepo.savedExercises[0]?.updatedAt).toEqual(now)
  })

  it('keeps an archived exercise aside when its name is active again', async () => {
    givenAnExercise('old-push-ups', 'Push-ups', creationTime)
    givenAnExercise('new-push-ups', 'push-UPS')

    await expect(
      restoreExercise.handle({ id: 'old-push-ups' })
    ).rejects.toBeInstanceOf(DuplicateExerciseNameError)

    expect(exerciseRepo.savedExercises).toHaveLength(0)
  })

  it('reports when the exercise has disappeared before an action', async () => {
    await expect(
      updateExercise.handle({
        id: 'missing',
        name: 'Push-ups',
        dailyGoal: 20,
        day: today
      })
    ).rejects.toBeInstanceOf(ExerciseNotFoundError)
  })
})
