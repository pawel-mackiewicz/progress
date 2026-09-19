<script setup lang="ts">
import { CheckCircle2, ChevronDown, Circle, Flame } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { DashboardExercise, RepIncrement } from '@/progress/types'
import ExerciseCard from '@/ui/progress/ExerciseCard.vue'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

const props = defineProps<{
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

const progressionGoal = computed(
  () =>
    props.exercise.progressionThresholdReps - props.exercise.effectiveDailyGoal
)
const progressionCurrent = computed(() =>
  Math.min(
    Math.max(
      props.exercise.completedReps - props.exercise.effectiveDailyGoal,
      0
    ),
    progressionGoal.value
  )
)
const progressionPercent = computed(() =>
  Math.round((progressionCurrent.value / progressionGoal.value) * 100)
)
</script>

<template>
  <li
    class="home-exercises__item"
    :class="{
      'home-exercises__item--complete': exercise.isComplete,
      'home-exercises__item--progression-ready': exercise.isProgressionReady,
      'home-exercises__item--expanded': expanded
    }"
  >
    <div v-if="!expanded" class="home-exercises__collapsed">
      <button
        class="home-exercises__toggle"
        type="button"
        :aria-controls="`exercise-details-${exercise.id}`"
        aria-expanded="false"
        :aria-label="
          t('home.expandExercise', {
            name: exercise.name,
            status: t(
              exercise.isProgressionReady
                ? 'home.exerciseProgressionReady'
                : exercise.isComplete
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
            'home-exercises__status-icon--complete': exercise.isComplete,
            'home-exercises__status-icon--progression-ready':
              exercise.isProgressionReady
          }"
          :data-testid="`exercise-status-${exercise.id}`"
          aria-hidden="true"
        >
          <Flame
            v-if="exercise.isProgressionReady"
            :data-testid="`exercise-level-up-icon-${exercise.id}`"
            :size="25"
            :stroke-width="2.5"
          />
          <CheckCircle2
            v-else-if="exercise.isComplete"
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
          aria-hidden="true"
          :size="22"
        />
      </button>

      <div
        class="home-exercises__progress"
        role="progressbar"
        :aria-label="
          exercise.isComplete
            ? t('card.progressionProgress', {
                name: exercise.name,
                current: progressionCurrent,
                goal: progressionGoal
              })
            : exercise.alternativeActivityProgressPercent > 0
              ? t('card.progressWithAlternative', {
                  name: exercise.name,
                  current: exercise.completedReps,
                  goal: exercise.effectiveDailyGoal,
                  percentage: exercise.alternativeActivityProgressPercent
                })
              : t('card.progress', {
                  name: exercise.name,
                  current: exercise.completedReps,
                  goal: exercise.dailyGoal
                })
        "
        :aria-valuemax="
          exercise.isComplete ? progressionGoal : exercise.dailyGoal
        "
        :aria-valuenow="
          exercise.isComplete
            ? progressionCurrent
            : Math.min(
                exercise.completedReps +
                  exercise.dailyGoal -
                  exercise.effectiveDailyGoal,
                exercise.dailyGoal
              )
        "
        aria-valuemin="0"
      >
        <span
          class="home-exercises__progress-fill"
          :style="{
            width: `${
              exercise.isComplete
                ? progressionPercent
                : exercise.progressPercent
            }%`
          }"
        />
        <span
          v-if="
            !exercise.isComplete &&
            exercise.alternativeActivityProgressPercent > 0
          "
          class="home-exercises__progress-alternative"
          :style="{
            width: `${exercise.alternativeActivityProgressPercent}%`
          }"
        />
      </div>
    </div>

    <ExerciseCard
      v-else
      :id="`exercise-details-${exercise.id}`"
      collapsible
      :exercise="exercise"
      @add="emit('add', $event)"
      @collapse="emit('toggle')"
      @edit="emit('edit')"
    />
  </li>
</template>

<style scoped>
.home-exercises__item {
  display: grid;
  gap: 0;
}

.home-exercises__collapsed {
  position: relative;
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
  padding: 0.7rem 0.9rem 1.15rem;
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

.home-exercises__item--progression-ready .home-exercises__toggle {
  border-color: rgb(from var(--color-progression) r g b / 0.72);
  box-shadow: 0 0 1.2rem rgb(from var(--color-progression) r g b / 0.12);
}

.home-exercises__status-icon {
  position: relative;
  display: inline-flex;
  width: 1.55rem;
  height: 1.55rem;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
}

.home-exercises__status-icon--complete {
  color: var(--color-success);
}

.home-exercises__status-icon--progression-ready {
  color: var(--color-accent-warm);
  filter: drop-shadow(
    0 0 0.4rem rgb(from var(--color-accent-warm) r g b / 0.72)
  );
  transform-origin: 50% 85%;
  animation: level-up-flame 1.35s ease-in-out infinite;
}

.home-exercises__status-icon--progression-ready::before {
  position: absolute;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background: var(--color-accent);
  filter: blur(0.5rem);
  opacity: 0.38;
  content: '';
}

.home-exercises__status-icon--progression-ready svg {
  position: relative;
  z-index: 1;
  fill: rgb(from var(--color-accent-warm) r g b / 0.2);
}

.home-exercises__summary {
  min-width: 0;
}

.home-exercises__summary strong {
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1.0625rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-exercises__chevron {
  color: var(--color-secondary);
}

.home-exercises__progress {
  position: absolute;
  right: 3rem;
  bottom: 0.55rem;
  left: 3.1rem;
  height: 0.28rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-surface-container-low);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.04);
  pointer-events: none;
}

.home-exercises__progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  box-shadow: 0 0 0.7rem var(--color-primary);
  transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-exercises__progress-alternative {
  position: absolute;
  inset: 0 0 0 auto;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--color-accent-warm),
    var(--color-success)
  );
  box-shadow: 0 0 0.7rem rgb(from var(--color-accent-warm) r g b / 0.78);
  transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.home-exercises__item--complete .home-exercises__progress {
  background: rgb(from var(--color-progression) r g b / 0.06);
  box-shadow: inset 0 0 0 1px rgb(from var(--color-progression) r g b / 0.24);
}

.home-exercises__item--complete .home-exercises__progress-fill {
  background: linear-gradient(
    90deg,
    rgb(from var(--color-progression) r g b / 0.72),
    var(--color-progression)
  );
  box-shadow: 0 0 0.7rem rgb(from var(--color-progression) r g b / 0.72);
}

.home-exercises__item--progression-ready .home-exercises__progress-fill {
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-accent-warm)
  );
  box-shadow: 0 0 0.8rem rgb(from var(--color-accent-warm) r g b / 0.82);
}

.home-exercises__item--expanded :deep(.exercise-card) {
  transform-origin: top;
  animation: exercise-card-open 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes exercise-card-open {
  from {
    opacity: 0;
    transform: translateY(-0.3rem) scale(0.985);
  }
}

@keyframes level-up-flame {
  0%,
  100% {
    transform: translateY(0) scale(1) rotate(-1deg);
  }

  45% {
    transform: translateY(-0.08rem) scale(1.08, 0.96) rotate(2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-exercises__toggle,
  .home-exercises__progress-fill,
  .home-exercises__progress-alternative {
    transition: none;
  }

  .home-exercises__item--expanded :deep(.exercise-card) {
    animation: none;
  }

  .home-exercises__status-icon--progression-ready {
    animation: none;
  }
}
</style>
