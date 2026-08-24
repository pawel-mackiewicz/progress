<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  resolveShellRouteTitle,
  SHELL_LOCALE_OPTIONS
} from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import { persistLocale, type AppLocale } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'

defineOptions({
  name: 'AppShellHeader'
})

const route = useRoute()
const router = useRouter()
const { locale } = useI18n({ useScope: 'global' })
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: t('app.name'),
    translate: t
  })
)
const backButtonLabel = computed(() => t('header.back'))
const showBack = computed(() => Boolean(route.meta.showBack))

function selectLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
  persistLocale(nextLocale)
}

function handleBack() {
  const backTo =
    typeof route.meta.backTo === 'string'
      ? resolveBackTarget(route.meta.backTo)
      : null

  if (backTo) {
    router.push(backTo)
    return
  }

  router.back()
}

function resolveBackTarget(backTo: string): string | null {
  let hasMissingParam = false

  const resolvedBackTo = backTo.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    const param = route.params[key]
    const value = Array.isArray(param) ? param[0] : param

    if (!value) {
      hasMissingParam = true
      return ''
    }

    return encodeURIComponent(String(value))
  })

  return hasMissingParam ? null : resolvedBackTo
}
</script>

<template>
  <header class="app-shell-header">
    <div class="app-shell-header__leading">
      <button
        v-if="showBack"
        class="app-shell-header__icon-button"
        data-testid="shell-back-button"
        type="button"
        :aria-label="backButtonLabel"
        @click="handleBack"
      >
        <ArrowLeft aria-hidden="true" :size="22" />
      </button>
      <h1 class="app-shell-header__title">
        {{ title }}
      </h1>
    </div>

    <div
      class="app-shell-header__locale"
      role="group"
      :aria-label="t('header.language')"
    >
      <button
        v-for="option in SHELL_LOCALE_OPTIONS"
        :key="option.value"
        class="app-shell-header__locale-button"
        :class="{
          'app-shell-header__locale-button--active': locale === option.value
        }"
        type="button"
        :aria-pressed="locale === option.value"
        @click="selectLocale(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-shell-header {
  position: fixed;
  inset-inline: 0;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4rem;
  padding: 0.75rem max(1rem, env(safe-area-inset-right)) 0.75rem
    max(1rem, env(safe-area-inset-left));
  border-bottom: 1px solid rgb(from var(--color-primary) r g b / 0.18);
  background: rgb(from var(--color-surface) r g b / 0.86);
  box-shadow: 0 0 2rem rgb(from var(--color-primary) r g b / 0.08);
  backdrop-filter: blur(18px);
}

.app-shell-header__leading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.app-shell-header__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  border-radius: 999px;
  color: var(--color-on-surface);
  background: transparent;
  transition:
    transform 75ms ease,
    background-color 75ms ease;
}

.app-shell-header__icon-button:hover,
.app-shell-header__icon-button:focus-visible {
  background: var(--color-surface-container-low);
}

.app-shell-header__icon-button:active {
  transform: scale(0.96);
}

.app-shell-header__icon-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.app-shell-header__title {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell-header__locale {
  display: flex;
  flex: none;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid var(--color-outline);
  border-radius: 999px;
  background: var(--color-surface-container-lowest);
}

.app-shell-header__locale-button {
  min-width: 2.4rem;
  min-height: 2.4rem;
  padding: 0.35rem;
  border-radius: 999px;
  color: var(--color-secondary);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 800;
}

.app-shell-header__locale-button--active {
  color: var(--color-surface);
  background: var(--color-primary);
  box-shadow: 0 0 1rem rgb(from var(--color-primary) r g b / 0.42);
}

.app-shell-header__locale-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
