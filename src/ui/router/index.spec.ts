import { describe, expect, it } from 'vitest'

import { createAppRoutes, scrollToRouteTop } from '@/ui/router'

describe('router', () => {
  it('opens the athlete on today and keeps both exercise forms one back tap away', () => {
    const routes = createAppRoutes()

    expect(routes).toHaveLength(3)
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/',
          name: 'home',
          meta: {}
        }),
        expect.objectContaining({
          path: '/exercises/new',
          name: 'exercise-new',
          meta: { showBack: true, backTo: '/' }
        }),
        expect.objectContaining({
          path: '/exercises/:exerciseId/edit',
          name: 'exercise-edit',
          meta: { showBack: true, backTo: '/' }
        })
      ])
    )
  })

  it('starts a fresh route at the top while preserving browser history scroll restores', () => {
    expect(scrollToRouteTop({} as never, {} as never, null)).toEqual({
      left: 0,
      top: 0
    })
    expect(
      scrollToRouteTop({} as never, {} as never, {
        left: 0,
        top: 420
      })
    ).toEqual({
      left: 0,
      top: 420
    })
  })
})
