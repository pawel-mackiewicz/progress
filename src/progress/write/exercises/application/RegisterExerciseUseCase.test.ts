import { beforeEach, describe, expect, it } from 'vitest'

import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { FakeTrainingDayRepo } from '@/progress/write/exercises/application/ports/TrainingDayRepoPort'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import type { LocalDayKey } from '@/progress/date'
import {
  DuplicateExerciseNameError,
  Exercise
} from '@/progress/write/exercises/domain/Exercise'
import { RepLog } from '@/progress/write/exercises/domain/RepLog'
import {
  TrainingDay,
  TrainingDayNotOpenForTodayError
} from '@/progress/write/exercises/domain/TrainingDay'
import type { IdGeneratorPort } from '@/progress/write/shared/IdGeneratorPort'
import type { UnitOfWork } from '@/progress/write/shared/UnitOfWork'

class StoryUnitOfWork implements UnitOfWork {
  public executions = 0

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.executions += 1
    return action()
  }
}

class StoryIdGenerator implements IdGeneratorPort {
  public generations = 0

  public generate(): string {
    this.generations += 1
    return 'generated-exercise-id'
  }
}

class StoryClock {
  public readings = 0

  public constructor(public currentTime: Date) {}

  public now(): Date {
    this.readings += 1
    return new Date(this.currentTime)
  }
}

describe('an athlete registering an exercise', () => {
  const today = '2026-08-24' as const
  const now = new Date('2026-08-24T08:00:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let exerciseRepo: FakeExerciseRepo
  let trainingDayRepo: FakeTrainingDayRepo
  let idGenerator: StoryIdGenerator
  let clock: StoryClock
  let useCase: RegisterExerciseUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    trainingDayRepo = new FakeTrainingDayRepo()
    idGenerator = new StoryIdGenerator()
    clock = new StoryClock(now)
    useCase = new RegisterExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      trainingDayRepo,
      idGenerator,
      clock
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

  async function whenTheyRegisterPushUps() {
    await useCase.handle({ name: '  Push-ups  ', dailyGoal: 40 })
  }

  it('saves one active exercise inside the application transaction', async () => {
    givenATrainingDay(today, [])
    await whenTheyRegisterPushUps()

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.nameChecks).toEqual(['  Push-ups  '])
    expect(exerciseRepo.savedExercises).toHaveLength(1)
    expect(exerciseRepo.savedExercises[0]).toMatchObject({
      id: 'generated-exercise-id',
      name: 'Push-ups',
      dailyGoal: 40
    })
    expect(exerciseRepo.savedExercises[0]?.createdAt).toEqual(now)
    expect(idGenerator.generations).toBe(1)
    expect(clock.readings).toBe(1)
    expect(trainingDayRepo.findLatestCalls).toBe(1)
    expect(trainingDayRepo.savedTrainingDays[0]?.toSnapshot()).toEqual({
      day: today,
      status: 'OPEN',
      exercises: [
        {
          exerciseId: 'generated-exercise-id',
          name: 'Push-ups',
          dailyGoal: 40
        }
      ]
    })
  })

  it('adds the exercise to today without losing the athlete’s plan or reps', async () => {
    const squats = givenAnExerciseWithThisName('Squats')
    const morningSet = RepLog.restore({
      id: 'morning-set',
      exerciseId: squats.id,
      day: today,
      amount: 10,
      createdAt: now.toISOString()
    })
    givenATrainingDay(today, [squats], 'OPEN', [morningSet])

    await whenTheyRegisterPushUps()

    const savedDay = trainingDayRepo.savedTrainingDays[0]
    expect(savedDay?.exercises).toEqual([
      { exerciseId: squats.id, name: 'Squats', dailyGoal: 20 },
      {
        exerciseId: 'generated-exercise-id',
        name: 'Push-ups',
        dailyGoal: 40
      }
    ])
    expect(savedDay?.repLogs.map((repLog) => repLog.id)).toEqual([
      'morning-set'
    ])
  })

  it('rejects another active exercise with the same normalized name', async () => {
    givenAnExerciseWithThisName('push-UPS')

    await expect(whenTheyRegisterPushUps()).rejects.toBeInstanceOf(
      DuplicateExerciseNameError
    )

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(trainingDayRepo.findLatestCalls).toBe(0)
    expect(idGenerator.generations).toBe(0)
    expect(clock.readings).toBe(0)
  })

  it('allows an archived exercise name to return to the active plan', async () => {
    givenAnExerciseWithThisName('Push-ups', now)
    givenATrainingDay(today, [])

    await whenTheyRegisterPushUps()

    expect(exerciseRepo.savedExercises).toHaveLength(1)
    expect(trainingDayRepo.savedTrainingDays[0]?.exercises).toEqual([
      {
        exerciseId: 'generated-exercise-id',
        name: 'Push-ups',
        dailyGoal: 40
      }
    ])
  })

  function thenNothingWasSaved() {
    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(trainingDayRepo.savedTrainingDays).toHaveLength(0)
    expect(idGenerator.generations).toBe(0)
  }

  it('asks the athlete to visit the dashboard before registering the first exercise', async () => {
    await expect(whenTheyRegisterPushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasSaved()
  })

  it('rejects a form left open overnight until the dashboard prepares the new day', async () => {
    givenATrainingDay(today, [])
    clock.currentTime = new Date('2026-08-25T08:00:00.000Z')

    await expect(whenTheyRegisterPushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasSaved()
  })

  it('refuses to add an exercise to an already finalized today', async () => {
    givenATrainingDay(today, [], 'FINALIZED')

    await expect(whenTheyRegisterPushUps()).rejects.toBeInstanceOf(
      TrainingDayNotOpenForTodayError
    )

    thenNothingWasSaved()
  })
})
