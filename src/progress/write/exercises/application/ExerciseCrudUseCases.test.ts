import { beforeEach, describe, expect, it } from 'vitest'

import { ArchiveExerciseUseCase } from '@/progress/write/exercises/application/ArchiveExerciseUseCase'
import { FakeDailyCompletion } from '@/progress/write/exercises/application/ports/DailyCompletionPort'
import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { RestoreExerciseUseCase } from '@/progress/write/exercises/application/RestoreExerciseUseCase'
import { UpdateExerciseUseCase } from '@/progress/write/exercises/application/UpdateExerciseUseCase'
import type { LocalDayKey } from '@/progress/date'
import {
  DuplicateExerciseNameError,
  Exercise,
  ExerciseNotFoundError
} from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
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
  let trainingDayRepo: FakeTrainingDayRepo
  let dailyCompletion: FakeDailyCompletion
  let clock: ClockPort
  let currentTime: Date
  let updateExercise: UpdateExerciseUseCase
  let archiveExercise: ArchiveExerciseUseCase
  let restoreExercise: RestoreExerciseUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    trainingDayRepo = new FakeTrainingDayRepo()
    dailyCompletion = new FakeDailyCompletion()
    currentTime = now
    clock = { now: () => currentTime }
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
  })

  function givenAnExercise(
    id: string,
    name: string,
    archivedAt: Date | null = null
  ) {
    const exercise = Exercise.restore({
      id,
      name,
      dailyGoal: 40,
      createdAt: creationTime.toISOString(),
      updatedAt: creationTime.toISOString(),
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

  it('updates its details in today’s plan without losing completed reps', async () => {
    const pushUps = givenAnExercise('push-ups', 'Push-ups')
    const morningSet = RepLog.restore({
      id: 'morning-set',
      exerciseId: pushUps.id,
      day: today,
      amount: 10,
      createdAt: now.toISOString()
    })
    givenATrainingDay(today, [pushUps], 'OPEN', [morningSet])

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
    expect(trainingDayRepo.findLatestCalls).toBe(1)
    expect(trainingDayRepo.savedTrainingDays[0]?.toSnapshot()).toEqual({
      day: today,
      status: 'OPEN',
      exercises: [
        {
          exerciseId: 'push-ups',
          name: 'Slow push-ups',
          dailyGoal: 20
        }
      ]
    })
    expect(
      trainingDayRepo.savedTrainingDays[0]?.repLogs.map((repLog) => repLog.id)
    ).toEqual(['morning-set'])
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

  async function whenTheyUpdatePushUps() {
    await updateExercise.handle({
      id: 'push-ups',
      name: 'Slow push-ups',
      dailyGoal: 20,
      day: today
    })
  }

  function thenTheUpdateWasNotSaved() {
    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
  }

  it('asks the athlete to visit the dashboard before updating an exercise', async () => {
    givenAnExercise('push-ups', 'Push-ups')

    await expect(whenTheyUpdatePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenTheUpdateWasNotSaved()
  })

  it('rejects a form left open overnight until the dashboard prepares the new day', async () => {
    const pushUps = givenAnExercise('push-ups', 'Push-ups')
    givenATrainingDay(today, [pushUps])
    currentTime = new Date('2026-08-26T09:30:00.000Z')

    await expect(whenTheyUpdatePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenTheUpdateWasNotSaved()
  })

  it('refuses to change an exercise in an already finalized today', async () => {
    const pushUps = givenAnExercise('push-ups', 'Push-ups')
    givenATrainingDay(today, [pushUps], 'FINALIZED')

    await expect(whenTheyUpdatePushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenTheUpdateWasNotSaved()
  })

  it('archives an exercise and checks whether the remaining plan completes today', async () => {
    const pushUps = givenAnExercise('push-ups', 'Push-ups')
    const squats = givenAnExercise('squats', 'Squats')
    const morningSet = RepLog.restore({
      id: 'morning-set',
      exerciseId: pushUps.id,
      day: today,
      amount: 10,
      createdAt: now.toISOString()
    })
    givenATrainingDay(today, [pushUps, squats], 'OPEN', [morningSet])

    await archiveExercise.handle({ id: 'push-ups', day: today })

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises[0]?.archivedAt).toEqual(now)
    expect(trainingDayRepo.savedTrainingDays[0]?.exercises).toEqual([
      { exerciseId: squats.id, name: 'Squats', dailyGoal: 40 }
    ])
    expect(
      trainingDayRepo.savedTrainingDays[0]?.repLogs.map((repLog) => repLog.id)
    ).toEqual(['morning-set'])
    expect(dailyCompletion.checkedDays).toEqual([today])
  })

  it('restores an archived exercise when its name is still available', async () => {
    const pushUps = givenAnExercise('push-ups', 'Push-ups', creationTime)
    const squats = givenAnExercise('squats', 'Squats')
    givenATrainingDay(today, [squats])

    await restoreExercise.handle({ id: 'push-ups' })

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises[0]?.archivedAt).toBeNull()
    expect(exerciseRepo.savedExercises[0]?.updatedAt).toEqual(now)
    expect(trainingDayRepo.savedTrainingDays[0]?.exercises).toEqual([
      { exerciseId: squats.id, name: 'Squats', dailyGoal: 40 },
      { exerciseId: pushUps.id, name: 'Push-ups', dailyGoal: 40 }
    ])
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
