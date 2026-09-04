<script setup lang="ts">
import { ArrowLeft, Check, CloudSync } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  resolveShellRouteTitle,
  SHELL_LOCALE_OPTIONS
} from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import { persistLocale, type AppLocale } from '@/ui/i18n'
import { checkForPwaUpdate } from '@/ui/pwa/update'
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
type UpdateStatus =
  'idle' | 'checking' | 'update-found' | 'up-to-date' | 'error'
const UP_TO_DATE_DISMISS_DELAY_MS = 3_000
const updateStatus = ref<UpdateStatus>('idle')
let dismissUpToDateTimer: ReturnType<typeof setTimeout> | undefined
const isCheckingForUpdates = computed(() => updateStatus.value === 'checking')
const updateStatusLabel = computed(() => {
  switch (updateStatus.value) {
    case 'checking':
      return t('header.updates.checking')
    case 'update-found':
      return t('header.updates.found')
    case 'up-to-date':
      return t('header.updates.upToDate')
    case 'error':
      return t('header.updates.error')
    default:
      return ''
  }
})

function selectLocale(nextLocale: AppLocale) {
  locale.value = nextLocale
  persistLocale(nextLocale)
}

function clearUpToDateDismissal() {
  if (dismissUpToDateTimer !== undefined) {
    clearTimeout(dismissUpToDateTimer)
    dismissUpToDateTimer = undefined
  }
}

async function handleUpdateCheck() {
  if (isCheckingForUpdates.value) {
    return
  }

  clearUpToDateDismissal()
  updateStatus.value = 'checking'

  try {
    updateStatus.value = await checkForPwaUpdate()

    if (updateStatus.value === 'up-to-date') {
      dismissUpToDateTimer = setTimeout(() => {
        updateStatus.value = 'idle'
        dismissUpToDateTimer = undefined
      }, UP_TO_DATE_DISMISS_DELAY_MS)
    }
  } catch {
    updateStatus.value = 'error'
  }
}

onBeforeUnmount(clearUpToDateDismissal)

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

    <div class="app-shell-header__actions">
      <button
        class="app-shell-header__icon-button"
        data-testid="shell-update-button"
        type="button"
        :aria-busy="isCheckingForUpdates"
        :aria-label="
          isCheckingForUpdates
            ? t('header.updates.checking')
            : t('header.updates.check')
        "
        :disabled="isCheckingForUpdates"
        :title="t('header.updates.check')"
        @click="handleUpdateCheck"
      >
        <CloudSync
          aria-hidden="true"
          :class="{
            'app-shell-header__update-icon--checking': isCheckingForUpdates
          }"
          :size="20"
        />
      </button>

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

      <Transition name="update-status">
        <p
          v-if="updateStatusLabel"
          class="app-shell-header__update-status"
          :class="{
            'app-shell-header__update-status--success':
              updateStatus === 'up-to-date'
          }"
          role="status"
          aria-live="polite"
        >
          <span
            v-if="updateStatus === 'up-to-date'"
            class="app-shell-header__update-status-icon"
            aria-hidden="true"
          >
            <Check :size="14" :stroke-width="3" />
          </span>
          <span>{{ updateStatusLabel }}</span>
        </p>
      </Transition>
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

.app-shell-header__icon-button:disabled {
  cursor: progress;
  opacity: 0.78;
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

.app-shell-header__actions {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.35rem;
}

.app-shell-header__update-icon--checking {
  animation: app-shell-update-spin 850ms linear infinite;
}

.app-shell-header__update-status {
  position: absolute;
  top: calc(100% + 0.8rem);
  right: 0;
  display: flex;
  width: max-content;
  max-width: min(18rem, calc(100vw - 2rem));
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgb(from var(--color-primary) r g b / 0.24);
  border-radius: 999px;
  color: var(--color-on-surface);
  background: linear-gradient(
    135deg,
    rgb(from var(--color-surface-container-lowest) r g b / 0.98),
    rgb(from var(--color-surface-container-low) r g b / 0.96)
  );
  box-shadow:
    0 0.65rem 1.8rem rgb(0 0 0 / 0.32),
    inset 0 1px rgb(255 255 255 / 0.05);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  transform-origin: top right;
  backdrop-filter: blur(12px);
}

.app-shell-header__update-status--success {
  border-color: rgb(from var(--color-success) r g b / 0.38);
  box-shadow:
    0 0.65rem 1.8rem rgb(0 0 0 / 0.32),
    0 0 1.4rem rgb(from var(--color-success) r g b / 0.1),
    inset 0 1px rgb(255 255 255 / 0.07);
}

.app-shell-header__update-status-icon {
  display: grid;
  width: 1.4rem;
  height: 1.4rem;
  flex: none;
  place-items: center;
  border-radius: 999px;
  color: var(--color-surface);
  background: var(--color-success);
  box-shadow: 0 0 0.9rem rgb(from var(--color-success) r g b / 0.42);
  animation: app-shell-status-icon-pop 420ms cubic-bezier(0.2, 1.55, 0.4, 1)
    both;
}

.update-status-enter-active {
  transition:
    opacity 180ms ease-out,
    transform 360ms cubic-bezier(0.2, 1.35, 0.4, 1);
}

.update-status-leave-active {
  transition:
    opacity 180ms ease-in,
    transform 220ms ease-in,
    filter 180ms ease-in;
}

.update-status-enter-from {
  opacity: 0;
  transform: translateY(-0.55rem) scale(0.88);
}

.update-status-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-0.3rem) scale(0.96);
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

@keyframes app-shell-update-spin {
  to {
    transform: rotate(1turn);
  }
}

@keyframes app-shell-status-icon-pop {
  0% {
    opacity: 0;
    transform: scale(0.2) rotate(-24deg);
  }

  70% {
    opacity: 1;
    transform: scale(1.15) rotate(4deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell-header__update-icon--checking,
  .app-shell-header__update-status-icon {
    animation: none;
  }

  .update-status-enter-active,
  .update-status-leave-active {
    transition: none;
  }
}
</style>
