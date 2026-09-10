import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppUseCases } from '@/appServices'
import { shiftLocalDay, toLocalDayKey, type LocalDayKey } from '@/progress/date'
import type {
  DashboardExercise,
  DashboardSnapshot,
  ProgressQueries
} from '@/progress/types'
import type { ProgressedExerciseForCelebration } from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'
import { PlayerStats } from '@/progress/write/exercises/domain/PlayerStats'
import { createAppServicesProvides } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import { useRouter } from '@/ui/router/runtime'
import HomeView from '@/ui/views/HomeView.vue'

enableAutoUnmount(afterEach)

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRouter: vi.fn()
}))

describe('today’s arcade training dashboard', () => {
  const today = '2026-08-24' as const
  let queries: ProgressQueries
  let useCases: AppUseCases

  function snapshot(
    overrides: Partial<DashboardSnapshot> = {}
  ): DashboardSnapshot {
    return {
      day: today,
      exercises: [],
      archivedExercises: [],
      dayOutcomes: [],
      isDayComplete: false,
      ...overrides
    }
  }

  function stats(
    overrides: Partial<ReturnType<PlayerStats['toSnapshot']>> = {}
  ) {
    return PlayerStats.restore({
      currentStreak: 0,
      availableShields: 0,
      completedDaysTowardNextShield: 0,
      ...overrides
    })
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

  function progressedExercise(
    overrides: Partial<ProgressedExerciseForCelebration> = {}
  ): ProgressedExerciseForCelebration {
    return {
      exerciseId: 'push-ups',
      name: 'Push-ups',
      previousDailyGoal: 15,
      nextDailyGoal: 16,
      ...overrides
    }
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(2026, 7, 24, 12))
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn()
    } as unknown as ReturnType<typeof useRouter>)
    useCases = {
      prepareTodayTrainingDay: {
        handle: vi.fn().mockImplementation(async () => ({
          day: toLocalDayKey(),
          stats: stats(),
          progressedExercises: []
        }))
      },
      addRep: { handle: vi.fn() },
      undoRep: { handle: vi.fn().mockResolvedValue(undefined) },
      registerExercise: { handle: vi.fn().mockResolvedValue(undefined) },
      updateExercise: {
        handle: vi.fn().mockResolvedValue({ didCompleteDay: false })
      },
      archiveExercise: {
        handle: vi.fn().mockResolvedValue({ didCompleteDay: false })
      },
      restoreExercise: { handle: vi.fn().mockResolvedValue(undefined) }
    }
    queries = {
      getExercise: vi.fn(),
      getDashboard: vi.fn().mockResolvedValue(snapshot())
    }
  })

  afterEach(() => {
    window.history.replaceState({}, '')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function openDashboard() {
    return mount(HomeView, {
      global: {
        plugins: [createAppI18n('en')],
        provide: createAppServicesProvides({
          queries,
          useCases
        })
      }
    })
  }

  function exerciseNames(dashboard: ReturnType<typeof openDashboard>) {
    return dashboard
      .findAll('.home-exercises__item')
      .map((exerciseItem) =>
        exerciseItem
          .get('.home-exercises__summary strong, .exercise-card__name')
          .text()
      )
  }

  function givenDayPreparationIsPending() {
    let finish!: (
      day: LocalDayKey,
      progressedExercises?: ProgressedExerciseForCelebration[]
    ) => void
    vi.mocked(useCases.prepareTodayTrainingDay.handle).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = (day, progressedExercises = []) =>
          resolve({ day, stats: stats(), progressedExercises })
      })
    )
    return { finish }
  }

  async function whenTheyReturnToTheApp() {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
  }

  it('waits for preparation and reads the exact day that was opened', async () => {
    const preparation = givenDayPreparationIsPending()
    const dashboard = openDashboard()
    await flushPromises()

    expect(queries.getDashboard).not.toHaveBeenCalled()
    expect(dashboard.find('[aria-busy="true"]').exists()).toBe(true)

    const preparedDay = shiftLocalDay(today, 1)
    preparation.finish(preparedDay)
    await flushPromises()

    expect(queries.getDashboard).toHaveBeenCalledWith(
      preparedDay,
      '2026-08-01',
      '2026-08-31'
    )
  })

  it('shows a load error if the first dashboard visit cannot prepare today', async () => {
    vi.mocked(useCases.prepareTodayTrainingDay.handle).mockRejectedValueOnce(
      new Error('Storage unavailable')
    )

    const dashboard = openDashboard()
    await flushPromises()

    expect(dashboard.find('[role="alert"]').exists()).toBe(true)
    expect(dashboard.find('[aria-busy="true"]').exists()).toBe(false)
    expect(queries.getDashboard).not.toHaveBeenCalled()
  })

  it('celebrates every goal they raised before starting today’s quest', async () => {
    vi.mocked(useCases.prepareTodayTrainingDay.handle).mockResolvedValueOnce({
      day: today,
      stats: stats(),
      progressedExercises: [
        progressedExercise(),
        progressedExercise({
          exerciseId: 'squats',
          name: 'Squats',
          previousDailyGoal: 30,
          nextDailyGoal: 33
        })
      ]
    })
    const dashboard = openDashboard()
    await flushPromises()

    const reward = dashboard.get('[role="dialog"]')
    expect(reward.text()).toContain('You raised the bar!')
    expect(reward.findAll('li')).toHaveLength(2)
    expect(reward.text()).toContain('Push-ups')
    expect(reward.text()).toContain('15')
    expect(reward.text()).toContain('16')
    expect(reward.text()).toContain('Squats')
    expect(reward.text()).toContain('30')
    expect(reward.text()).toContain('33')

    await reward.get('button').trigger('click')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(dashboard.find('[role="dialog"]').exists()).toBe(false)

    await whenTheyReturnToTheApp()

    expect(dashboard.find('[role="dialog"]').exists()).toBe(false)
  })

  it('prepares the new day when midnight passes with the dashboard open', async () => {
    vi.setSystemTime(new Date(2026, 7, 24, 23, 59, 59))
    openDashboard()
    await flushPromises()

    await vi.advanceTimersByTimeAsync(1100)
    await flushPromises()

    expect(useCases.prepareTodayTrainingDay.handle).toHaveBeenCalledTimes(2)
    expect(queries.getDashboard).toHaveBeenLastCalledWith(
      '2026-08-25',
      '2026-08-01',
      '2026-08-31'
    )
  })

  it('prepares the new day and month when the athlete resumes the app after an absence', async () => {
    openDashboard()
    await flushPromises()
    vi.setSystemTime(new Date(2026, 8, 1, 8))

    await whenTheyReturnToTheApp()

    expect(useCases.prepareTodayTrainingDay.handle).toHaveBeenCalledTimes(2)
    expect(queries.getDashboard).toHaveBeenLastCalledWith(
      '2026-09-01',
      '2026-09-01',
      '2026-09-30'
    )
  })

  it('hides the stale plan when preparation fails on returning to the app', async () => {
    vi.mocked(queries.getDashboard).mockResolvedValue(
      snapshot({ exercises: [exercise()] })
    )
    const dashboard = openDashboard()
    await flushPromises()
    expect(exerciseNames(dashboard)).toEqual(['Push-ups'])
    vi.mocked(useCases.prepareTodayTrainingDay.handle).mockRejectedValueOnce(
      new Error('Storage unavailable')
    )

    await whenTheyReturnToTheApp()

    expect(dashboard.find('[role="alert"]').exists()).toBe(true)
    expect(exerciseNames(dashboard)).toEqual([])
    expect(queries.getDashboard).toHaveBeenCalledTimes(1)
  })

  it('keeps the latest dashboard when an earlier preparation finishes late', async () => {
    const earlierPreparation = givenDayPreparationIsPending()
    const dashboard = openDashboard()
    await whenTheyReturnToTheApp()

    earlierPreparation.finish(shiftLocalDay(today, -1), [progressedExercise()])
    await flushPromises()

    expect(queries.getDashboard).toHaveBeenCalledTimes(1)
    expect(queries.getDashboard).toHaveBeenCalledWith(
      today,
      '2026-08-01',
      '2026-08-31'
    )
    expect(dashboard.find('[role="alert"]').exists()).toBe(false)
    expect(dashboard.get('[role="dialog"]').text()).toContain(
      'You raised the bar!'
    )
  })

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
    vi.mocked(useCases.addRep.handle).mockResolvedValue({
      repLogId: 'clearing-set',
      dailyGoal: 10,
      completedReps: 10,
      isCompleted: true,
      didCompleteDay: false
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

  it('restores an archived quest and reloads the training plan', async () => {
    const squats = exercise({
      id: 'squats',
      name: 'Squats',
      archivedAt: '2026-08-25T08:00:00.000Z'
    })
    vi.mocked(queries.getDashboard)
      .mockResolvedValueOnce(snapshot({ archivedExercises: [squats] }))
      .mockResolvedValueOnce(
        snapshot({ exercises: [{ ...squats, archivedAt: null }] })
      )
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard.get('button[aria-label="Restore Squats"]').trigger('click')
    await flushPromises()

    expect(useCases.restoreExercise.handle).toHaveBeenCalledWith({
      id: 'squats'
    })
    expect(queries.getDashboard).toHaveBeenCalledTimes(2)
    expect(dashboard.text()).toContain('Squats')
  })

  it('shows the shield balance and the day it protected', async () => {
    const protectedDay = shiftLocalDay(today, -1)
    vi.mocked(useCases.prepareTodayTrainingDay.handle).mockResolvedValue({
      day: today,
      stats: stats({ currentStreak: 9, availableShields: 1 }),
      progressedExercises: []
    })
    vi.mocked(queries.getDashboard).mockResolvedValue(
      snapshot({
        dayOutcomes: [{ day: protectedDay, result: 'SHIELDED' }]
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

    expect(
      dashboard.find('[data-testid="exercise-toggle-push-ups"]').exists()
    ).toBe(false)
    expect(
      dashboard.find('[data-testid="exercise-collapse-push-ups"]').exists()
    ).toBe(true)
    expect(dashboard.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-push-ups'
    )

    await squats.trigger('click')

    expect(
      dashboard.find('[data-testid="exercise-toggle-push-ups"]').exists()
    ).toBe(true)
    expect(
      dashboard.find('[data-testid="exercise-toggle-squats"]').exists()
    ).toBe(false)
    expect(dashboard.findAll('.exercise-card')).toHaveLength(1)
    expect(dashboard.get('.exercise-card').attributes('id')).toBe(
      'exercise-details-squats'
    )

    await dashboard
      .get('[data-testid="exercise-collapse-squats"]')
      .trigger('click')

    expect(
      dashboard.find('[data-testid="exercise-toggle-squats"]').exists()
    ).toBe(true)
    expect(dashboard.findAll('.exercise-card')).toHaveLength(0)
  })

  it('keeps a newly cleared quest in place until the athlete collapses it', async () => {
    const dashboard = await givenTheyCompleteTheFirstOfTwoExercises()

    expect(exerciseNames(dashboard)).toEqual(['Push-ups', 'Squats'])
    expect(
      dashboard.find('[data-testid="exercise-card-push-ups"]').exists()
    ).toBe(true)

    await dashboard
      .get('[data-testid="exercise-collapse-push-ups"]')
      .trigger('click')

    expect(exerciseNames(dashboard)).toEqual(['Squats', 'Push-ups'])
    expect(dashboard.findAll('.exercise-card')).toHaveLength(0)
  })

  it('keeps the perfect-day reward locked while another quest still needs work', async () => {
    const dashboard = await givenTheyCompleteTheFirstOfTwoExercises()

    expect(dashboard.text()).not.toContain('Quest complete!')
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
      dayOutcomes: [{ day: today, result: 'COMPLETED' }],
      isDayComplete: true
    })
    vi.mocked(queries.getDashboard)
      .mockResolvedValueOnce(activeDay)
      .mockResolvedValueOnce(clearedDay)
    vi.mocked(useCases.addRep.handle).mockResolvedValue({
      repLogId: 'winning-set',
      dailyGoal: 10,
      completedReps: 10,
      isCompleted: true,
      didCompleteDay: true
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

    expect(useCases.addRep.handle).toHaveBeenCalledWith({
      exerciseId: 'push-ups',
      amount: 5
    })
    expect(dashboard.text()).toContain('Quest complete!')
    expect(dashboard.text()).toContain('Start your streak today')
    expect(
      dashboard.find('[data-testid="exercise-card-push-ups"]').exists()
    ).toBe(true)
    expect(dashboard.get(`[data-day="${today}"]`).classes()).toContain(
      'completion-calendar__day--complete'
    )
  })

  it('shows a perfect-day reward carried back from exercise maintenance once', async () => {
    window.history.replaceState({ celebrateDayCompletion: true }, '')

    const dashboard = openDashboard()
    await flushPromises()

    expect(dashboard.text()).toContain('Quest complete!')
    expect(window.history.state.celebrateDayCompletion).toBeUndefined()
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
    vi.mocked(useCases.addRep.handle).mockResolvedValue({
      repLogId: 'mistaken-set',
      dailyGoal: 20,
      completedReps: 15,
      isCompleted: false,
      didCompleteDay: false
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

    expect(useCases.undoRep.handle).toHaveBeenCalledWith({
      repLogId: 'mistaken-set'
    })
  })
})
