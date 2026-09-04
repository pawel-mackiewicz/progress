import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import type { DashboardExercise, Exercise } from '@/progress/types'
import type { LocalDayKey } from '@/progress/date'
import CompletionCalendar from '@/ui/progress/CompletionCalendar.vue'
import CompletionCelebration from '@/ui/progress/CompletionCelebration.vue'
import HomeArchivedExercises from '@/ui/progress/HomeArchivedExercises.vue'
import HomeExerciseList from '@/ui/progress/HomeExerciseList.vue'
import HomeHero from '@/ui/progress/HomeHero.vue'
import { createAppI18n } from '@/ui/i18n'

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  }
}))

describe('the home dashboard sections', () => {
  function activeExercise(
    overrides: Partial<DashboardExercise> = {}
  ): DashboardExercise {
    return {
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 10,
      completedReps: 5,
      remainingReps: 5,
      progressPercent: 50,
      isComplete: false,
      yesterdayReps: 5,
      previousMaxReps: 15,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null,
      ...overrides
    }
  }

  function archivedExercise(overrides: Partial<Exercise> = {}): Exercise {
    return {
      id: 'squats',
      name: 'Squats',
      dailyGoal: 20,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-25T08:00:00.000Z',
      archivedAt: '2026-08-25T08:00:00.000Z',
      ...overrides
    }
  }

  it('turns today’s welcome into a completed-day streak', async () => {
    const hero = mount(HomeHero, {
      props: {
        date: new Date(2026, 8, 3),
        isDayComplete: false,
        currentStreak: 0,
        availableShields: 0
      },
      global: { plugins: [createAppI18n('en')] }
    })

    expect(hero.text()).toContain('Ready, player one?')
    expect(hero.text()).toContain('Thursday, September 3')
    expect(hero.text()).toContain('Start your streak today')
    expect(hero.text()).toContain('0 shields')
    expect(hero.get('.home-hero__streak').classes()).not.toContain(
      'home-hero__streak--active'
    )
    expect(hero.get('.home-hero__shield').classes()).not.toContain(
      'home-hero__shield--active'
    )

    await hero.setProps({
      isDayComplete: true,
      currentStreak: 3,
      availableShields: 2
    })

    expect(hero.text()).toContain('Day cleared!')
    expect(hero.text()).toContain('3 day streak')
    expect(hero.text()).toContain('2 shields')
    expect(hero.get('.home-hero__streak').classes()).toContain(
      'home-hero__streak--active'
    )
    expect(hero.get('.home-hero__shield').classes()).toContain(
      'home-hero__shield--active'
    )
  })

  it('marks the missed day where a shield kept the streak alive', () => {
    const protectedDay = '2026-09-02' as LocalDayKey
    const calendar = mount(CompletionCalendar, {
      props: {
        month: new Date(2026, 8, 1),
        completedDays: ['2026-09-01' as LocalDayKey],
        protectedDays: [protectedDay],
        today: '2026-09-03' as LocalDayKey
      },
      global: { plugins: [createAppI18n('en')] }
    })

    const protectedCell = calendar.get(`[data-day="${protectedDay}"]`)

    expect(protectedCell.classes()).toContain(
      'completion-calendar__day--protected'
    )
    expect(protectedCell.attributes('aria-label')).toContain(
      'streak protected by a shield'
    )
    expect(protectedCell.find('.completion-calendar__shield').exists()).toBe(
      true
    )
  })

  it('invites a new athlete to create the first quest', () => {
    const list = mount(HomeExerciseList, {
      props: {
        exercises: [],
        expandedExerciseId: null
      },
      global: { plugins: [createAppI18n('en')] }
    })

    expect(list.text()).toContain('No active quests')
    expect(list.get('a[href="/exercises/new"]').text()).toContain(
      'Add exercise'
    )
  })

  it('opens the chosen quest and reports every training intent', async () => {
    const pushUps = activeExercise()
    const list = mount(HomeExerciseList, {
      props: {
        exercises: [pushUps, activeExercise({ id: 'squats', name: 'Squats' })],
        expandedExerciseId: null
      },
      global: { plugins: [createAppI18n('en')] }
    })

    expect(list.findAll('.exercise-card')).toHaveLength(0)

    await list.get('[data-testid="exercise-toggle-push-ups"]').trigger('click')

    expect(list.emitted('toggle')).toEqual([['push-ups']])

    await list.setProps({ expandedExerciseId: 'push-ups' })
    expect(list.find('[data-testid="exercise-toggle-push-ups"]').exists()).toBe(
      false
    )
    expect(
      list.find('[data-testid="exercise-collapse-push-ups"]').exists()
    ).toBe(true)
    await list
      .get('button[aria-label="Add 5 reps to Push-ups"]')
      .trigger('click')
    await list.get('button[aria-label="Edit Push-ups"]').trigger('click')
    await list
      .get('[data-testid="exercise-collapse-push-ups"]')
      .trigger('click')

    expect(list.findAll('.exercise-card')).toHaveLength(1)
    expect(list.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-push-ups'
    )
    expect(list.emitted('add')).toEqual([['push-ups', 'Push-ups', 5]])
    expect(list.emitted('edit')).toEqual([['push-ups']])
    expect(list.emitted('toggle')).toEqual([['push-ups'], ['push-ups']])
  })

  it('keeps the archive hidden until there is a quest to restore', async () => {
    const archive = mount(HomeArchivedExercises, {
      props: { exercises: [] },
      global: { plugins: [createAppI18n('en')] }
    })

    expect(archive.find('details').exists()).toBe(false)

    await archive.setProps({ exercises: [archivedExercise()] })
    await archive.get('button[aria-label="Restore Squats"]').trigger('click')

    expect(archive.text()).toContain('Archived (1)')
    expect(archive.emitted('restore')).toEqual([['squats']])
  })

  it('reveals an assertive perfect-day reward only after victory', async () => {
    const celebration = mount(CompletionCelebration, {
      props: { visible: false },
      global: { plugins: [createAppI18n('en')] }
    })

    expect(celebration.find('.celebration').exists()).toBe(false)

    await celebration.setProps({ visible: true })

    expect(celebration.get('.celebration').attributes()).toMatchObject({
      role: 'status',
      'aria-live': 'assertive'
    })
    expect(celebration.text()).toContain('Quest complete!')
    expect(celebration.findAll('.celebration__confetti span')).toHaveLength(14)
  })
})
