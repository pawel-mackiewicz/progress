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
    expect(exercise.level).toBe(1)
    expect(exercise.levels).toEqual([])
    expect(exercise.createdAt).toEqual(creationTime)
    expect(exercise.updatedAt).toEqual(creationTime)
    expect(exercise.archivedAt).toBeNull()
    expect(exercise.isArchived()).toBe(false)
  })

  it('provides an isolated snapshot of its persisted training state', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 40 },
      'exercise-1',
      creationTime
    )

    creationTime.setUTCFullYear(2030)

    expect(exercise.toSnapshot()).toEqual({
      id: 'exercise-1',
      name: 'Push-ups',
      dailyGoal: 40,
      levels: [],
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    })
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

  it('earns ordered levels while protecting its achievement history', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')
    const levelTwoTime = new Date('2026-08-25T08:00:00.000Z')
    const levelThreeTime = new Date('2026-08-26T08:00:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 20 },
      'exercise-1',
      creationTime
    )

    const levelTwo = exercise.levelUp(
      {
        exerciseId: exercise.id,
        previousDailyGoal: 20,
        nextDailyGoal: 21
      },
      levelTwoTime
    )
    const levelThree = levelTwo.levelUp(
      {
        exerciseId: exercise.id,
        previousDailyGoal: 21,
        nextDailyGoal: 22
      },
      levelThreeTime
    )

    expect(levelThree.level).toBe(3)
    expect(levelThree.levels).toEqual([
      {
        level: 2,
        achievedAt: levelTwoTime,
        previousDailyGoal: 20,
        nextDailyGoal: 21
      },
      {
        level: 3,
        achievedAt: levelThreeTime,
        previousDailyGoal: 21,
        nextDailyGoal: 22
      }
    ])

    const exposedLevels = levelThree.levels
    exposedLevels[0]?.achievedAt.setUTCFullYear(2030)

    expect(levelThree.levels[0]?.achievedAt).toEqual(levelTwoTime)
    expect(exercise.level).toBe(1)
    expect(exercise.levels).toEqual([])
  })

  it('keeps earned levels when its goal is edited manually', () => {
    const creationTime = new Date('2026-08-24T08:00:00.000Z')
    const progressionTime = new Date('2026-08-25T08:00:00.000Z')
    const editTime = new Date('2026-08-26T08:00:00.000Z')
    const exercise = Exercise.register(
      { name: 'Push-ups', dailyGoal: 20 },
      'exercise-1',
      creationTime
    ).levelUp(
      {
        exerciseId: 'exercise-1',
        previousDailyGoal: 20,
        nextDailyGoal: 21
      },
      progressionTime
    )

    const editedExercise = exercise.updateDetails(
      { name: 'Slow push-ups', dailyGoal: 30 },
      editTime
    )

    expect(editedExercise.level).toBe(2)
    expect(editedExercise.levels).toEqual(exercise.levels)
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
