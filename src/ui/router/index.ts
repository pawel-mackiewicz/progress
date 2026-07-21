import type { RouteRecordRaw, RouterOptions } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import HomeView from '@/ui/views/HomeView.vue'

type AppRouteMeta = {
  showBack?: boolean
  hideBottomNav?: boolean
  backTo?: string
  showInMenu?: boolean
}

export type AppRouteName = 'home'

type AppRoute = RouteRecordRaw & {
  name: AppRouteName
  path: string
  meta: AppRouteMeta
}

export type NavigationItem = {
  name: AppRouteName
  to: string
}

const baseRoutes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      showInMenu: true
    }
  }
] satisfies AppRoute[]

export function createAppRoutes(): AppRoute[] {
  return [...baseRoutes]
}

export function createNavigationItems(): NavigationItem[] {
  return createAppRoutes().flatMap((route) => {
    return route.meta.showInMenu
      ? [
          {
            name: route.name,
            to: route.path
          }
        ]
      : []
  })
}

export const scrollToRouteTop: NonNullable<RouterOptions['scrollBehavior']> = (
  _to,
  _from,
  savedPosition
) => savedPosition ?? { left: 0, top: 0 }

export function createAppRouter() {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: createAppRoutes(),
    scrollBehavior: scrollToRouteTop
  })
}

const router = createAppRouter()

export default router
