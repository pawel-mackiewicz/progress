import type { AppServices } from '@/appServices'
import { inject, type App, type InjectionKey } from 'vue'

export type UiAppServices = Pick<AppServices, 'queries' | 'useCases'>

export const appServicesKey: InjectionKey<UiAppServices> =
  Symbol('app-services')

export function provideAppServices(
  app: Pick<App, 'provide'>,
  services: UiAppServices
) {
  app.provide(appServicesKey, services)
}

export function createAppServicesProvides(services: UiAppServices) {
  return {
    [appServicesKey as symbol]: services
  }
}

export function useAppServices(): UiAppServices {
  const services = inject(appServicesKey)

  if (!services) {
    throw new Error('App services were not provided.')
  }

  return services
}
