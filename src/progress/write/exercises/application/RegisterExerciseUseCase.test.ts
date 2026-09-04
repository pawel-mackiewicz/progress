import { beforeEach, describe, expect, it } from 'vitest'

import { FakeExerciseRepo } from '@/progress/write/exercises/application/ports/ExerciseRepoPort'
import { RegisterExerciseUseCase } from '@/progress/write/exercises/application/RegisterExerciseUseCase'
import {
  DuplicateExerciseNameError,
  Exercise
} from '@/progress/write/exercises/domain/Exercise'
import type { ClockPort } from '@/progress/write/shared/ClockPort'
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

describe('an athlete registering an exercise', () => {
  const now = new Date('2026-08-24T08:00:00.000Z')
  let unitOfWork: StoryUnitOfWork
  let exerciseRepo: FakeExerciseRepo
  let idGenerator: StoryIdGenerator
  let clock: ClockPort
  let useCase: RegisterExerciseUseCase

  beforeEach(() => {
    unitOfWork = new StoryUnitOfWork()
    exerciseRepo = new FakeExerciseRepo()
    idGenerator = new StoryIdGenerator()
    clock = { now: () => now }
    useCase = new RegisterExerciseUseCase(
      unitOfWork,
      exerciseRepo,
      idGenerator,
      clock
    )
  })

  function givenAnExerciseWithThisName(
    name: string,
    archivedAt: Date | null = null
  ) {
    exerciseRepo.seed(
      Exercise.restore({
        id: 'existing-exercise',
        name,
        dailyGoal: 20,
        createdAt: now,
        updatedAt: now,
        archivedAt
      })
    )
  }

  async function whenTheyRegisterPushUps() {
    await useCase.handle({ name: '  Push-ups  ', dailyGoal: 40 })
  }

  it('saves one active exercise inside the application transaction', async () => {
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
  })

  it('rejects another active exercise with the same normalized name', async () => {
    givenAnExerciseWithThisName('push-UPS')

    await expect(whenTheyRegisterPushUps()).rejects.toBeInstanceOf(
      DuplicateExerciseNameError
    )

    expect(unitOfWork.executions).toBe(1)
    expect(exerciseRepo.savedExercises).toHaveLength(0)
    expect(idGenerator.generations).toBe(0)
  })

  it('allows an archived exercise name to return to the active plan', async () => {
    givenAnExerciseWithThisName('Push-ups', now)

    await whenTheyRegisterPushUps()

    expect(exerciseRepo.savedExercises).toHaveLength(1)
  })
})
