export type PwaUpdateCheckResult = 'update-found' | 'up-to-date'

let pwaRegistration: ServiceWorkerRegistration | undefined

export function rememberPwaRegistration(
  registration: ServiceWorkerRegistration | undefined
) {
  pwaRegistration = registration
}

export async function checkForPwaUpdate(): Promise<PwaUpdateCheckResult> {
  const registration = await resolvePwaRegistration()
  let updateFound = Boolean(registration.installing || registration.waiting)

  function handleUpdateFound() {
    updateFound = true
  }

  registration.addEventListener('updatefound', handleUpdateFound)

  try {
    const updatedRegistration = await registration.update()
    pwaRegistration = updatedRegistration
    updateFound ||= Boolean(
      updatedRegistration.installing || updatedRegistration.waiting
    )

    return updateFound ? 'update-found' : 'up-to-date'
  } finally {
    registration.removeEventListener('updatefound', handleUpdateFound)
  }
}

async function resolvePwaRegistration() {
  if (pwaRegistration) {
    return pwaRegistration
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.')
  }

  const registration = await navigator.serviceWorker.getRegistration()

  if (!registration) {
    throw new Error('The application service worker is not registered.')
  }

  pwaRegistration = registration

  return registration
}
