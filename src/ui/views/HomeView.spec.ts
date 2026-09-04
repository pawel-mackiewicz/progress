import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { provideProgressServices } from '@/progress/context'
import { shiftLocalDay, toLocalDayKey } from '@/progress/date'
import type {
  DashboardExercise,
  DashboardSnapshot,
  ProgressCommands,
  ProgressQueries
} from '@/progress/types'
import { createAppI18n } from '@/ui/i18n'
import { useRouter } from '@/ui/router/runtime'
import HomeView from '@/ui/views/HomeView.vue'

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRouter: vi.fn()
}))

describe('today’s arcade training dashboard', () => {
  const today = toLocalDayKey()
  let queries: ProgressQueries
  let commands: ProgressCommands

  function snapshot(
    overrides: Partial<DashboardSnapshot> = {}
  ): DashboardSnapshot {
    return {
      day: today,
      exercises: [],
      archivedExercises: [],
      completedDays: [],
      protectedDays: [],
      isDayComplete: false,
      currentStreak: 0,
      availableShields: 0,
      ...overrides
    }
  }

  function exercise(
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

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn()
    } as unknown as ReturnType<typeof useRouter>)
    queries = {
      getExercise: vi.fn(),
      getDashboard: vi.fn().mockResolvedValue(snapshot())
    }
    commands = {
      createExercise: vi.fn(),
      updateExercise: vi.fn(),
      archiveExercise: vi.fn(),
      restoreExercise: vi.fn(),
      recordReps: vi.fn(),
      undoRepLog: vi.fn()
    }
  })

  function openDashboard() {
    const Host = defineComponent({
      components: { HomeView },
      setup() {
        provideProgressServices(queries, commands)
      },
      template: '<HomeView />'
    })

    return mount(Host, {
      global: { plugins: [createAppI18n('en')] }
    })
  }

  function exerciseNames(dashboard: ReturnType<typeof openDashboard>) {
    return dashboard
      .findAll('.home-exercises__summary strong')
      .map((exerciseName) => exerciseName.text())
  }

  async function givenTheyCompleteTheFirstOfTwoExercises() {
    const pushUps = exercise()
    const squats = exercise({
      id: 'squats',
      name: 'Squats',
      createdAt: '2026-08-24T09:00:00.000Z',
      updatedAt: '2026-08-24T09:00:00.000Z'
    })
    const activeDay = snapshot({ exercises: [pushUps, squats] })
    const completedPushUps = {
      ...pushUps,
      completedReps: 10,
      remainingReps: 0,
      progressPercent: 100,
      isComplete: true
    }
    const updatedDay = snapshot({
      exercises: [squats, completedPushUps]
    })
    vi.mocked(queries.getDashboard)
      .mockResolvedValueOnce(activeDay)
      .mockResolvedValueOnce(updatedDay)
    vi.mocked(commands.recordReps).mockResolvedValue({
      repLogId: 'clearing-set',
      didEarnDay: false
    })
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard
      .get('[data-testid="exercise-toggle-push-ups"]')
      .trigger('click')
    await dashboard
      .get('button[aria-label="Add 5 reps to Push-ups"]')
      .trigger('click')
    await flushPromises()

    return dashboard
  }

  it('invites a first-time athlete to create the first quest', async () => {
    const dashboard = openDashboard()
    await flushPromises()

    expect(dashboard.text()).toContain('No active quests')
    expect(dashboard.get('a[href="/exercises/new"]').text()).toContain(
      'Add exercise'
    )
    expect(dashboard.text()).toContain('Victory calendar')
  })

  it('shows the shield balance and the day it protected', async () => {
    const protectedDay = shiftLocalDay(today, -1)
    vi.mocked(queries.getDashboard).mockResolvedValue(
      snapshot({
        currentStreak: 9,
        availableShields: 1,
        protectedDays: [protectedDay]
      })
    )
    const dashboard = openDashboard()
    await flushPromises()

    expect(dashboard.get('[data-testid="shield-balance"]').text()).toContain(
      '1 shield'
    )
    expect(dashboard.get(`[data-day="${protectedDay}"]`).classes()).toContain(
      'completion-calendar__day--protected'
    )
  })

  it('keeps every quest compact until the athlete chooses one to train', async () => {
    vi.mocked(queries.getDashboard).mockResolvedValue(
      snapshot({
        exercises: [
          exercise(),
          exercise({
            id: 'squats',
            name: 'Squats',
            completedReps: 10,
            remainingReps: 0,
            progressPercent: 100,
            isComplete: true
          })
        ]
      })
    )
    const dashboard = openDashboard()
    await flushPromises()

    const pushUps = dashboard.get('[data-testid="exercise-toggle-push-ups"]')
    const squats = dashboard.get('[data-testid="exercise-toggle-squats"]')

    expect(dashboard.text()).not.toContain('Not completed')
    expect(dashboard.text()).not.toContain('Completed')
    expect(
      dashboard
        .get('[data-testid="exercise-status-push-ups"]')
        .classes('home-exercises__status-icon--complete')
    ).toBe(false)
    expect(
      dashboard
        .get('[data-testid="exercise-status-squats"]')
        .classes('home-exercises__status-icon--complete')
    ).toBe(true)
    expect(pushUps.attributes('aria-label')).toContain('Not completed')
    expect(squats.attributes('aria-label')).toContain('Completed')
    expect(pushUps.attributes('aria-expanded')).toBe('false')
    expect(squats.attributes('aria-expanded')).toBe('false')
    expect(dashboard.findAll('.exercise-card')).toHaveLength(0)

    await pushUps.trigger('click')

    expect(pushUps.attributes('aria-expanded')).toBe('true')
    expect(dashboard.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-push-ups'
    )

    await squats.trigger('click')

    expect(pushUps.attributes('aria-expanded')).toBe('false')
    expect(squats.attributes('aria-expanded')).toBe('true')
    expect(dashboard.findAll('.exercise-card')).toHaveLength(1)
    expect(dashboard.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-squats'
    )

    await squats.trigger('click')

    expect(squats.attributes('aria-expanded')).toBe('false')
    expect(dashboard.findAll('.exercise-card')).toHaveLength(0)
  })

  it('keeps a newly cleared quest in place until the athlete collapses it', async () => {
    const dashboard = await givenTheyCompleteTheFirstOfTwoExercises()

    expect(exerciseNames(dashboard)).toEqual(['Push-ups', 'Squats'])
    expect(
      dashboard.find('[data-testid="exercise-card-push-ups"]').exists()
    ).toBe(true)

    await dashboard
      .get('[data-testid="exercise-toggle-push-ups"]')
      .trigger('click')

    expect(exerciseNames(dashboard)).toEqual(['Squats', 'Push-ups'])
    expect(dashboard.findAll('.exercise-card')).toHaveLength(0)
  })

  it('moves a newly cleared quest down when the athlete opens another one', async () => {
    const dashboard = await givenTheyCompleteTheFirstOfTwoExercises()

    expect(exerciseNames(dashboard)).toEqual(['Push-ups', 'Squats'])

    await dashboard
      .get('[data-testid="exercise-toggle-squats"]')
      .trigger('click')

    expect(exerciseNames(dashboard)).toEqual(['Squats', 'Push-ups'])
    expect(dashboard.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-squats'
    )
  })

  it('turns the final quick-add tap into a visible perfect-day reward', async () => {
    const activeDay = snapshot({
      exercises: [
        {
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
          archivedAt: null
        }
      ]
    })
    const clearedDay = snapshot({
      exercises: [
        {
          ...activeDay.exercises[0]!,
          completedReps: 10,
          remainingReps: 0,
          progressPercent: 100,
          isComplete: true
        }
      ],
      completedDays: [today],
      isDayComplete: true,
      currentStreak: 1
    })
    vi.mocked(queries.getDashboard)
      .mockResolvedValueOnce(activeDay)
      .mockResolvedValueOnce(clearedDay)
    vi.mocked(commands.recordReps).mockResolvedValue({
      repLogId: 'winning-set',
      didEarnDay: true
    })
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard
      .get('[data-testid="exercise-toggle-push-ups"]')
      .trigger('click')
    await dashboard
      .get('button[aria-label="Add 5 reps to Push-ups"]')
      .trigger('click')
    await flushPromises()

    expect(commands.recordReps).toHaveBeenCalledWith('push-ups', 5, today)
    expect(dashboard.text()).toContain('Quest complete!')
    expect(dashboard.text()).toContain('1 day streak')
    expect(
      dashboard.find('[data-testid="exercise-card-push-ups"]').exists()
    ).toBe(true)
    expect(dashboard.get(`[data-day="${today}"]`).classes()).toContain(
      'completion-calendar__day--complete'
    )
  })

  it('lets the athlete immediately undo the last mistaken set', async () => {
    const activeDay = snapshot({
      exercises: [
        {
          id: 'pull-ups',
          name: 'Pull-ups',
          dailyGoal: 20,
          completedReps: 5,
          remainingReps: 15,
          progressPercent: 25,
          isComplete: false,
          yesterdayReps: 5,
          previousMaxReps: 10,
          createdAt: '2026-08-24T08:00:00.000Z',
          updatedAt: '2026-08-24T08:00:00.000Z',
          archivedAt: null
        }
      ]
    })
    vi.mocked(queries.getDashboard).mockResolvedValue(activeDay)
    vi.mocked(commands.recordReps).mockResolvedValue({
      repLogId: 'mistaken-set',
      didEarnDay: false
    })
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard
      .get('[data-testid="exercise-toggle-pull-ups"]')
      .trigger('click')
    await dashboard
      .get('button[aria-label="Add 10 reps to Pull-ups"]')
      .trigger('click')
    await flushPromises()
    await dashboard.get('.home-snackbar button').trigger('click')
    await flushPromises()

    expect(commands.undoRepLog).toHaveBeenCalledWith('mistaken-set')
  })
})
