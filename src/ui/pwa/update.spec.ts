import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkForPwaUpdate, rememberPwaRegistration } from '@/ui/pwa/update'

type RegistrationDouble = {
  installing: ServiceWorker | null
  waiting: ServiceWorker | null
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

describe('manual PWA update checks', () => {
  beforeEach(() => {
    rememberPwaRegistration(undefined)
  })

  function rememberRegistrationThatStaysCurrent() {
    const registration: RegistrationDouble = {
      installing: null,
      waiting: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      update: vi.fn()
    }
    registration.update.mockResolvedValue(registration)
    rememberPwaRegistration(
      registration as unknown as ServiceWorkerRegistration
    )

    return registration
  }

  it('asks the registered service worker for the newest app version', async () => {
    const registration = rememberRegistrationThatStaysCurrent()

    const result = await checkForPwaUpdate()

    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(result).toBe('up-to-date')
    expect(registration.removeEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function)
    )
  })

  it('recognizes a new version when the service worker starts installing it', async () => {
    let announceUpdate: (() => void) | undefined
    const registration: RegistrationDouble = {
      installing: null,
      waiting: null,
      addEventListener: vi.fn((eventName, listener) => {
        if (eventName === 'updatefound') {
          announceUpdate = listener as () => void
        }
      }),
      removeEventListener: vi.fn(),
      update: vi.fn()
    }
    registration.update.mockImplementation(async () => {
      announceUpdate?.()
      return registration
    })
    rememberPwaRegistration(
      registration as unknown as ServiceWorkerRegistration
    )

    const result = await checkForPwaUpdate()

    expect(result).toBe('update-found')
  })

  it('stops listening when the browser cannot complete its update check', async () => {
    const registration = rememberRegistrationThatStaysCurrent()
    registration.update.mockRejectedValue(new Error('Network unavailable'))

    await expect(checkForPwaUpdate()).rejects.toThrow('Network unavailable')
    expect(registration.removeEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function)
    )
  })
})
