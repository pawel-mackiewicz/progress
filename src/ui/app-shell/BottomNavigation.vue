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
  label: string
}

const iconComponents: Record<ShellBottomNavigationIconName, LucideIcon> = {
  house: House
}

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
      label: t(item.labelKey)
    }
  })
)
</script>

<template>
  <nav v-if="visible" class="bottom-navigation" data-testid="bottom-navigation">
    <RouterLink
      v-for="item in items"
      :key="item.id"
      :aria-current="item.active ? 'page' : undefined"
      class="bottom-navigation__link"
      :class="{ 'bottom-navigation__link--active': item.active }"
      :data-testid="`bottom-navigation-${item.id}`"
      :to="item.to"
    >
      <component :is="item.iconComponent" aria-hidden="true" :size="22" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-navigation {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  width: 100%;
  height: 5rem;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid rgb(from var(--color-on-surface) r g b / 0.1);
  background: rgb(from var(--color-surface) r g b / 0.95);
  backdrop-filter: blur(12px);
}

.bottom-navigation__link {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-inline: 1px solid rgb(from var(--color-on-surface) r g b / 0.1);
  color: var(--color-on-surface);
  font-size: 0.75rem;
  font-weight: 600;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.bottom-navigation__link:hover,
.bottom-navigation__link:focus-visible {
  background: var(--color-surface-container-low);
}

.bottom-navigation__link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.bottom-navigation__link--active {
  color: var(--color-on-primary);
  background: var(--color-primary);
}

.bottom-navigation__link--active:hover,
.bottom-navigation__link--active:focus-visible {
  background: var(--color-primary);
}
</style>
