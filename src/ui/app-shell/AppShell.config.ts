import type { AppLocale } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'

type ShellTitleTranslator = (key: string) => string
export type ShellBottomNavigationIconName = 'house'

export type ShellBottomNavigationItem = {
  id: 'home'
  to: string
  icon: ShellBottomNavigationIconName
  labelKey: string
  activeRouteNames: ReadonlyArray<AppRouteName>
}

export const SHELL_LOCALE_OPTIONS = [
  { value: 'pl', label: 'PL' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: AppLocale; label: string }>

export const SHELL_ROUTE_TITLE_KEYS = {
  home: 'routes.home'
} as const satisfies Record<AppRouteName, string>

export const SHELL_BOTTOM_NAVIGATION_ITEMS: ReadonlyArray<ShellBottomNavigationItem> =
  [
    {
      id: 'home',
      to: '/',
      icon: 'house',
      labelKey: 'bottomNav.home',
      activeRouteNames: ['home']
    }
  ]

export function resolveShellRouteTitle({
  routeName,
  fallbackTitle,
  translate
}: {
  routeName: AppRouteName | null
  fallbackTitle: string
  translate: ShellTitleTranslator
}) {
  return routeName
    ? translate(SHELL_ROUTE_TITLE_KEYS[routeName])
    : fallbackTitle
}
