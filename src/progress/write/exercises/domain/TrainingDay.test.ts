import { describe, expect, it } from 'vitest'

import type { RepIncrement } from '@/progress/types'
import {
  AlternativeActivityPercentage,
  InvalidAlternativeActivityPercentageError
} from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import {
  TrainingDay,
  TrainingDayFinalizedError,
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
      exerciseId: 'push-ups',
      dailyGoal: 20,
      effectiveDailyGoal: 20,
      completedReps: 10,
      progressionThresholdReps: 22,
      remainingRepsToProgression: 12,
      isCompleted: false,
      isProgressionReady: false
    })
  })

  it('shows a small-goal athlete the last rep before progression is ready', () => {
    const pullUps = anExercise('pull-ups', 19)
    let day = TrainingDay.open('2026-08-24', [pullUps])
    day = afterRecording(day, pullUps.id, [10, 10])

    expect(day.getExerciseProgress(pullUps.id)).toEqual({
      exerciseId: pullUps.id,
      dailyGoal: 19,
      effectiveDailyGoal: 19,
      completedReps: 20,
      progressionThresholdReps: 21,
      remainingRepsToProgression: 1,
      isCompleted: true,
      isProgressionReady: false
    })

    day = afterRecording(day, pullUps.id, [1])

    expect(day.getExerciseProgress(pullUps.id)).toMatchObject({
      remainingRepsToProgression: 0,
      isProgressionReady: true
    })
  })

  it('reports percentage thresholds once in training-plan order', () => {
    const pushUps = anExercise('push-ups', 20)
    const squats = anExercise('squats', 25)
    const plank = anExercise('plank', 50)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats, plank])
    day = afterRecording(day, squats.id, [10, 10, 5, 1, 1])
    day = afterRecording(day, pushUps.id, [10, 10, 1, 1])

    expect(day.getExercisesProgress()).toEqual([
      {
        exerciseId: pushUps.id,
        dailyGoal: 20,
        effectiveDailyGoal: 20,
        completedReps: 22,
        progressionThresholdReps: 22,
        remainingRepsToProgression: 0,
        isCompleted: true,
        isProgressionReady: true
      },
      {
        exerciseId: squats.id,
        dailyGoal: 25,
        effectiveDailyGoal: 25,
        completedReps: 27,
        progressionThresholdReps: 28,
        remainingRepsToProgression: 1,
        isCompleted: true,
        isProgressionReady: false
      },
      {
        exerciseId: plank.id,
        dailyGoal: 50,
        effectiveDailyGoal: 50,
        completedReps: 0,
        progressionThresholdReps: 55,
        remainingRepsToProgression: 55,
        isCompleted: false,
        isProgressionReady: false
      }
    ])
  })

  it('clamps progression readiness after a large surplus', () => {
    const pushUps = anExercise('push-ups', 20)
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [pushUps]),
      pushUps.id,
      [10, 10, 10, 10]
    )

    expect(day.getExerciseProgress(pushUps.id)).toMatchObject({
      completedReps: 40,
      progressionThresholdReps: 22,
      remainingRepsToProgression: 0,
      isProgressionReady: true
    })
  })

  it('withdraws readiness when the threshold-reaching set is undone', () => {
    const pullUps = anExercise('pull-ups', 10)
    let day = afterRecording(
      TrainingDay.open('2026-08-24', [pullUps]),
      pullUps.id,
      [10, 1, 1]
    )

    expect(day.getExerciseProgress(pullUps.id).isProgressionReady).toBe(true)

    day = day.undoRepLog('pull-ups-set-2')

    expect(day.getExerciseProgress(pullUps.id)).toMatchObject({
      completedReps: 11,
      remainingRepsToProgression: 1,
      isProgressionReady: false
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

  it('applies the selected contribution to every exercise without pooling reps', () => {
    const pushUps = anExercise('push-ups', 5)
    const squats = anExercise('squats', 10)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats])
    day = day.setAlternativeActivityPercentage(
      AlternativeActivityPercentage.from(75)
    )
    day = afterRecording(day, pushUps.id, [1])
    day = afterRecording(day, squats.id, [1, 1])

    expect(day.getExercisesProgress()).toEqual([
      expect.objectContaining({
        exerciseId: pushUps.id,
        dailyGoal: 5,
        effectiveDailyGoal: 1,
        completedReps: 1,
        isCompleted: true
      }),
      expect.objectContaining({
        exerciseId: squats.id,
        dailyGoal: 10,
        effectiveDailyGoal: 3,
        completedReps: 2,
        isCompleted: false
      })
    ])
    expect(day.isComplete).toBe(false)

    day = afterRecording(day, squats.id, [1])

    expect(day.isComplete).toBe(true)
  })

  it('lets a full contribution complete a non-empty plan but not an empty one', () => {
    const contribution = AlternativeActivityPercentage.from(100)
    const plannedDay = TrainingDay.open('2026-08-24', [
      anExercise('push-ups', 10)
    ]).setAlternativeActivityPercentage(contribution)
    const emptyDay = TrainingDay.open(
      '2026-08-24',
      []
    ).setAlternativeActivityPercentage(contribution)

    expect(plannedDay.isComplete).toBe(true)
    expect(emptyDay.isComplete).toBe(false)
  })

  it('reopens when the alternative contribution is removed', () => {
    const pushUps = anExercise('push-ups', 10)
    let day = afterRecording(
      TrainingDay.open('2026-08-24', [pushUps]),
      pushUps.id,
      [5]
    )
    day = day.setAlternativeActivityPercentage(
      AlternativeActivityPercentage.from(50)
    )

    expect(day.isComplete).toBe(true)

    day = day.setAlternativeActivityPercentage(
      AlternativeActivityPercentage.from(0)
    )

    expect(day.isComplete).toBe(false)
  })

  it('preserves the contribution through rep changes and finalization', () => {
    const pushUps = anExercise('push-ups', 10)
    let day = TrainingDay.open('2026-08-24', [pushUps])
    day = day.setAlternativeActivityPercentage(
      AlternativeActivityPercentage.from(50)
    )
    day = afterRecording(day, pushUps.id, [5])
    day = day.undoRepLog('push-ups-set-0')
    day = day.finalize()

    expect(day.toSnapshot()).toMatchObject({
      status: 'FINALIZED',
      alternativeActivityPercentage: 50
    })
  })

  it('restores legacy days without a contribution as zero', () => {
    const day = TrainingDay.restore(
      {
        day: '2026-08-24',
        status: 'OPEN',
        exercises: [{ exerciseId: 'push-ups', name: 'push-ups', dailyGoal: 10 }]
      },
      []
    )

    expect(day.alternativeActivityPercentage).toBe(0)
    expect(day.getExerciseProgress('push-ups').effectiveDailyGoal).toBe(10)
  })

  it('rejects a stored contribution outside the supported choices', () => {
    expect(() =>
      TrainingDay.restore(
        {
          day: '2026-08-24',
          status: 'OPEN',
          exercises: [],
          alternativeActivityPercentage: 10
        },
        []
      )
    ).toThrowError(InvalidAlternativeActivityPercentageError)
  })

  it('keeps a finalized contribution immutable', () => {
    const day = TrainingDay.open('2026-08-24', [
      anExercise('push-ups', 10)
    ]).finalize()

    expect(() =>
      day.setAlternativeActivityPercentage(
        AlternativeActivityPercentage.from(50)
      )
    ).toThrowError(TrainingDayFinalizedError)
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

    expect(day.getExerciseProgress(pullUps.id).isProgressionReady).toBe(true)
    expect(day.isComplete).toBe(false)
    expect(progressions).toEqual([])
  })

  it('levels up only exercises that reached their real threshold on a credited day', () => {
    const pushUps = anExercise('push-ups', 10)
    const squats = anExercise('squats', 10)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats])
    day = day.setAlternativeActivityPercentage(
      AlternativeActivityPercentage.from(50)
    )
    day = afterRecording(day, pushUps.id, [10, 1, 1])
    day = afterRecording(day, squats.id, [5])

    expect(day.isComplete).toBe(true)
    expect(day.finalize().recalculateDailyGoals()).toEqual([
      {
        exerciseId: pushUps.id,
        previousDailyGoal: 10,
        nextDailyGoal: 11
      }
    ])
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
