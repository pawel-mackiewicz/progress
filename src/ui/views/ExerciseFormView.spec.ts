import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { AppUseCases } from '@/appServices'
import { toLocalDayKey } from '@/progress/date'
import { TrainingDayNotOpenForTodayError } from '@/progress/write/exercises/domain/TrainingDay'
import type { Exercise, ProgressQueries } from '@/progress/types'
import { createAppServicesProvides } from '@/ui/appServices'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'
import ExerciseFormView from '@/ui/views/ExerciseFormView.vue'

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('the exercise mission form', () => {
  let route: { params: Record<string, string> }
  let queries: ProgressQueries
  let useCases: AppUseCases
  let push: Mock

  beforeEach(() => {
    route = reactive({ params: {} })
    push = vi.fn().mockResolvedValue(undefined)
    useCases = {
      prepareTodayTrainingDay: {
        handle: vi.fn().mockResolvedValue(toLocalDayKey())
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
      getExercise: vi.fn().mockResolvedValue(undefined),
      getDashboard: vi.fn()
    }
    vi.mocked(useRoute).mockReturnValue(
      route as unknown as ReturnType<typeof useRoute>
    )
    vi.mocked(useRouter).mockReturnValue({
      push
    } as unknown as ReturnType<typeof useRouter>)
  })

  function openForm() {
    return mount(ExerciseFormView, {
      global: {
        plugins: [createAppI18n('en')],
        provide: createAppServicesProvides({
          queries,
          useCases
        })
      }
    })
  }

  it('guides a new athlete back to the two missing essentials', async () => {
    const form = openForm()

    await form.get('form').trigger('submit')

    expect(form.text()).toContain('Enter an exercise name.')
    expect(form.text()).toContain('positive whole number')
    expect(useCases.registerExercise.handle).not.toHaveBeenCalled()
  })

  it('turns a name and daily target into a new active quest', async () => {
    const form = openForm()
    const inputs = form.findAll('input')

    await inputs[0]?.setValue('Push-ups')
    await inputs[1]?.setValue('100')
    await form.get('form').trigger('submit')
    await flushPromises()

    expect(useCases.registerExercise.handle).toHaveBeenCalledWith({
      name: 'Push-ups',
      dailyGoal: 100
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('saves the revised details of an existing quest', async () => {
    route.params = { exerciseId: 'push-ups' }
    vi.mocked(queries.getExercise).mockResolvedValue({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 40,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    })
    const form = openForm()
    await flushPromises()

    const inputs = form.findAll('input')
    await inputs[0]?.setValue('Slow push-ups')
    await inputs[1]?.setValue('25')
    await form.get('form').trigger('submit')
    await flushPromises()

    expect(useCases.updateExercise.handle).toHaveBeenCalledWith({
      id: 'push-ups',
      name: 'Slow push-ups',
      dailyGoal: 25,
      day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('carries a goal-correction celebration back to the dashboard', async () => {
    route.params = { exerciseId: 'push-ups' }
    vi.mocked(queries.getExercise).mockResolvedValue({
      id: 'push-ups',
      name: 'Push-ups',
      dailyGoal: 40,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    })
    vi.mocked(useCases.updateExercise.handle).mockResolvedValueOnce({
      didCompleteDay: true
    })
    const form = openForm()
    await flushPromises()

    await form.get('input[type="number"]').setValue('10')
    await form.get('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({
      path: '/',
      state: { celebrateDayCompletion: true }
    })
  })

  it('keeps the draft and shows a save error when today has not been prepared', async () => {
    vi.mocked(useCases.registerExercise.handle).mockRejectedValueOnce(
      new TrainingDayNotOpenForTodayError()
    )
    const form = openForm()
    const nameInput = form.get<HTMLInputElement>('input[type="text"]')
    await nameInput.setValue('Push-ups')
    await form.get('input[type="number"]').setValue('20')

    await form.get('form').trigger('submit')
    await flushPromises()

    expect(form.get('[role="alert"]').text()).toBe(
      'The exercise could not be saved. Try again.'
    )
    expect(nameInput.element.value).toBe('Push-ups')
    expect(push).not.toHaveBeenCalled()
    expect(useCases.prepareTodayTrainingDay.handle).not.toHaveBeenCalled()
  })

  it('loads an existing quest and archives it only after confirmation', async () => {
    const exercise: Exercise = {
      id: 'pull-ups',
      name: 'Pull-ups',
      dailyGoal: 40,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    }
    route.params = { exerciseId: exercise.id }
    vi.mocked(queries.getExercise).mockResolvedValue(exercise)
    const confirm = vi.fn().mockReturnValue(true)
    Object.defineProperty(window, 'confirm', {
      configurable: true,
      value: confirm
    })
    const form = openForm()
    await flushPromises()

    expect(form.findAll('input')[0]?.element.value).toBe('Pull-ups')
    expect(form.findAll('input')[1]?.element.value).toBe('40')

    await form.get('.exercise-form__archive').trigger('click')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(
      'Archive “Pull-ups”? Its history will stay safe.'
    )
    expect(useCases.archiveExercise.handle).toHaveBeenCalledWith({
      id: 'pull-ups',
      day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    })
    expect(push).toHaveBeenCalledWith('/')
  })

  it('carries an archive-triggered celebration back to the dashboard', async () => {
    route.params = { exerciseId: 'pull-ups' }
    vi.mocked(queries.getExercise).mockResolvedValue({
      id: 'pull-ups',
      name: 'Pull-ups',
      dailyGoal: 40,
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
      archivedAt: null
    })
    vi.mocked(useCases.archiveExercise.handle).mockResolvedValueOnce({
      didCompleteDay: true
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const form = openForm()
    await flushPromises()

    await form.get('.exercise-form__archive').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({
      path: '/',
      state: { celebrateDayCompletion: true }
    })
  })
})
