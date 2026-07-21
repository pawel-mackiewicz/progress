import { describe, expect, it } from 'vitest'

import {
  createAppRoutes,
  createNavigationItems,
  scrollToRouteTop
} from '@/ui/router'

describe('router', () => {
  it('opens the template on the neutral home route', () => {
    const routes = createAppRoutes()

    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      path: '/',
      name: 'home',
      meta: {
        showInMenu: true
      }
    })
  })

  it('offers the home route as the reusable menu item', () => {
    expect(createNavigationItems()).toEqual([
      {
        name: 'home',
        to: '/'
      }
    ])
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
