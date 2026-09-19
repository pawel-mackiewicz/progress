import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { DashboardExercise } from '@/progress/types'
import { createAppI18n } from '@/ui/i18n'
import ExerciseCard from '@/ui/progress/ExerciseCard.vue'

describe('an exercise card during today’s quest', () => {
  function givenProgress(
    overrides: Partial<DashboardExercise> = {}
  ): DashboardExercise {
    return {
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 40,
      effectiveDailyGoal: 40,
      completedReps: 5,
      remainingReps: 35,
      progressPercent: 13,
      alternativeActivityProgressPercent: 0,
      progressionThresholdReps: 44,
      remainingRepsToProgression: 39,
      progressionPercent: 0,
      isComplete: false,
      isProgressionReady: false,
      yesterdayReps: 15,
      previousMaxReps: 25,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null,
      ...overrides
    }
  }

  function showCard(exercise = givenProgress()) {
    return mount(ExerciseCard, {
      props: { exercise },
      global: { plugins: [createAppI18n('en')] }
    })
  }

  it('shows the athlete exactly how far today’s set has powered up', () => {
    const card = showCard()

    expect(card.text()).toContain('5')
    expect(card.text()).toContain('/ 40')
    expect(card.text()).toContain('35 to go')
    expect(card.text()).toContain('Yesterday: 15')
    expect(card.text()).toContain('Previous max: 25')
    expect(card.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(
      '5'
    )
    expect(card.text()).not.toContain('level up')
  })

  it('shows an honest empty history for an athlete starting fresh', () => {
    const card = showCard(
      givenProgress({ yesterdayReps: 0, previousMaxReps: 0 })
    )

    expect(card.text()).toContain('Yesterday: 0')
    expect(card.text()).toContain('Previous max: 0')
  })

  it('shows performed reps against today’s reduced goal after other activity', () => {
    const card = showCard(
      givenProgress({
        effectiveDailyGoal: 20,
        completedReps: 10,
        remainingReps: 10,
        alternativeActivityProgressPercent: 50
      })
    )

    expect(card.get('.exercise-card__score').text()).toBe('10')
    expect(card.get('.exercise-card__goal').text()).toBe('/ 20')
    expect(card.text()).not.toContain('/ 40')
  })

  it('turns one quick +10 press into a clear rep event', async () => {
    const card = showCard()

    await card
      .get('button[aria-label="Add 10 reps to Push-ups"]')
      .trigger('click')

    expect(card.emitted('add')).toEqual([[10]])
  })

  it('reveals a fresh level-up run only after the daily goal is cleared', () => {
    const card = showCard(
      givenProgress({
        completedReps: 40,
        remainingReps: 0,
        progressPercent: 100,
        progressionThresholdReps: 44,
        remainingRepsToProgression: 4,
        progressionPercent: 0,
        isComplete: true,
        isProgressionReady: false
      })
    )

    expect(card.classes()).toContain('exercise-card--complete')
    expect(card.text()).toContain('4 reps to level up')
    expect(card.get('[role="progressbar"]').attributes()).toMatchObject({
      'aria-label': 'Level-up progress for Push-ups: 0 of 4 extra reps',
      'aria-valuenow': '0',
      'aria-valuemax': '4'
    })
  })

  it('counts down the extra effort on the level-up scale', () => {
    const card = showCard(
      givenProgress({
        completedReps: 42,
        remainingReps: 0,
        progressPercent: 100,
        progressionThresholdReps: 44,
        remainingRepsToProgression: 2,
        progressionPercent: 50,
        isComplete: true,
        isProgressionReady: false
      })
    )

    expect(card.text()).toContain('2 reps to level up')
    expect(card.get('[role="progressbar"]').attributes()).toMatchObject({
      'aria-label': 'Level-up progress for Push-ups: 2 of 4 extra reps',
      'aria-valuenow': '2',
      'aria-valuemax': '4'
    })
  })

  it('announces when enough extra effort has made the level-up ready', () => {
    const card = showCard(
      givenProgress({
        completedReps: 50,
        remainingReps: 0,
        progressPercent: 100,
        progressionThresholdReps: 44,
        remainingRepsToProgression: 0,
        progressionPercent: 100,
        isComplete: true,
        isProgressionReady: true
      })
    )

    expect(card.classes()).toContain('exercise-card--progression-ready')
    expect(card.text()).toContain('LEVEL-UP READY')
    expect(
      card.find('[data-testid="exercise-level-up-icon-push-ups"]').exists()
    ).toBe(true)
    expect(card.get('[role="progressbar"]').attributes()).toMatchObject({
      'aria-label': 'Level-up progress for Push-ups: 4 of 4 extra reps',
      'aria-valuenow': '4',
      'aria-valuemax': '4'
    })
  })
})
