<script setup lang="ts">
import { Check, ChevronUp, Pencil, Zap } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import { REP_INCREMENTS, type DashboardExercise } from '@/progress/types'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

defineProps<{
  exercise: DashboardExercise
  collapsible?: boolean
}>()

const emit = defineEmits<{
  add: [amount: (typeof REP_INCREMENTS)[number]]
  collapse: []
  edit: []
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})
</script>

<template>
  <article
    class="exercise-card"
    :class="{ 'exercise-card--complete': exercise.isComplete }"
    :data-testid="`exercise-card-${exercise.id}`"
  >
    <div
      class="exercise-card__header"
      :class="{ 'exercise-card__header--collapsible': collapsible }"
    >
      <button
        v-if="collapsible"
        class="exercise-card__summary exercise-card__summary--collapsible"
        type="button"
        :aria-label="t('card.collapse', { name: exercise.name })"
        :data-testid="`exercise-collapse-${exercise.id}`"
        @click="emit('collapse')"
      >
        <span class="exercise-card__name-row">
          <span v-if="exercise.isComplete" class="exercise-card__check">
            <Check aria-hidden="true" :size="16" :stroke-width="3" />
          </span>
          <span class="exercise-card__name">{{ exercise.name }}</span>
        </span>
        <span class="exercise-card__status">
          <template v-if="exercise.isComplete">
            {{ t('card.completed') }}
          </template>
          <template v-else>
            {{ t('card.remaining', { count: exercise.remainingReps }) }}
          </template>
        </span>
        <ChevronUp
          class="exercise-card__header-chevron"
          aria-hidden="true"
          :size="20"
          :stroke-width="2.5"
        />
      </button>

      <div v-else class="exercise-card__summary">
        <div class="exercise-card__name-row">
          <span v-if="exercise.isComplete" class="exercise-card__check">
            <Check aria-hidden="true" :size="16" :stroke-width="3" />
          </span>
          <h3 class="exercise-card__name">{{ exercise.name }}</h3>
        </div>
        <p class="exercise-card__status">
          <template v-if="exercise.isComplete">
            {{ t('card.completed') }}
          </template>
          <template v-else>
            {{ t('card.remaining', { count: exercise.remainingReps }) }}
          </template>
        </p>
      </div>

      <button
        class="exercise-card__icon-button exercise-card__edit"
        type="button"
        :aria-label="t('card.edit', { name: exercise.name })"
        @click="emit('edit')"
      >
        <Pencil aria-hidden="true" :size="18" />
      </button>
    </div>

    <div class="exercise-card__score-row">
      <strong class="exercise-card__score">{{ exercise.completedReps }}</strong>
      <span class="exercise-card__goal">/ {{ exercise.dailyGoal }}</span>
      <div class="exercise-card__history">
        <span class="exercise-card__history-item">
          {{ t('card.yesterday', { count: exercise.yesterdayReps }) }}
        </span>
        <span class="exercise-card__history-item">
          {{ t('card.previousMax', { count: exercise.previousMaxReps }) }}
        </span>
      </div>
    </div>

    <div
      class="exercise-card__progress"
      role="progressbar"
      :aria-label="
        t('card.progress', {
          name: exercise.name,
          current: exercise.completedReps,
          goal: exercise.dailyGoal
        })
      "
      :aria-valuemax="exercise.dailyGoal"
      :aria-valuenow="Math.min(exercise.completedReps, exercise.dailyGoal)"
      aria-valuemin="0"
    >
      <span
        class="exercise-card__progress-fill"
        :style="{ width: `${exercise.progressPercent}%` }"
      />
    </div>

    <div class="exercise-card__actions">
      <button
        v-for="amount in REP_INCREMENTS"
        :key="amount"
        class="exercise-card__add"
        type="button"
        :aria-label="
          t(
            'card.addReps',
            {
              count: amount,
              name: exercise.name
            },
            amount
          )
        "
        @click="emit('add', amount)"
      >
        <Zap v-if="amount === 10" aria-hidden="true" :size="15" />
        +{{ amount }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.exercise-card {
  position: relative;
  display: grid;
  gap: 1rem;
  overflow: hidden;
  padding: 1.15rem;
  border: 1px solid var(--color-outline);
  border-radius: 1.35rem;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 0.035), transparent 45%),
    var(--color-surface-container-lowest);
  box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.22);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 120ms ease;
}

.exercise-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.22rem;
  background: var(--color-primary);
  box-shadow: 0 0 1rem var(--color-primary);
  content: '';
}

.exercise-card--complete {
  border-color: rgb(from var(--color-success) r g b / 0.62);
  box-shadow:
    0 0 1.8rem rgb(from var(--color-success) r g b / 0.17),
    0 1rem 2.5rem rgb(0 0 0 / 0.26);
}

.exercise-card--complete::before {
  background: var(--color-success);
  box-shadow: 0 0 1.2rem var(--color-success);
}

.exercise-card__header,
.exercise-card__name-row,
.exercise-card__score-row,
.exercise-card__actions {
  display: flex;
  align-items: center;
}

.exercise-card__header {
  align-items: stretch;
  gap: 0.5rem;
}

.exercise-card__header--collapsible {
  position: relative;
  display: block;
  margin: -1.15rem -1.15rem 0;
}

.exercise-card__summary {
  min-width: 0;
  flex: 1;
}

.exercise-card__summary--collapsible {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-areas:
    'name chevron'
    'status chevron';
  grid-template-columns: minmax(0, 1fr) auto;
  align-content: center;
  column-gap: 0.65rem;
  width: 100%;
  min-height: 4.5rem;
  padding: 0.85rem 4.9rem 0.85rem 1.15rem;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: start;
}

.exercise-card__summary--collapsible::before {
  position: absolute;
  z-index: -1;
  inset: 0 0 -1rem;
  background:
    radial-gradient(
      85% 135% at 8% -30%,
      rgb(from var(--color-primary) r g b / 0.24),
      transparent 72%
    ),
    radial-gradient(
      75% 125% at 72% -45%,
      rgb(from var(--color-accent) r g b / 0.13),
      transparent 76%
    );
  pointer-events: none;
  content: '';
  transition: filter 140ms ease;
}

.exercise-card__summary--collapsible:hover::before,
.exercise-card__summary--collapsible:focus-visible::before {
  filter: brightness(1.18);
}

.exercise-card__summary--collapsible:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -3px;
}

.exercise-card__summary--collapsible:active::before {
  filter: brightness(1.3);
}

.exercise-card__summary--collapsible .exercise-card__name-row {
  grid-area: name;
  min-width: 0;
}

.exercise-card__summary--collapsible .exercise-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exercise-card__summary--collapsible .exercise-card__status {
  grid-area: status;
}

.exercise-card__header-chevron {
  grid-area: chevron;
  align-self: center;
  color: var(--color-primary);
  transition: transform 140ms ease;
}

.exercise-card__summary--collapsible:hover .exercise-card__header-chevron {
  transform: translateY(-0.1rem);
}

.exercise-card__header--collapsible .exercise-card__edit {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 1.15rem;
  transform: translateY(-50%);
}

.exercise-card--complete .exercise-card__summary--collapsible {
  background: transparent;
}

.exercise-card--complete .exercise-card__summary--collapsible::before {
  background:
    radial-gradient(
      85% 135% at 8% -30%,
      rgb(from var(--color-success) r g b / 0.22),
      transparent 72%
    ),
    radial-gradient(
      75% 125% at 72% -45%,
      rgb(from var(--color-primary) r g b / 0.11),
      transparent 76%
    );
}

.exercise-card--complete .exercise-card__header-chevron {
  color: var(--color-success);
}

.exercise-card__name-row {
  gap: 0.5rem;
}

.exercise-card__name {
  margin: 0;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: 1.25rem;
  line-height: 1.15;
}

.exercise-card__check {
  display: inline-flex;
  width: 1.55rem;
  height: 1.55rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-surface);
  background: var(--color-success);
  box-shadow: 0 0 1rem rgb(from var(--color-success) r g b / 0.65);
  animation: goal-pop 300ms ease-out;
}

.exercise-card__status {
  display: block;
  margin: 0.38rem 0 0;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.35;
}

.exercise-card--complete .exercise-card__status {
  color: var(--color-success);
}

.exercise-card__icon-button {
  display: inline-flex;
  min-width: 2.75rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-outline);
  border-radius: 0.9rem;
  color: var(--color-secondary);
  background: rgb(255 255 255 / 0.025);
}

.exercise-card__icon-button:hover,
.exercise-card__icon-button:focus-visible {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgb(from var(--color-primary) r g b / 0.08);
}

.exercise-card__score-row {
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.exercise-card__score {
  color: var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: clamp(2.1rem, 12vw, 3.5rem);
  line-height: 0.92;
  text-shadow: 0 0 1.1rem rgb(from var(--color-primary) r g b / 0.28);
}

.exercise-card__goal {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 700;
}

.exercise-card__history {
  display: grid;
  gap: 0.2rem;
  margin-inline-start: auto;
  text-align: end;
}

.exercise-card__history-item {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.35;
  white-space: nowrap;
}

.exercise-card__progress {
  height: 0.62rem;
  overflow: hidden;
  border: 1px solid var(--color-outline);
  border-radius: 999px;
  background: var(--color-surface-container-low);
}

.exercise-card__progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  box-shadow: 0 0 1rem var(--color-primary);
  transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.exercise-card--complete .exercise-card__progress-fill {
  background: var(--color-success);
  box-shadow: 0 0 1rem var(--color-success);
}

.exercise-card__actions {
  gap: 0.65rem;
}

.exercise-card__add {
  display: inline-flex;
  min-width: 0;
  min-height: 3rem;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid rgb(from var(--color-primary) r g b / 0.38);
  border-radius: 0.9rem;
  color: var(--color-primary);
  background: rgb(from var(--color-primary) r g b / 0.07);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 900;
  transition:
    transform 90ms ease,
    background-color 120ms ease,
    box-shadow 120ms ease;
}

.exercise-card__add:hover,
.exercise-card__add:focus-visible {
  background: rgb(from var(--color-primary) r g b / 0.14);
  box-shadow: 0 0 1rem rgb(from var(--color-primary) r g b / 0.22);
}

.exercise-card__add:active {
  transform: scale(0.95);
}

.exercise-card__icon-button:focus-visible,
.exercise-card__add:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

@keyframes goal-pop {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
  }
  70% {
    transform: scale(1.18) rotate(4deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
</style>
