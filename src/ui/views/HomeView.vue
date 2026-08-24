<script setup lang="ts">
import { ArchiveRestore, Flame, Plus, Trophy } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProgressRepository } from '@/progress/context'
import { monthRange, toLocalDayKey } from '@/progress/date'
import type { HomeSnapshot, RepIncrement } from '@/progress/types'
import CompletionCalendar from '@/ui/progress/CompletionCalendar.vue'
import ExerciseCard from '@/ui/progress/ExerciseCard.vue'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'
import { RouterLink, useRouter } from '@/ui/router/runtime'

const repository = useProgressRepository()
const router = useRouter()
const { locale, t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const now = ref(new Date())
const selectedMonth = ref(
  new Date(now.value.getFullYear(), now.value.getMonth(), 1)
)
const snapshot = ref<HomeSnapshot | null>(null)
const loading = ref(true)
const loadError = ref(false)
const actionError = ref(false)
const lastRepLogId = ref<string | null>(null)
const undoCopy = ref('')
const showCelebration = ref(false)
let snackbarTimer: ReturnType<typeof setTimeout> | undefined
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
let midnightTimer: ReturnType<typeof setTimeout> | undefined
let loadSequence = 0

const today = computed(() => toLocalDayKey(now.value))
const formattedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(now.value)
)
const streakCopy = computed(() => {
  const streak = snapshot.value?.currentStreak ?? 0

  return streak > 0 ? t('home.streak', { count: streak }) : t('home.streakZero')
})

async function loadSnapshot() {
  const sequence = ++loadSequence
  const range = monthRange(selectedMonth.value)

  try {
    const nextSnapshot = await repository.getHomeSnapshot(
      today.value,
      range.firstDayKey,
      range.lastDayKey
    )

    if (sequence === loadSequence) {
      snapshot.value = nextSnapshot
      loadError.value = false
    }
  } catch {
    if (sequence === loadSequence) {
      loadError.value = true
    }
  } finally {
    if (sequence === loadSequence) {
      loading.value = false
    }
  }
}

async function addReps(
  exerciseId: string,
  exerciseName: string,
  amount: RepIncrement
) {
  actionError.value = false

  try {
    const result = await repository.recordReps(exerciseId, amount, today.value)
    lastRepLogId.value = result.repLogId
    undoCopy.value = t('home.undoMessage', {
      count: amount,
      name: exerciseName
    })
    resetSnackbarTimer()

    if (result.didEarnDay) {
      celebrate()
    }

    await loadSnapshot()
  } catch {
    actionError.value = true
  }
}

async function undoLastReps() {
  if (!lastRepLogId.value) {
    return
  }

  const repLogId = lastRepLogId.value
  lastRepLogId.value = null
  clearTimeout(snackbarTimer)

  try {
    await repository.undoRepLog(repLogId)
    showCelebration.value = false
    clearTimeout(celebrationTimer)
    await loadSnapshot()
  } catch {
    actionError.value = true
  }
}

async function restoreExercise(exerciseId: string) {
  actionError.value = false

  try {
    await repository.restoreExercise(exerciseId, today.value)
    await loadSnapshot()
  } catch {
    actionError.value = true
  }
}

function editExercise(exerciseId: string) {
  router.push(`/exercises/${encodeURIComponent(exerciseId)}/edit`)
}

function changeMonth(amount: number) {
  selectedMonth.value = new Date(
    selectedMonth.value.getFullYear(),
    selectedMonth.value.getMonth() + amount,
    1
  )
  void loadSnapshot()
}

function resetSnackbarTimer() {
  clearTimeout(snackbarTimer)
  snackbarTimer = setTimeout(() => {
    lastRepLogId.value = null
  }, 5000)
}

function celebrate() {
  showCelebration.value = true
  clearTimeout(celebrationTimer)
  celebrationTimer = setTimeout(() => {
    showCelebration.value = false
  }, 3200)

  if ('vibrate' in navigator) {
    navigator.vibrate?.([45, 35, 80])
  }
}

function scheduleMidnightRefresh() {
  clearTimeout(midnightTimer)
  const nextMidnight = new Date()
  nextMidnight.setHours(24, 0, 0, 80)
  midnightTimer = setTimeout(() => {
    now.value = new Date()
    selectedMonth.value = new Date(
      now.value.getFullYear(),
      now.value.getMonth(),
      1
    )
    void loadSnapshot()
    scheduleMidnightRefresh()
  }, nextMidnight.getTime() - Date.now())
}

function refreshAfterVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return
  }

  const previousDay = today.value
  now.value = new Date()

  if (today.value !== previousDay) {
    selectedMonth.value = new Date(
      now.value.getFullYear(),
      now.value.getMonth(),
      1
    )
  }

  void loadSnapshot()
  scheduleMidnightRefresh()
}

onMounted(() => {
  void loadSnapshot()
  scheduleMidnightRefresh()
  document.addEventListener('visibilitychange', refreshAfterVisibilityChange)
})

onUnmounted(() => {
  clearTimeout(snackbarTimer)
  clearTimeout(celebrationTimer)
  clearTimeout(midnightTimer)
  document.removeEventListener('visibilitychange', refreshAfterVisibilityChange)
})
</script>

<template>
  <div class="home-view">
    <section class="home-hero" aria-labelledby="home-title">
      <div>
        <p class="app-section-label">{{ t('home.eyebrow') }}</p>
        <h2 id="home-title" class="home-hero__title">
          {{
            snapshot?.isDayComplete ? t('home.completeTitle') : t('home.title')
          }}
        </h2>
        <p class="home-hero__date">{{ formattedDate }}</p>
      </div>

      <div
        class="home-hero__streak"
        :class="{ 'home-hero__streak--active': snapshot?.currentStreak }"
      >
        <Flame aria-hidden="true" :size="24" :stroke-width="2.6" />
        <span>{{ streakCopy }}</span>
      </div>
    </section>

    <p v-if="loadError" class="app-alert" role="alert">
      {{ t('home.loadError') }}
    </p>
    <p v-else-if="actionError" class="app-alert" role="alert">
      {{ t('home.actionError') }}
    </p>

    <div v-if="loading" class="home-loading" aria-busy="true">
      <span /><span /><span />
    </div>

    <template v-else-if="snapshot">
      <section
        v-if="snapshot.exercises.length"
        class="home-exercises"
        :aria-label="t('home.exerciseList')"
      >
        <ExerciseCard
          v-for="exercise in snapshot.exercises"
          :key="exercise.id"
          :exercise="exercise"
          @add="addReps(exercise.id, exercise.name, $event)"
          @edit="editExercise(exercise.id)"
        />
      </section>

      <section v-else class="home-empty">
        <span class="home-empty__icon">
          <Trophy aria-hidden="true" :size="34" />
        </span>
        <h3>{{ t('home.emptyTitle') }}</h3>
        <p>{{ t('home.emptyBody') }}</p>
        <RouterLink class="app-primary-button" to="/exercises/new">
          <Plus aria-hidden="true" :size="20" />
          {{ t('home.addExercise') }}
        </RouterLink>
      </section>

      <CompletionCalendar
        :completed-days="snapshot.completedDays"
        :month="selectedMonth"
        :today="today"
        @next="changeMonth(1)"
        @previous="changeMonth(-1)"
      />

      <details v-if="snapshot.archivedExercises.length" class="home-archived">
        <summary>
          <ArchiveRestore aria-hidden="true" :size="18" />
          {{
            t('home.archivedTitle', {
              count: snapshot.archivedExercises.length
            })
          }}
        </summary>
        <ul>
          <li v-for="exercise in snapshot.archivedExercises" :key="exercise.id">
            <span>{{ exercise.name }}</span>
            <button
              type="button"
              :aria-label="t('home.restoreLabel', { name: exercise.name })"
              @click="restoreExercise(exercise.id)"
            >
              {{ t('home.restore') }}
            </button>
          </li>
        </ul>
      </details>
    </template>

    <RouterLink
      v-if="snapshot?.exercises.length"
      class="home-add-button"
      to="/exercises/new"
      :aria-label="t('home.addExercise')"
    >
      <Plus aria-hidden="true" :size="27" :stroke-width="2.8" />
    </RouterLink>

    <Transition name="snackbar">
      <div v-if="lastRepLogId" class="home-snackbar" role="status">
        <span>{{ undoCopy }}</span>
        <button type="button" @click="undoLastReps">
          {{ t('home.undo') }}
        </button>
      </div>
    </Transition>

    <Transition name="celebration">
      <div
        v-if="showCelebration"
        class="celebration"
        role="status"
        aria-live="assertive"
      >
        <div class="celebration__confetti" aria-hidden="true">
          <span v-for="index in 14" :key="index" />
        </div>
        <Trophy class="celebration__trophy" aria-hidden="true" :size="54" />
        <p>{{ t('celebration.kicker') }}</p>
        <strong>{{ t('celebration.title') }}</strong>
        <span>{{ t('celebration.body') }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 1.35rem;
  padding-bottom: 4.8rem;
}

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

.home-hero__streak {
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

.home-exercises {
  display: grid;
  gap: 0.9rem;
}

.home-empty {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 2.4rem 1.35rem;
  border: 1px dashed rgb(from var(--color-primary) r g b / 0.5);
  border-radius: 1.5rem;
  background: rgb(from var(--color-primary) r g b / 0.04);
  text-align: center;
}

.home-empty__icon {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border: 1px solid var(--color-primary);
  border-radius: 1.25rem;
  color: var(--color-primary);
  box-shadow: 0 0 1.8rem rgb(from var(--color-primary) r g b / 0.22);
}

.home-empty h3,
.home-empty p {
  margin: 0;
}

.home-empty h3 {
  margin-top: 0.5rem;
  font-family: var(--font-headline);
  font-size: 1.4rem;
}

.home-empty p {
  max-width: 27rem;
  color: var(--color-secondary);
  line-height: 1.55;
}

.home-archived {
  border: 1px solid var(--color-outline);
  border-radius: 1rem;
  color: var(--color-secondary);
  background: var(--color-surface-container-lowest);
}

.home-archived summary {
  display: flex;
  min-height: 3.5rem;
  align-items: center;
  gap: 0.55rem;
  padding: 0.9rem 1rem;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 800;
}

.home-archived ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0 1rem 1rem;
  list-style: none;
}

.home-archived li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--color-outline);
}

.home-archived button {
  min-height: 2.75rem;
  padding: 0.5rem 0.8rem;
  border-radius: 0.75rem;
  color: var(--color-primary);
  background: rgb(from var(--color-primary) r g b / 0.1);
  font-weight: 800;
}

.home-add-button {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1.25rem, env(safe-area-inset-bottom));
  z-index: 30;
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 0.48);
  border-radius: 1.2rem;
  color: var(--color-surface);
  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-success)
  );
  box-shadow:
    0 0 1.8rem rgb(from var(--color-primary) r g b / 0.48),
    0 0.8rem 2rem rgb(0 0 0 / 0.4);
  transition: transform 120ms ease;
}

.home-add-button:active {
  transform: scale(0.94);
}

.home-add-button:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 4px;
}

.home-snackbar {
  position: fixed;
  right: 1rem;
  bottom: max(6rem, calc(env(safe-area-inset-bottom) + 6rem));
  left: 1rem;
  z-index: 70;
  display: flex;
  max-width: 30rem;
  min-height: 3.6rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-inline: auto;
  padding: 0.75rem 0.85rem 0.75rem 1rem;
  border: 1px solid var(--color-primary);
  border-radius: 1rem;
  color: var(--color-on-surface);
  background: rgb(from var(--color-surface-container-lowest) r g b / 0.98);
  box-shadow: 0 0 2rem rgb(from var(--color-primary) r g b / 0.25);
  font-size: 0.82rem;
}

.home-snackbar button {
  min-height: 2.75rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.75rem;
  color: var(--color-surface);
  background: var(--color-primary);
  font-weight: 900;
}

.celebration {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 1.5rem;
  color: var(--color-on-surface);
  background:
    radial-gradient(
      circle,
      rgb(from var(--color-primary) r g b / 0.3),
      transparent 32%
    ),
    rgb(from var(--color-surface) r g b / 0.92);
  text-align: center;
  backdrop-filter: blur(14px);
}

.celebration__trophy {
  color: var(--color-success);
  filter: drop-shadow(0 0 1.1rem var(--color-success));
  animation: trophy-arrival 520ms cubic-bezier(0.16, 1, 0.3, 1);
}

.celebration > p {
  margin: 1rem 0 0.4rem;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.celebration > strong {
  font-family: var(--font-headline);
  font-size: clamp(2.5rem, 12vw, 5rem);
  line-height: 0.95;
}

.celebration > span {
  max-width: 28rem;
  margin-top: 1rem;
  color: var(--color-secondary);
}

.celebration__confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celebration__confetti span {
  position: absolute;
  top: -10%;
  left: calc((var(--piece) + 1) * 6.5%);
  width: 0.55rem;
  height: 1.25rem;
  background: var(--color-primary);
  animation: confetti-fall 2.4s calc(var(--piece) * 45ms) ease-in both;
}

.celebration__confetti span:nth-child(3n + 1) {
  background: var(--color-accent);
}
.celebration__confetti span:nth-child(3n + 2) {
  background: var(--color-success);
}
.celebration__confetti span:nth-child(1) {
  --piece: 1;
}
.celebration__confetti span:nth-child(2) {
  --piece: 2;
}
.celebration__confetti span:nth-child(3) {
  --piece: 3;
}
.celebration__confetti span:nth-child(4) {
  --piece: 4;
}
.celebration__confetti span:nth-child(5) {
  --piece: 5;
}
.celebration__confetti span:nth-child(6) {
  --piece: 6;
}
.celebration__confetti span:nth-child(7) {
  --piece: 7;
}
.celebration__confetti span:nth-child(8) {
  --piece: 8;
}
.celebration__confetti span:nth-child(9) {
  --piece: 9;
}
.celebration__confetti span:nth-child(10) {
  --piece: 10;
}
.celebration__confetti span:nth-child(11) {
  --piece: 11;
}
.celebration__confetti span:nth-child(12) {
  --piece: 12;
}
.celebration__confetti span:nth-child(13) {
  --piece: 13;
}
.celebration__confetti span:nth-child(14) {
  --piece: 14;
}

.home-loading {
  display: flex;
  min-height: 12rem;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
}

.home-loading span {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  background: var(--color-primary);
  box-shadow: 0 0 0.8rem var(--color-primary);
  animation: loading-pulse 800ms infinite alternate ease-in-out;
}

.home-loading span:nth-child(2) {
  animation-delay: 150ms;
}
.home-loading span:nth-child(3) {
  animation-delay: 300ms;
}

.snackbar-enter-active,
.snackbar-leave-active,
.celebration-enter-active,
.celebration-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

@keyframes trophy-arrival {
  from {
    opacity: 0;
    transform: scale(0.2) rotate(-18deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes confetti-fall {
  to {
    transform: translateY(115vh) rotate(520deg);
  }
}

@keyframes loading-pulse {
  to {
    opacity: 0.25;
    transform: translateY(-0.45rem);
  }
}

@media (min-width: 48rem) {
  .home-hero {
    grid-template-columns: 1fr auto;
    align-items: end;
  }

  .home-exercises {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-add-button {
    right: calc((100vw - 56rem) / 2 + 2rem);
  }
}
</style>
