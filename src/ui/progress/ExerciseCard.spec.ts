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
      completedReps: 5,
      remainingReps: 35,
      progressPercent: 13,
      isComplete: false,
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
    expect(card.text()).toContain('Previous max: 25')
    expect(card.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(
      '5'
    )
  })

  it('shows a zero previous maximum for an athlete starting fresh', () => {
    const card = showCard(givenProgress({ previousMaxReps: 0 }))

    expect(card.text()).toContain('Previous max: 0')
  })

  it('turns one quick +10 press into a clear rep event', async () => {
    const card = showCard()

    await card
      .get('button[aria-label="Add 10 reps to Push-ups"]')
      .trigger('click')

    expect(card.emitted('add')).toEqual([[10]])
  })

  it('celebrates a cleared personal goal without relying on color alone', () => {
    const card = showCard(
      givenProgress({
        completedReps: 45,
        remainingReps: 0,
        progressPercent: 100,
        isComplete: true
      })
    )

    expect(card.classes()).toContain('exercise-card--complete')
    expect(card.text()).toContain('GOAL CLEARED')
    expect(card.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(
      '40'
    )
  })
})
