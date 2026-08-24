import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { provideProgressRepository } from '@/progress/context'
import { toLocalDayKey } from '@/progress/date'
import type { HomeSnapshot, ProgressRepository } from '@/progress/types'
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
  let repository: ProgressRepository

  function snapshot(overrides: Partial<HomeSnapshot> = {}): HomeSnapshot {
    return {
      day: today,
      exercises: [],
      archivedExercises: [],
      completedDays: [],
      isDayComplete: false,
      currentStreak: 0,
      ...overrides
    }
  }

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn()
    } as unknown as ReturnType<typeof useRouter>)
    repository = {
      getExercise: vi.fn(),
      getHomeSnapshot: vi.fn().mockResolvedValue(snapshot()),
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
        provideProgressRepository(repository)
      },
      template: '<HomeView />'
    })

    return mount(Host, {
      global: { plugins: [createAppI18n('en')] }
    })
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
    vi.mocked(repository.getHomeSnapshot)
      .mockResolvedValueOnce(activeDay)
      .mockResolvedValueOnce(clearedDay)
    vi.mocked(repository.recordReps).mockResolvedValue({
      repLogId: 'winning-set',
      didEarnDay: true
    })
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard
      .get('button[aria-label="Add 5 reps to Push-ups"]')
      .trigger('click')
    await flushPromises()

    expect(repository.recordReps).toHaveBeenCalledWith('push-ups', 5, today)
    expect(dashboard.text()).toContain('Quest complete!')
    expect(dashboard.text()).toContain('1 day streak')
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
          createdAt: '2026-08-24T08:00:00.000Z',
          updatedAt: '2026-08-24T08:00:00.000Z',
          archivedAt: null
        }
      ]
    })
    vi.mocked(repository.getHomeSnapshot).mockResolvedValue(activeDay)
    vi.mocked(repository.recordReps).mockResolvedValue({
      repLogId: 'mistaken-set',
      didEarnDay: false
    })
    const dashboard = openDashboard()
    await flushPromises()

    await dashboard
      .get('button[aria-label="Add 10 reps to Pull-ups"]')
      .trigger('click')
    await flushPromises()
    await dashboard.get('.home-snackbar button').trigger('click')
    await flushPromises()

    expect(repository.undoRepLog).toHaveBeenCalledWith('mistaken-set')
  })
})
