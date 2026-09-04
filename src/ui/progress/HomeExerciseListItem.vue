<script setup lang="ts">
import { CheckCircle2, ChevronDown, Circle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import type { DashboardExercise, RepIncrement } from '@/progress/types'
import ExerciseCard from '@/ui/progress/ExerciseCard.vue'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

defineProps<{
  exercise: DashboardExercise
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  add: [amount: RepIncrement]
  edit: []
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})
</script>

<template>
  <li
    class="home-exercises__item"
    :class="{
      'home-exercises__item--complete': exercise.isComplete,
      'home-exercises__item--expanded': expanded
    }"
  >
    <button
      class="home-exercises__toggle"
      type="button"
      :aria-controls="`exercise-details-${exercise.id}`"
      :aria-expanded="expanded"
      :aria-label="
        t(expanded ? 'home.collapseExercise' : 'home.expandExercise', {
          name: exercise.name,
          status: t(
            exercise.isComplete
              ? 'home.exerciseComplete'
              : 'home.exerciseIncomplete'
          )
        })
      "
      :data-testid="`exercise-toggle-${exercise.id}`"
      @click="emit('toggle')"
    >
      <span
        class="home-exercises__status-icon"
        :class="{
          'home-exercises__status-icon--complete': exercise.isComplete
        }"
        :data-testid="`exercise-status-${exercise.id}`"
        aria-hidden="true"
      >
        <CheckCircle2
          v-if="exercise.isComplete"
          :size="23"
          :stroke-width="2.5"
        />
        <Circle v-else :size="23" :stroke-width="2.2" />
      </span>
      <span class="home-exercises__summary">
        <strong>{{ exercise.name }}</strong>
      </span>
      <ChevronDown
        class="home-exercises__chevron"
        :class="{ 'home-exercises__chevron--expanded': expanded }"
        aria-hidden="true"
        :size="22"
      />
    </button>

    <ExerciseCard
      v-if="expanded"
      :id="`exercise-details-${exercise.id}`"
      :exercise="exercise"
      @add="emit('add', $event)"
      @edit="emit('edit')"
    />
  </li>
</template>

<style scoped>
.home-exercises__item {
  display: grid;
  gap: 0;
}

.home-exercises__toggle {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 4rem;
  overflow: hidden;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--color-outline);
  border-radius: 1rem;
  color: var(--color-on-surface);
  background: var(--color-surface-container-lowest);
  text-align: start;
  box-shadow: 0 0.45rem 1.2rem rgb(0 0 0 / 0.14);
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 90ms ease;
}

.home-exercises__item--expanded .home-exercises__toggle::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.22rem;
  background: var(--color-primary);
  box-shadow: 0 0 1rem var(--color-primary);
  content: '';
}

.home-exercises__item--complete.home-exercises__item--expanded,
.home-exercises__toggle::before {
  background: var(--color-success);
  box-shadow: 0 0 1rem var(--color-success);
}

.home-exercises__toggle:hover,
.home-exercises__toggle:focus-visible {
  border-color: var(--color-primary);
  background: rgb(from var(--color-primary) r g b / 0.07);
}

.home-exercises__toggle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.home-exercises__toggle:active {
  transform: scale(0.985);
}

.home-exercises__item--complete .home-exercises__toggle {
  border-color: rgb(from var(--color-success) r g b / 0.55);
}

.home-exercises__item--expanded .home-exercises__toggle {
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.home-exercises__item--expanded :deep(.exercise-card) {
  border-top: 0;
  border-start-start-radius: 0;
  border-start-end-radius: 0;
  transform-origin: top;
  animation: exercise-card-open 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-exercises__status-icon {
  display: inline-flex;
  color: var(--color-primary);
}

.home-exercises__status-icon--complete {
  color: var(--color-success);
}

.home-exercises__summary {
  min-width: 0;
}

.home-exercises__summary strong {
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-exercises__chevron {
  color: var(--color-secondary);
  transition: transform 180ms ease;
}

.home-exercises__chevron--expanded {
  transform: rotate(180deg);
}

@keyframes exercise-card-open {
  from {
    opacity: 0;
    transform: translateY(-0.35rem) scaleY(0.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-exercises__toggle,
  .home-exercises__chevron {
    transition: none;
  }

  .home-exercises__item--expanded :deep(.exercise-card) {
    animation: none;
  }
}
</style>
