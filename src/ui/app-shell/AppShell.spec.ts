import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AppShell from '@/ui/app-shell/AppShell.vue'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'

type MockRoute = {
  meta: Record<string, unknown>
  name: string
  path: string
  fullPath: string
  params: Record<string, string | string[]>
}

vi.mock('@/ui/app-shell/RouteTransition.vue', () => ({
  default: {
    template:
      '<section data-testid="route-view">Today training screen</section>'
  }
}))

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('AppShell', () => {
  let mockRoute: MockRoute

  beforeEach(() => {
    mockRoute = reactive({
      meta: {},
      name: 'home',
      path: '/',
      fullPath: '/',
      params: {}
    }) as MockRoute

    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      back: vi.fn(),
      replace: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)
  })

  function mountShell() {
    const i18n = createAppI18n('en')

    return mount(AppShell, {
      global: {
        plugins: [i18n]
      }
    })
  }

  it('frames today’s training without a redundant one-item bottom bar', () => {
    const wrapper = mountShell()

    expect(wrapper.get('.app-shell-header__title').text()).toBe('Progress')
    expect(wrapper.get('[data-testid="route-view"]').text()).toBe(
      'Today training screen'
    )
    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      false
    )
  })

  it('keeps the browser title aligned with the current route and app name', async () => {
    mountShell()
    await flushPromises()

    expect(document.title).toBe('Progress')
  })

  it('keeps the shell navigation-free on focused form routes too', () => {
    mockRoute.name = 'exercise-new'
    mockRoute.meta = {
      showBack: true,
      backTo: '/'
    }

    const wrapper = mountShell()

    expect(wrapper.find('[data-testid="shell-back-button"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      false
    )
  })
})
