import { mount } from '@vue/test-utils'
import { reactive, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import Header from '@/ui/app-shell/Header.vue'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'

type MockRoute = {
  meta: Record<string, unknown>
  name: string
  path: string
  fullPath: string
  params: Record<string, string | string[]>
}

vi.mock('@/ui/composables/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('Header', () => {
  let isOnline: Ref<boolean>
  let mockRoute: MockRoute
  let mockRouterPush: Mock
  let mockRouterBack: Mock

  beforeEach(() => {
    isOnline = ref(true)
    mockRoute = reactive({
      meta: {},
      name: 'home',
      path: '/',
      fullPath: '/',
      params: {}
    }) as MockRoute
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()

    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline })
    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      back: mockRouterBack,
      replace: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)
  })

  function mountHeader() {
    const i18n = createAppI18n('en')

    return mount(Header, {
      global: {
        plugins: [i18n]
      }
    })
  }

  it('shows a first-time template user the neutral home title', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('.app-shell-header__title').text()).toBe('Home')
    expect(wrapper.find('[data-testid="shell-back-button"]').exists()).toBe(
      false
    )
  })

  it('warns the user when the installed PWA shell is offline', () => {
    isOnline.value = false

    const wrapper = mountHeader()

    expect(wrapper.text()).toContain('Offline')
  })

  it('uses the explicit back target when a detail route defines one', async () => {
    mockRoute.meta = {
      showBack: true,
      backTo: '/'
    }

    const wrapper = mountHeader()

    await wrapper.get('[data-testid="shell-back-button"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith('/')
    expect(mockRouterBack).not.toHaveBeenCalled()
  })

  it('fills route params in the explicit back target before routing', async () => {
    mockRoute.meta = {
      showBack: true,
      backTo: '/items/:itemId'
    }
    mockRoute.params = {
      itemId: 'draft item'
    }

    const wrapper = mountHeader()

    await wrapper.get('[data-testid="shell-back-button"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith('/items/draft%20item')
    expect(mockRouterBack).not.toHaveBeenCalled()
  })

  it('falls back to browser history when there is no explicit back target', async () => {
    mockRoute.meta = {
      showBack: true
    }

    const wrapper = mountHeader()

    await wrapper.get('[data-testid="shell-back-button"]').trigger('click')

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
