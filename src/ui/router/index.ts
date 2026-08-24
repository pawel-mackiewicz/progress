import type { RouteRecordRaw, RouterOptions } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import HomeView from '@/ui/views/HomeView.vue'
import ExerciseFormView from '@/ui/views/ExerciseFormView.vue'

type AppRouteMeta = {
  showBack?: boolean
  backTo?: string
}

export type AppRouteName = 'home' | 'exercise-new' | 'exercise-edit'

type AppRoute = RouteRecordRaw & {
  name: AppRouteName
  path: string
  meta: AppRouteMeta
}

const baseRoutes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {}
  },
  {
    path: '/exercises/new',
    name: 'exercise-new',
    component: ExerciseFormView,
    meta: {
      showBack: true,
      backTo: '/'
    }
  },
  {
    path: '/exercises/:exerciseId/edit',
    name: 'exercise-edit',
    component: ExerciseFormView,
    meta: {
      showBack: true,
      backTo: '/'
    }
  }
] satisfies AppRoute[]

export function createAppRoutes(): AppRoute[] {
  return [...baseRoutes]
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
