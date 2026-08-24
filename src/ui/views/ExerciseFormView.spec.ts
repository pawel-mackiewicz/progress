import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { provideProgressRepository } from '@/progress/context'
import type { Exercise, ProgressRepository } from '@/progress/types'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'
import ExerciseFormView from '@/ui/views/ExerciseFormView.vue'

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('the exercise mission form', () => {
  let route: { params: Record<string, string> }
  let repository: ProgressRepository
  let push: Mock

  beforeEach(() => {
    route = reactive({ params: {} })
    push = vi.fn().mockResolvedValue(undefined)
    repository = {
      getExercise: vi.fn().mockResolvedValue(undefined),
      getHomeSnapshot: vi.fn(),
      createExercise: vi.fn(),
      updateExercise: vi.fn(),
      archiveExercise: vi.fn(),
      restoreExercise: vi.fn(),
      recordReps: vi.fn(),
      undoRepLog: vi.fn()
    }

    vi.mocked(useRoute).mockReturnValue(
      route as unknown as ReturnType<typeof useRoute>
    )
    vi.mocked(useRouter).mockReturnValue({
      push
    } as unknown as ReturnType<typeof useRouter>)
  })

  function openForm() {
    const Host = defineComponent({
      components: { ExerciseFormView },
      setup() {
        provideProgressRepository(repository)
      },
      template: '<ExerciseFormView />'
    })

    return mount(Host, {
      global: { plugins: [createAppI18n('en')] }
    })
  }

  it('guides a new athlete back to the two missing essentials', async () => {
    const form = openForm()

    await form.get('form').trigger('submit')

    expect(form.text()).toContain('Enter an exercise name.')
    expect(form.text()).toContain('positive whole number')
    expect(repository.createExercise).not.toHaveBeenCalled()
  })

  it('turns a name and daily target into a new active quest', async () => {
    const form = openForm()
    const inputs = form.findAll('input')

    await inputs[0]?.setValue('Push-ups')
    await inputs[1]?.setValue('100')
    await form.get('form').trigger('submit')
    await flushPromises()

    expect(repository.createExercise).toHaveBeenCalledWith(
      { name: 'Push-ups', dailyGoal: 100 },
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    )
    expect(push).toHaveBeenCalledWith('/')
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
    vi.mocked(repository.getExercise).mockResolvedValue(exercise)
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
    expect(repository.archiveExercise).toHaveBeenCalledWith(
      'pull-ups',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    )
    expect(push).toHaveBeenCalledWith('/')
  })
})
