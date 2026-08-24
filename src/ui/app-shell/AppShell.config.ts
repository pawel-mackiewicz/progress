import type { AppLocale } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'

type ShellTitleTranslator = (key: string) => string

export const SHELL_LOCALE_OPTIONS = [
  { value: 'pl', label: 'PL' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: AppLocale; label: string }>

export const SHELL_ROUTE_TITLE_KEYS = {
  home: 'routes.home',
  'exercise-new': 'routes.exerciseNew',
  'exercise-edit': 'routes.exerciseEdit'
} as const satisfies Record<AppRouteName, string>

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
