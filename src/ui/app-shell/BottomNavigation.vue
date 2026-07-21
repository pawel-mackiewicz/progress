<script setup lang="ts">
import { House, type LucideIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  SHELL_BOTTOM_NAVIGATION_ITEMS,
  type ShellBottomNavigationIconName,
  type ShellBottomNavigationItem
} from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import type { AppRouteName } from '@/ui/router'
import { RouterLink, useRoute } from '@/ui/router/runtime'

type BottomNavigationItem = ShellBottomNavigationItem & {
  active: boolean
  iconComponent: LucideIcon
  stateClasses: string
  label: string
}

const iconComponents: Record<ShellBottomNavigationIconName, LucideIcon> = {
  house: House
}

const activeBottomNavStateClasses = 'bg-primary text-on-primary'
const inactiveBottomNavStateClasses =
  'text-on-surface hover:bg-surface-container-low'

const route = useRoute()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const visible = computed(() => !route.meta.hideBottomNav)
const items = computed<BottomNavigationItem[]>(() =>
  SHELL_BOTTOM_NAVIGATION_ITEMS.map((item) => {
    const active = currentRouteName.value
      ? item.activeRouteNames.includes(currentRouteName.value)
      : false

    return {
      ...item,
      active,
      iconComponent: iconComponents[item.icon],
      label: t(item.labelKey),
      stateClasses: active
        ? activeBottomNavStateClasses
        : inactiveBottomNavStateClasses
    }
  })
)
</script>

<template>
  <nav
    v-if="visible"
    class="fixed bottom-0 left-0 z-40 flex h-20 w-full items-stretch justify-around border-t border-on-surface/10 bg-surface/95 pb-safe backdrop-blur-md"
    data-testid="bottom-navigation"
  >
    <RouterLink
      v-for="item in items"
      :key="item.id"
      :aria-current="item.active ? 'page' : undefined"
      class="flex w-full flex-col items-center justify-center gap-1 border-x border-on-surface/10 px-4 py-2 text-xs font-semibold transition-colors"
      :class="item.stateClasses"
      :data-testid="`bottom-navigation-${item.id}`"
      :to="item.to"
    >
      <component :is="item.iconComponent" aria-hidden="true" :size="22" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
