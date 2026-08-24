<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Header from '@/ui/app-shell/Header.vue'
import RouteTransition from '@/ui/app-shell/RouteTransition.vue'
import { resolveShellRouteTitle } from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import type { AppRouteName } from '@/ui/router'
import { useRoute } from '@/ui/router/runtime'

const route = useRoute()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})

const appName = computed(() => t('app.name'))
const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: appName.value,
    translate: t
  })
)

watch(
  [title, appName],
  ([nextTitle, nextAppName]) => {
    document.title =
      nextTitle === nextAppName ? nextAppName : `${nextTitle} - ${nextAppName}`
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-canvas">
    <Header />

    <main class="app-shell-main">
      <RouteTransition />
    </main>
  </div>
</template>

<style scoped>
.app-shell-main {
  min-height: 100vh;
  width: min(100%, 56rem);
  margin-inline: auto;
  padding: 5.5rem max(1rem, env(safe-area-inset-right))
    max(3rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
}

@media (min-width: 48rem) {
  .app-shell-main {
    padding-inline: 2rem;
  }
}
</style>
