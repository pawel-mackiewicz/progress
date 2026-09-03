<script setup lang="ts">
import { Flame, Shield } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

const props = defineProps<{
  date: Date
  isDayComplete: boolean
  currentStreak: number
  availableShields: number
}>()

const { locale, t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const formattedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(props.date)
)
const streakCopy = computed(() =>
  props.currentStreak > 0
    ? t('home.streak', { count: props.currentStreak })
    : t('home.streakZero')
)
const shieldCopy = computed(() => {
  if (props.availableShields === 1) {
    return t('home.shieldOne')
  }

  if (props.availableShields === 2) {
    return t('home.shieldTwo')
  }

  return t('home.shieldZero')
})
</script>

<template>
  <section class="home-hero" aria-labelledby="home-title">
    <div>
      <p class="app-section-label">{{ t('home.eyebrow') }}</p>
      <h2 id="home-title" class="home-hero__title">
        {{ isDayComplete ? t('home.completeTitle') : t('home.title') }}
      </h2>
      <p class="home-hero__date">{{ formattedDate }}</p>
    </div>

    <div class="home-hero__stats">
      <div
        class="home-hero__streak"
        :class="{ 'home-hero__streak--active': currentStreak > 0 }"
      >
        <Flame aria-hidden="true" :size="24" :stroke-width="2.6" />
        <span>{{ streakCopy }}</span>
      </div>
      <div
        class="home-hero__shield"
        :class="{ 'home-hero__shield--active': availableShields > 0 }"
        data-testid="shield-balance"
      >
        <Shield aria-hidden="true" :size="22" :stroke-width="2.6" />
        <span>{{ shieldCopy }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  display: grid;
  gap: 1.2rem;
  padding: 0.5rem 0 0.2rem;
}

.home-hero__title {
  max-width: 12ch;
  margin: 0.35rem 0 0;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: clamp(2.45rem, 11vw, 4.8rem);
  line-height: 0.94;
  letter-spacing: -0.055em;
  text-wrap: balance;
}

.home-hero__date {
  margin: 0.85rem 0 0;
  color: var(--color-secondary);
  font-size: 0.9rem;
  text-transform: capitalize;
}

.home-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.home-hero__streak,
.home-hero__shield {
  display: flex;
  width: fit-content;
  min-height: 3rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--color-outline);
  border-radius: 1rem;
  color: var(--color-secondary);
  background: var(--color-surface-container-lowest);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 800;
}

.home-hero__streak--active {
  color: var(--color-accent-warm);
  border-color: rgb(from var(--color-accent-warm) r g b / 0.48);
  box-shadow: 0 0 1.3rem rgb(from var(--color-accent-warm) r g b / 0.13);
}

.home-hero__shield--active {
  color: var(--color-accent);
  border-color: rgb(from var(--color-accent) r g b / 0.48);
  box-shadow: 0 0 1.3rem rgb(from var(--color-accent) r g b / 0.13);
}

@media (min-width: 48rem) {
  .home-hero {
    grid-template-columns: 1fr auto;
    align-items: end;
  }

  .home-hero__stats {
    justify-content: flex-end;
  }
}
</style>
