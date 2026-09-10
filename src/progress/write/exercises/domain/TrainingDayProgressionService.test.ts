import { describe, expect, it } from 'vitest'

import type { RepIncrement } from '@/progress/types'
import { Exercise } from '@/progress/write/exercises/domain/Exercise'
import { TrainingDay } from '@/progress/write/exercises/domain/TrainingDay'
import {
  TrainingDayProgressionConsistencyError,
  TrainingDayProgressionService
} from '@/progress/write/exercises/domain/TrainingDayProgressionService'

const trainingTime = new Date('2026-08-24T08:00:00.000Z')
const progressionTime = new Date('2026-08-25T08:00:00.000Z')

function anExercise(id: string, dailyGoal: number) {
  return Exercise.register({ name: id, dailyGoal }, id, trainingTime)
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
        trainingTime
      ).trainingDay,
    day
  )
}

function whenTheTrainingDayProgresses(day: TrainingDay, exercises: Exercise[]) {
  return new TrainingDayProgressionService().apply(
    day,
    exercises,
    progressionTime
  )
}

describe('an athlete progressing after a training day', () => {
  it('adds one rep when a small goal is exceeded by two reps', () => {
    const pullUps = anExercise('Pull-ups', 19)
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [pullUps]),
      pullUps.id,
      [10, 10, 1]
    )

    const progression = whenTheTrainingDayProgresses(day, [pullUps])

    expect(progression.finalizedTrainingDay.status).toBe('FINALIZED')
    expect(progression.progressedExercises).toHaveLength(1)
    expect(progression.progressedExercises[0]?.previousDailyGoal).toBe(19)
    expect(progression.progressedExercises[0]?.exercise).toMatchObject({
      id: pullUps.id,
      dailyGoal: 20,
      level: 2,
      updatedAt: progressionTime
    })
    expect(progression.progressedExercises[0]?.exercise.levels).toEqual([
      {
        level: 2,
        achievedAt: progressionTime,
        previousDailyGoal: 19,
        nextDailyGoal: 20
      }
    ])
  })

  it('uses percentage progression from twenty and rounds to the nearest rep', () => {
    const pushUps = anExercise('Push-ups', 20)
    const squats = anExercise('Squats', 25)
    const lunges = anExercise('Lunges', 30)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats, lunges])
    // Each total reaches a 10% surplus; the earned goal rises by 5%, rounded to the nearest rep.
    day = afterRecording(day, pushUps.id, [10, 10, 1, 1])
    day = afterRecording(day, squats.id, [10, 10, 5, 1, 1, 1])
    day = afterRecording(day, lunges.id, [10, 10, 10, 1, 1, 1])

    const progression = whenTheTrainingDayProgresses(day, [
      pushUps,
      squats,
      lunges
    ])

    expect(
      progression.progressedExercises.map(
        ({ exercise, previousDailyGoal }) => ({
          id: exercise.id,
          previousDailyGoal,
          nextDailyGoal: exercise.dailyGoal
        })
      )
    ).toEqual([
      { id: pushUps.id, previousDailyGoal: 20, nextDailyGoal: 21 },
      { id: squats.id, previousDailyGoal: 25, nextDailyGoal: 26 },
      { id: lunges.id, previousDailyGoal: 30, nextDailyGoal: 32 }
    ])
  })

  it('keeps the goal when the percentage surplus is not fully reached', () => {
    const squats = anExercise('Squats', 25)
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [squats]),
      squats.id,
      [10, 10, 5, 1, 1]
    )

    // 27 reps are still below the exact 27.5-rep threshold; eligibility is not rounded down.
    const progression = whenTheTrainingDayProgresses(day, [squats])

    expect(progression.progressedExercises).toEqual([])
    expect(squats.level).toBe(1)
    expect(squats.levels).toEqual([])
  })

  it('does not progress one exercise when the whole training day is incomplete', () => {
    const pushUps = anExercise('Push-ups', 10)
    const squats = anExercise('Squats', 10)
    let day = TrainingDay.open('2026-08-24', [pushUps, squats])
    day = afterRecording(day, pushUps.id, [10, 1, 1])
    day = afterRecording(day, squats.id, [5, 1, 1, 1, 1])

    const progression = whenTheTrainingDayProgresses(day, [pushUps, squats])

    expect(progression.progressedExercises).toEqual([])
  })

  it('awards at most one progression step for a large surplus', () => {
    const pushUps = anExercise('Push-ups', 20)
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [pushUps]),
      pushUps.id,
      [10, 10, 10, 10]
    )

    const progression = whenTheTrainingDayProgresses(day, [pushUps])

    expect(progression.progressedExercises[0]?.exercise.dailyGoal).toBe(21)
  })

  it('keeps earned progress for an archived exercise and ignores unrelated exercises', () => {
    const pullUps = anExercise('Pull-ups', 10)
    const archivedPullUps = pullUps.archive(progressionTime)
    const newExercise = anExercise('Squats', 30)
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [pullUps]),
      pullUps.id,
      [10, 1, 1]
    )

    const progression = whenTheTrainingDayProgresses(day, [
      archivedPullUps,
      newExercise
    ])

    expect(progression.progressedExercises).toHaveLength(1)
    expect(progression.progressedExercises[0]?.exercise).toMatchObject({
      id: pullUps.id,
      dailyGoal: 11,
      level: 2
    })
    expect(progression.progressedExercises[0]?.exercise.isArchived()).toBe(true)
    expect(newExercise.dailyGoal).toBe(30)
  })

  it('fails loudly when a training exercise is missing from the canonical collection', () => {
    const pullUps = anExercise('Pull-ups', 10)
    const day = TrainingDay.open('2026-08-24', [pullUps])

    expect(() => whenTheTrainingDayProgresses(day, [])).toThrowError(
      TrainingDayProgressionConsistencyError
    )
  })

  it('fails loudly rather than overwriting a goal changed since the training day', () => {
    const pullUps = anExercise('Pull-ups', 10)
    const changedPullUps = pullUps.updateDetails(
      { name: pullUps.name, dailyGoal: 20 },
      progressionTime
    )
    const day = afterRecording(
      TrainingDay.open('2026-08-24', [pullUps]),
      pullUps.id,
      [10, 1, 1]
    )

    expect(() => whenTheTrainingDayProgresses(day, [changedPullUps])).toThrow(
      expect.objectContaining({
        context: {
          day: '2026-08-24',
          exerciseId: pullUps.id,
          expectedDailyGoal: 10,
          actualDailyGoal: 20
        }
      })
    )
  })
})
