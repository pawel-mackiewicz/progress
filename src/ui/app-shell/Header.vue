<script setup lang="ts">
import { ArrowLeft, WifiOff } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { resolveShellRouteTitle } from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import type { AppRouteName } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'

defineOptions({
  name: 'AppShellHeader'
})

const route = useRoute()
const router = useRouter()
const { isOnline } = useNetworkStatus()
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
const offlineLabel = computed(() => t('network.offline'))
const showBack = computed(() => Boolean(route.meta.showBack))
const showOfflineBadge = computed(() => !isOnline.value)

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

    <span v-if="showOfflineBadge" class="app-shell-header__offline-badge">
      <WifiOff aria-hidden="true" :size="14" />
      {{ offlineLabel }}
    </span>
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
  border-bottom: 1px solid rgb(from var(--color-on-surface) r g b / 0.1);
  background: rgb(from var(--color-surface) r g b / 0.94);
  backdrop-filter: blur(12px);
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
  color: var(--color-primary);
  font-family: var(--font-headline);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell-header__offline-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgb(from var(--color-danger) r g b / 0.25);
  background: rgb(from var(--color-danger) r g b / 0.08);
  padding: 0.35rem 0.55rem;
  color: var(--color-danger);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
}
</style>
