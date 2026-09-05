import { describe, expect, it } from 'vitest'

import { Exercise } from '@/progress/write/exercises/domain/Exercise'

describe('an exercise entering the athlete’s training plan', () => {
  it('becomes an active exercise with its generated identity and creation time', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')

    const exercise = Exercise.register(
      { name: '  Push-ups  ', dailyGoal: 40 },
      'exercise-1',
      creationTime
    )

    expect(exercise.id).toBe('exercise-1')
    expect(exercise.name).toBe('Push-ups')
    expect(exercise.dailyGoal).toBe(40)
    expect(exercise.createdAt).toEqual(creationTime)
    expect(exercise.updatedAt).toEqual(creationTime)
    expect(exercise.archivedAt).toBeNull()
    expect(exercise.isArchived()).toBe(false)
  })

  it('keeps its identity and history while its training details change', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')
    const updateTime = new Date('2026-08-25T09:30:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 40 },
      'exercise-1',
      creationTime
    )

    const updatedExercise = exercise.updateDetails(
      { name: '  Slow push-ups  ', dailyGoal: 25 },
      updateTime
    )

    expect(updatedExercise).toMatchObject({
      id: 'exercise-1',
      name: 'Slow push-ups',
      dailyGoal: 25
    })
    expect(updatedExercise.createdAt).toEqual(creationTime)
    expect(updatedExercise.updatedAt).toEqual(updateTime)
  })

  it('leaves and later rejoins the active training plan', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')
    const archiveTime = new Date('2026-08-25T09:30:00.000Z')
    const restoreTime = new Date('2026-08-26T10:00:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 40 },
      'exercise-1',
      creationTime
    )

    const archivedExercise = exercise.archive(archiveTime)
    const restoredExercise = archivedExercise.reactivate(restoreTime)

    expect(archivedExercise.archivedAt).toEqual(archiveTime)
    expect(archivedExercise.isArchived()).toBe(true)
    expect(restoredExercise.archivedAt).toBeNull()
    expect(restoredExercise.updatedAt).toEqual(restoreTime)
    expect(restoredExercise.isArchived()).toBe(false)
  })
})
