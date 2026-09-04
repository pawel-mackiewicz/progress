import { useRegisterSW } from 'virtual:pwa-register/vue'

import { rememberPwaRegistration } from './update'

type RegisterPwaOptions = NonNullable<Parameters<typeof useRegisterSW>[0]>

export function registerPwa(options: RegisterPwaOptions = {}) {
  return useRegisterSW({
    ...options,
    onRegisteredSW(swScriptUrl, registration) {
      rememberPwaRegistration(registration)

      if (options.onRegisteredSW) {
        options.onRegisteredSW(swScriptUrl, registration)
        return
      }

      options.onRegistered?.(registration)
    }
  })
}
