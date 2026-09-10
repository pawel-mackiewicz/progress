<script setup lang="ts">
import { ArrowUp, Sparkles } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ProgressedExerciseForCelebration } from '@/progress/write/exercises/application/PrepareTodayTrainingDayUseCase'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

const props = defineProps<{
  exercises: readonly ProgressedExerciseForCelebration[]
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const dialog = ref<HTMLElement | null>(null)
const dismissButton = ref<HTMLButtonElement | null>(null)
const isVisible = computed(() => props.exercises.length > 0)
let restoreFocusTo: HTMLElement | null = null
let previousBodyOverflow = ''
let focusIsContained = false

function containFocus(event: FocusEvent) {
  if (
    !isVisible.value ||
    !dialog.value ||
    !(event.target instanceof Node) ||
    dialog.value.contains(event.target)
  ) {
    return
  }

  dismissButton.value?.focus()
}

async function activateDialog() {
  restoreFocusTo =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('focusin', containFocus)
  focusIsContained = true

  await nextTick()

  if (isVisible.value) {
    dismissButton.value?.focus()
  }
}

function deactivateDialog(restoreFocus = true) {
  if (!focusIsContained) {
    return
  }

  document.body.style.overflow = previousBodyOverflow
  document.removeEventListener('focusin', containFocus)
  focusIsContained = false
  const focusTarget = restoreFocusTo
  restoreFocusTo = null

  if (restoreFocus && focusTarget?.isConnected) {
    void nextTick(() => focusTarget.focus())
  }
}

function dismiss() {
  emit('dismiss')
}

function keepFocusInside(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    dismiss()
    return
  }

  if (event.key === 'Tab') {
    event.preventDefault()
    dismissButton.value?.focus()
  }
}

watch(
  isVisible,
  (visible) => {
    if (visible) {
      void activateDialog()
      return
    }

    deactivateDialog()
  },
  { flush: 'post', immediate: true }
)

onBeforeUnmount(() => deactivateDialog(false))
</script>

<template>
  <Transition name="progression-celebration">
    <div
      v-if="isVisible"
      ref="dialog"
      class="progression-celebration"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progression-celebration-title"
      aria-describedby="progression-celebration-description"
      @keydown="keepFocusInside"
    >
      <div class="progression-celebration__energy" aria-hidden="true">
        <span v-for="index in 9" :key="index" />
      </div>

      <section class="progression-celebration__panel">
        <div class="progression-celebration__emblem" aria-hidden="true">
          <Sparkles :size="35" :stroke-width="2.4" />
        </div>

        <p class="progression-celebration__eyebrow">
          {{ t('progression.eyebrow') }}
        </p>
        <h2 id="progression-celebration-title">
          {{ t('progression.title') }}
        </h2>
        <p
          id="progression-celebration-description"
          class="progression-celebration__description"
        >
          {{ t('progression.body') }}
        </p>

        <ul class="progression-celebration__goals">
          <li
            v-for="exercise in exercises"
            :key="exercise.exerciseId"
            class="progression-celebration__goal"
          >
            <span class="visually-hidden">
              {{
                t('progression.changeAnnouncement', {
                  name: exercise.name,
                  previous: exercise.previousDailyGoal,
                  next: exercise.nextDailyGoal
                })
              }}
            </span>

            <span class="progression-celebration__exercise" aria-hidden="true">
              <strong>{{ exercise.name }}</strong>
              <span>{{ t('progression.dailyGoal') }}</span>
            </span>

            <span class="progression-celebration__change" aria-hidden="true">
              <s>{{ exercise.previousDailyGoal }}</s>
              <ArrowUp :size="21" :stroke-width="3" />
              <strong>{{ exercise.nextDailyGoal }}</strong>
            </span>
          </li>
        </ul>

        <button
          ref="dismissButton"
          class="app-primary-button progression-celebration__action"
          type="button"
          @click="dismiss"
        >
          {{ t('progression.action') }}
        </button>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.progression-celebration {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: max(1rem, env(safe-area-inset-top))
    max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom))
    max(1rem, env(safe-area-inset-left));
  background:
    radial-gradient(
      circle at 50% 15%,
      rgb(from var(--color-success) r g b / 0.15),
      transparent 30rem
    ),
    radial-gradient(
      circle at 20% 80%,
      rgb(from var(--color-primary) r g b / 0.13),
      transparent 24rem
    ),
    rgb(from var(--color-surface) r g b / 0.92);
  backdrop-filter: blur(16px);
}

.progression-celebration__panel {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 31rem);
  max-height: calc(
    100dvh - max(2rem, env(safe-area-inset-top)) -
      max(2rem, env(safe-area-inset-bottom))
  );
  grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
  justify-items: center;
  padding: clamp(1.35rem, 6vw, 2.25rem);
  overflow: hidden;
  border: 1px solid rgb(from var(--color-primary) r g b / 0.5);
  border-radius: 1.75rem;
  background:
    linear-gradient(
      145deg,
      rgb(from var(--color-primary) r g b / 0.1),
      transparent 38%
    ),
    var(--color-surface-container-lowest);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.04) inset,
    0 0 3.5rem rgb(from var(--color-primary) r g b / 0.2),
    0 1.5rem 4rem rgb(0 0 0 / 0.55);
  text-align: center;
  animation: progression-panel-arrival 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.progression-celebration__panel::before {
  position: absolute;
  top: -8rem;
  width: 16rem;
  height: 16rem;
  border: 1px solid rgb(from var(--color-success) r g b / 0.24);
  border-radius: 50%;
  box-shadow:
    0 0 3rem rgb(from var(--color-success) r g b / 0.18),
    inset 0 0 3rem rgb(from var(--color-primary) r g b / 0.13);
  content: '';
  animation: progression-halo 2.6s ease-in-out infinite alternate;
}

.progression-celebration__emblem {
  position: relative;
  display: grid;
  width: 4.5rem;
  height: 4.5rem;
  place-items: center;
  border: 1px solid rgb(from var(--color-success) r g b / 0.7);
  border-radius: 1.35rem;
  color: var(--color-success);
  background: rgb(from var(--color-success) r g b / 0.1);
  box-shadow:
    0 0 1.5rem rgb(from var(--color-success) r g b / 0.32),
    inset 0 0 1.1rem rgb(from var(--color-primary) r g b / 0.13);
  transform: rotate(-4deg);
}

.progression-celebration__eyebrow {
  margin: 1.15rem 0 0.45rem;
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-shadow: 0 0 0.9rem rgb(from var(--color-success) r g b / 0.5);
}

.progression-celebration h2 {
  max-width: 12ch;
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(2.15rem, 10vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
  text-wrap: balance;
  text-shadow: 0 0 1.4rem rgb(from var(--color-primary) r g b / 0.3);
}

.progression-celebration__description {
  max-width: 27rem;
  margin: 0.85rem 0 0;
  color: var(--color-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
  text-wrap: balance;
}

.progression-celebration__goals {
  display: grid;
  width: 100%;
  gap: 0.65rem;
  margin: 1.35rem 0;
  padding: 0.1rem;
  overflow-y: auto;
  list-style: none;
  scrollbar-color: var(--color-outline) transparent;
}

.progression-celebration__goal {
  display: flex;
  min-height: 4.65rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--color-outline);
  border-radius: 1rem;
  background: rgb(from var(--color-surface-container-low) r g b / 0.9);
  text-align: left;
  animation: progression-goal-arrival 460ms
    calc(150ms + var(--goal-index, 0) * 70ms) cubic-bezier(0.16, 1, 0.3, 1) both;
}

.progression-celebration__goal:nth-child(2) {
  --goal-index: 1;
}

.progression-celebration__goal:nth-child(3) {
  --goal-index: 2;
}

.progression-celebration__goal:nth-child(n + 4) {
  --goal-index: 3;
}

.progression-celebration__exercise {
  display: grid;
  min-width: 0;
  gap: 0.22rem;
}

.progression-celebration__exercise strong {
  font-family: var(--font-headline);
  font-size: 1rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.progression-celebration__exercise span {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.progression-celebration__change {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-mono);
  font-size: 1.05rem;
}

.progression-celebration__change s {
  color: var(--color-secondary);
  opacity: 0.78;
}

.progression-celebration__change svg {
  color: var(--color-primary);
  filter: drop-shadow(0 0 0.45rem var(--color-primary));
}

.progression-celebration__change strong {
  color: var(--color-success);
  font-size: 1.65rem;
  line-height: 1;
  text-shadow: 0 0 0.8rem rgb(from var(--color-success) r g b / 0.45);
}

.progression-celebration__action {
  width: 100%;
  flex: 0 0 auto;
}

.progression-celebration__energy {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.progression-celebration__energy span {
  position: absolute;
  bottom: -2rem;
  left: calc(var(--energy-position) * 11%);
  width: 0.3rem;
  height: clamp(3rem, 12vh, 7rem);
  border-radius: 999px;
  background: linear-gradient(transparent, var(--color-primary));
  box-shadow: 0 0 1rem var(--color-primary);
  opacity: 0;
  transform: rotate(var(--energy-tilt, 0deg));
  animation: progression-energy-rise 2.4s calc(var(--energy-position) * 120ms)
    ease-out infinite;
}

.progression-celebration__energy span:nth-child(1) {
  --energy-position: 1;
  --energy-tilt: 4deg;
}

.progression-celebration__energy span:nth-child(2) {
  --energy-position: 2;
  --energy-tilt: -3deg;
}

.progression-celebration__energy span:nth-child(3) {
  --energy-position: 3;
  --energy-tilt: 6deg;
}

.progression-celebration__energy span:nth-child(4) {
  --energy-position: 4;
  --energy-tilt: -5deg;
}

.progression-celebration__energy span:nth-child(5) {
  --energy-position: 5;
  --energy-tilt: 2deg;
}

.progression-celebration__energy span:nth-child(6) {
  --energy-position: 6;
  --energy-tilt: -7deg;
}

.progression-celebration__energy span:nth-child(7) {
  --energy-position: 7;
  --energy-tilt: 5deg;
}

.progression-celebration__energy span:nth-child(8) {
  --energy-position: 8;
  --energy-tilt: -2deg;
}

.progression-celebration__energy span:nth-child(9) {
  --energy-position: 9;
  --energy-tilt: 4deg;
}

.progression-celebration-enter-active,
.progression-celebration-leave-active {
  transition: opacity 220ms ease;
}

.progression-celebration-enter-from,
.progression-celebration-leave-to {
  opacity: 0;
}

@keyframes progression-panel-arrival {
  from {
    opacity: 0;
    transform: translateY(1.5rem) scale(0.94);
  }
}

@keyframes progression-goal-arrival {
  from {
    opacity: 0;
    transform: translateY(0.8rem);
  }
}

@keyframes progression-halo {
  to {
    opacity: 0.6;
    transform: scale(1.08);
  }
}

@keyframes progression-energy-rise {
  0% {
    opacity: 0;
    transform: translateY(0) rotate(var(--energy-tilt, 0deg));
  }

  20% {
    opacity: 0.48;
  }

  100% {
    opacity: 0;
    transform: translateY(-105vh) rotate(var(--energy-tilt, 0deg));
  }
}

@media (max-height: 38rem) {
  .progression-celebration__panel {
    padding-block: 1rem;
  }

  .progression-celebration__emblem {
    width: 3.25rem;
    height: 3.25rem;
  }

  .progression-celebration__eyebrow {
    margin-top: 0.65rem;
  }

  .progression-celebration h2 {
    font-size: 2rem;
  }

  .progression-celebration__description {
    margin-top: 0.55rem;
  }

  .progression-celebration__goals {
    margin-block: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progression-celebration__energy {
    display: none;
  }

  .progression-celebration__panel,
  .progression-celebration__panel::before,
  .progression-celebration__goal {
    animation: none;
  }
}
</style>
