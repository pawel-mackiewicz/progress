import { describe, expect, it } from 'vitest'

import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'

const now = new Date('2026-08-24T08:00:00.000Z')

function anExercise(id: string, dailyGoal: number) {
  return Exercise.register({ name: id, dailyGoal }, id, now)
}

describe('today’s mutable training plan', () => {
  it('completes only after every planned exercise reaches its goal', () => {
    let day = TrainingDay.open('2026-08-24', [
      anExercise('push-ups', 10),
      anExercise('squats', 5)
    ])

    day = day.recordReps('push-ups', 10, 'push-set', now).trainingDay
    expect(day.isComplete).toBe(false)

    day = day.recordReps('squats', 5, 'squat-set', now).trainingDay
    expect(day.isComplete).toBe(true)
  })

  it('reopens when the exact completing set is undone', () => {
    let day = TrainingDay.open('2026-08-24', [anExercise('push-ups', 5)])
    day = day.recordReps('push-ups', 5, 'winning-set', now).trainingDay

    day = day.undoRepLog('winning-set')

    expect(day.isComplete).toBe(false)
    expect(day.repLogs).toHaveLength(0)
  })

  it('reacts immediately when goals and exercises change', () => {
    const pushUps = anExercise('push-ups', 10)
    const pullUps = anExercise('pull-ups', 5)
    let day = TrainingDay.open('2026-08-24', [])

    expect(day.isComplete).toBe(false)

    day = day.addExercise(pushUps)
    day = day.recordReps('push-ups', 5, 'set-1', now).trainingDay
    expect(day.isComplete).toBe(false)

    day = day.updateExercise(
      pushUps.updateDetails({ name: 'Push-ups', dailyGoal: 5 }, now)
    )
    expect(day.isComplete).toBe(true)

    day = day.addExercise(pullUps)
    expect(day.isComplete).toBe(false)

    day = day.removeExercise('pull-ups')
    expect(day.isComplete).toBe(true)

    day = day.removeExercise('push-ups')
    expect(day.isComplete).toBe(false)
  })
})
