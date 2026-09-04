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
})
