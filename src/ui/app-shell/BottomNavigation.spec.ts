import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BottomNavigation from '@/ui/app-shell/BottomNavigation.vue'
import { createAppI18n } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'
import { useRoute } from '@/ui/router/runtime'

type MockRoute = {
  meta: Record<string, unknown>
  name: AppRouteName
  path: string
  fullPath: string
}

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: vi.fn()
}))

describe('BottomNavigation', () => {
  let mockRoute: MockRoute

  beforeEach(() => {
    mockRoute = reactive({
      meta: {},
      name: 'home',
      path: '/',
      fullPath: '/'
    }) as MockRoute

    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )
  })

  function mountBottomNavigation() {
    const i18n = createAppI18n('en')

    return mount(BottomNavigation, {
      global: {
        plugins: [i18n]
      }
    })
  }

  it('shows a mobile user the home tab as the active template route', () => {
    const wrapper = mountBottomNavigation()
    const homeLink = wrapper.get('a[href="/"]')

    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      true
    )
    expect(homeLink.attributes('aria-current')).toBe('page')
    expect(homeLink.classes()).toContain('bg-primary')
    expect(homeLink.text()).toContain('Home')
  })

  it('hides when a future route asks for full-screen content', () => {
    mockRoute.meta = {
      hideBottomNav: true
    }

    const wrapper = mountBottomNavigation()

    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      false
    )
  })
})
