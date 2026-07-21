<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'

const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})
const appVersion = __APP_VERSION__
</script>

<template>
  <section class="home-view" aria-labelledby="home-title">
    <p class="app-section-label">{{ t('home.eyebrow') }}</p>
    <h2 id="home-title" class="home-view__title">
      {{ t('home.title') }}
    </h2>
    <p class="home-view__body">
      {{ t('home.body') }}
    </p>

    <dl class="home-view__status-list">
      <div class="home-view__status-item">
        <dt>{{ t('home.versionLabel') }}</dt>
        <dd>{{ appVersion }}</dd>
      </div>
      <div class="home-view__status-item">
        <dt>{{ t('home.pwaLabel') }}</dt>
        <dd>{{ t('home.pwaValue') }}</dd>
      </div>
      <div class="home-view__status-item">
        <dt>{{ t('home.routerLabel') }}</dt>
        <dd>{{ t('home.routerValue') }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: calc(100vh - 11.5rem);
  gap: 1rem;
  text-align: center;
}

.home-view__title {
  max-width: 14ch;
  margin: 0;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
}

.home-view__body {
  max-width: 34rem;
  margin: 0;
  color: var(--color-secondary);
  font-size: 1rem;
  line-height: 1.6;
}

.home-view__status-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  width: min(100%, 22rem);
  margin: 1rem 0 0;
}

.home-view__status-item {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  min-height: 5rem;
  padding: 1rem;
  border: 1px solid var(--color-outline);
  border-radius: 0.5rem;
  background: var(--color-surface-container-lowest);
}

.home-view__status-item dt {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
}

.home-view__status-item dd {
  margin: 0;
  color: var(--color-primary);
  font-weight: 700;
}

@media (min-width: 48rem) {
  .home-view__title {
    font-size: 3.5rem;
  }
}
</style>
