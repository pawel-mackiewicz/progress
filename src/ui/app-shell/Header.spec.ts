import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import Header from '@/ui/app-shell/Header.vue'
import { createAppI18n } from '@/ui/i18n'
import { checkForPwaUpdate } from '@/ui/pwa/update'
import { useRoute, useRouter } from '@/ui/router/runtime'

type MockRoute = {
  meta: Record<string, unknown>
  name: string
  path: string
  fullPath: string
  params: Record<string, string | string[]>
}

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

vi.mock('@/ui/pwa/update', () => ({
  checkForPwaUpdate: vi.fn()
}))

describe('Header', () => {
  let mockRoute: MockRoute
  let mockRouterPush: Mock
  let mockRouterBack: Mock

  beforeEach(() => {
    mockRoute = reactive({
      meta: {},
      name: 'home',
      path: '/',
      fullPath: '/',
      params: {}
    }) as MockRoute
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()
    vi.mocked(checkForPwaUpdate).mockReset()
    vi.mocked(checkForPwaUpdate).mockResolvedValue('up-to-date')

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

  it('welcomes the athlete with the product name and no unnecessary back button', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('.app-shell-header__title').text()).toBe('Progress')
    expect(wrapper.find('[data-testid="shell-back-button"]').exists()).toBe(
      false
    )
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('EN')
  })

  it('switches the whole app language and remembers the athlete’s choice', async () => {
    const wrapper = mountHeader()
    const polishButton = wrapper
      .findAll('.app-shell-header__locale-button')
      .find((button) => button.text() === 'PL')

    await polishButton?.trigger('click')

    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('PL')
    expect(window.localStorage.getItem('progress:locale')).toBe('pl')
  })

  it('checks for a fresh app version and reassures the athlete when they are current', async () => {
    const wrapper = mountHeader()
    const updateButton = wrapper.get('[data-testid="shell-update-button"]')

    await updateButton.trigger('click')
    await flushPromises()

    expect(checkForPwaUpdate).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[role="status"]').text()).toBe('You’re up to date')
    expect(updateButton.attributes('aria-label')).toBe('Check for updates')
  })

  it('keeps another update check from starting while the first one is underway', async () => {
    let finishCheck: ((result: 'up-to-date') => void) | undefined
    vi.mocked(checkForPwaUpdate).mockReturnValue(
      new Promise((resolve) => {
        finishCheck = resolve
      })
    )
    const wrapper = mountHeader()
    const updateButton = wrapper.get('[data-testid="shell-update-button"]')

    await updateButton.trigger('click')

    expect(updateButton.attributes('disabled')).toBeDefined()
    expect(updateButton.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toBe('Checking for updates…')

    await updateButton.trigger('click')
    expect(checkForPwaUpdate).toHaveBeenCalledTimes(1)

    finishCheck?.('up-to-date')
    await flushPromises()

    expect(updateButton.attributes('disabled')).toBeUndefined()
  })

  it('explains when the app cannot check for an update', async () => {
    vi.mocked(checkForPwaUpdate).mockRejectedValue(
      new Error('The service worker is unavailable.')
    )
    const wrapper = mountHeader()

    await wrapper.get('[data-testid="shell-update-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe(
      'Unable to check for updates'
    )
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
