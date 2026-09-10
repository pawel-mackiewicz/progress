import { describe, expect, it } from 'vitest'

import type { RepIncrement } from '@/progress/types'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import {
  TrainingDay,
  TrainingDayNotFinalizedError
} from '@/progress/write/exercises/domain/TrainingDay'

const now = new Date('2026-08-24T08:00:00.000Z')

function anExercise(id: string, dailyGoal: number) {
  return Exercise.register({ name: id, dailyGoal }, id, now)
}

function afterRecording(
  day: TrainingDay,
  exerciseId: string,
  amounts: RepIncrement[]
) {
  return amounts.reduce(
    (currentDay, amount, index) =>
      currentDay.recordReps(
        exerciseId,
        amount,
        `${exerciseId}-set-${index}`,
        now
      ).trainingDay,
    day
  )
}

describe('today’s mutable training plan', () => {
  it('reports one exercise’s progress without borrowing reps from another', () => {
    const pushUps = anExercise('push-ups', 20)
    const squats = anExercise('squats', 10)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats])
    day = day.recordReps('push-ups', 10, 'push-set', now).trainingDay
    day = day.recordReps('squats', 10, 'squat-set', now).trainingDay

    expect(day.getExerciseProgress('push-ups')).toEqual({
      dailyGoal: 20,
      completedReps: 10,
      isCompleted: false
    })
  })

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

  it('waits until the day is finalized before recalculating future goals', () => {
    const day = TrainingDay.open('2026-08-24', [anExercise('push-ups', 10)])

    expect(() => day.recalculateDailyGoals()).toThrowError(
      TrainingDayNotFinalizedError
    )
  })

  it('recalculates earned goals after a completed day is finalized', () => {
    const pullUps = anExercise('pull-ups', 10)
    const pushUps = anExercise('push-ups', 20)
    let day = TrainingDay.open('2026-08-24', [pullUps, pushUps])
    // Small goals need two surplus reps; goals from 20 upward need a 10% surplus.
    day = afterRecording(day, pullUps.id, [10, 1, 1])
    day = afterRecording(day, pushUps.id, [10, 10, 1, 1])

    const progressions = day.finalize().recalculateDailyGoals()

    expect(progressions).toEqual([
      {
        exerciseId: pullUps.id,
        previousDailyGoal: 10,
        nextDailyGoal: 11
      },
      {
        exerciseId: pushUps.id,
        previousDailyGoal: 20,
        nextDailyGoal: 21
      }
    ])
  })

  it('keeps every goal when the finalized training day is incomplete', () => {
    const pullUps = anExercise('pull-ups', 10)
    const squats = anExercise('squats', 10)
    let day = TrainingDay.open('2026-08-24', [pullUps, squats])
    day = afterRecording(day, pullUps.id, [10, 1, 1])
    day = afterRecording(day, squats.id, [5])

    const progressions = day.finalize().recalculateDailyGoals()

    expect(progressions).toEqual([])
  })

  it('keeps same goal when the completed exercise has only one surplus rep', () => {
    const pullUps = anExercise('pull-ups', 10)
    let day = TrainingDay.open('2026-08-24', [pullUps])
    day = afterRecording(day, pullUps.id, [10, 1])

    const progressions = day.finalize().recalculateDailyGoals()

    expect(day.isComplete).toBe(true)
    expect(progressions).toEqual([])
  })
})
