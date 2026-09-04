<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProgressCommands, useProgressQueries } from '@/progress/context'
import { monthRange, toLocalDayKey } from '@/progress/date'
import type { DashboardSnapshot, RepIncrement } from '@/progress/types'
import CompletionCalendar from '@/ui/progress/CompletionCalendar.vue'
import CompletionCelebration from '@/ui/progress/CompletionCelebration.vue'
import HomeArchivedExercises from '@/ui/progress/HomeArchivedExercises.vue'
import HomeExerciseList from '@/ui/progress/HomeExerciseList.vue'
import HomeHero from '@/ui/progress/HomeHero.vue'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'
import { RouterLink, useRouter } from '@/ui/router/runtime'

const queries = useProgressQueries()
const commands = useProgressCommands()
const router = useRouter()
const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const now = ref(new Date())
const selectedMonth = ref(
  new Date(now.value.getFullYear(), now.value.getMonth(), 1)
)
const snapshot = ref<DashboardSnapshot | null>(null)
const loading = ref(true)
const loadError = ref(false)
const actionError = ref(false)
const lastRepLogId = ref<string | null>(null)
const undoCopy = ref('')
const showCelebration = ref(false)
const expandedExerciseId = ref<string | null>(null)
const deferredCompletedExerciseId = ref<string | null>(null)
const deferredExerciseOrder = ref<string[]>([])
let snackbarTimer: ReturnType<typeof setTimeout> | undefined
let celebrationTimer: ReturnType<typeof setTimeout> | undefined
let midnightTimer: ReturnType<typeof setTimeout> | undefined
let loadSequence = 0

const today = computed(() => toLocalDayKey(now.value))
const visibleExercises = computed(() => {
  const exercises = snapshot.value?.exercises ?? []

  if (!deferredCompletedExerciseId.value) {
    return exercises
  }

  const exercisesById = new Map(
    exercises.map((exercise) => [exercise.id, exercise])
  )
  const orderedExercises = deferredExerciseOrder.value.flatMap((exerciseId) => {
    const exercise = exercisesById.get(exerciseId)

    if (!exercise) {
      return []
    }

    exercisesById.delete(exerciseId)
    return [exercise]
  })

  return [...orderedExercises, ...exercisesById.values()]
})

function clearDeferredExerciseOrder() {
  deferredCompletedExerciseId.value = null
  deferredExerciseOrder.value = []
}

async function loadSnapshot() {
  const sequence = ++loadSequence
  const range = monthRange(selectedMonth.value)

  try {
    const nextSnapshot = await queries.getDashboard(
      today.value,
      range.firstDayKey,
      range.lastDayKey
    )

    if (sequence === loadSequence) {
      snapshot.value = nextSnapshot
      loadError.value = false

      if (
        deferredCompletedExerciseId.value &&
        (expandedExerciseId.value !== deferredCompletedExerciseId.value ||
          !nextSnapshot.exercises.some(
            (exercise) =>
              exercise.id === deferredCompletedExerciseId.value &&
              exercise.isComplete
          ))
      ) {
        clearDeferredExerciseOrder()
      }

      if (
        expandedExerciseId.value &&
        !nextSnapshot.exercises.some(
          (exercise) => exercise.id === expandedExerciseId.value
        )
      ) {
        expandedExerciseId.value = null
      }
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
  const exerciseWasIncomplete = !snapshot.value?.exercises.find(
    (exercise) => exercise.id === exerciseId
  )?.isComplete
  const exerciseOrder = visibleExercises.value.map((exercise) => exercise.id)

  try {
    const result = await commands.recordReps(exerciseId, amount, today.value)
    lastRepLogId.value = result.repLogId
    undoCopy.value = t('home.undoMessage', {
      count: amount,
      name: exerciseName
    })
    resetSnackbarTimer()

    if (result.didEarnDay) {
      celebrate()
    }

    if (exerciseWasIncomplete && expandedExerciseId.value === exerciseId) {
      deferredCompletedExerciseId.value = exerciseId
      deferredExerciseOrder.value = exerciseOrder
    }

    await loadSnapshot()

    if (
      deferredCompletedExerciseId.value === exerciseId &&
      !snapshot.value?.exercises.some(
        (exercise) => exercise.id === exerciseId && exercise.isComplete
      )
    ) {
      clearDeferredExerciseOrder()
    }
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
    await commands.undoRepLog(repLogId)
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
    await commands.restoreExercise(exerciseId, today.value)
    await loadSnapshot()
  } catch {
    actionError.value = true
  }
}

function editExercise(exerciseId: string) {
  router.push(`/exercises/${encodeURIComponent(exerciseId)}/edit`)
}

function toggleExercise(exerciseId: string) {
  if (expandedExerciseId.value === deferredCompletedExerciseId.value) {
    clearDeferredExerciseOrder()
  }

  expandedExerciseId.value =
    expandedExerciseId.value === exerciseId ? null : exerciseId
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
    <HomeHero
      :available-shields="snapshot?.availableShields ?? 0"
      :current-streak="snapshot?.currentStreak ?? 0"
      :date="now"
      :is-day-complete="snapshot?.isDayComplete ?? false"
    />

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
      <HomeExerciseList
        :exercises="visibleExercises"
        :expanded-exercise-id="expandedExerciseId"
        @add="addReps"
        @edit="editExercise"
        @toggle="toggleExercise"
      />

      <CompletionCalendar
        :completed-days="snapshot.completedDays"
        :month="selectedMonth"
        :protected-days="snapshot.protectedDays"
        :today="today"
        @next="changeMonth(1)"
        @previous="changeMonth(-1)"
      />

      <HomeArchivedExercises
        :exercises="snapshot.archivedExercises"
        @restore="restoreExercise"
      />
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

    <CompletionCelebration :visible="showCelebration" />
  </div>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 1.35rem;
  padding-bottom: 4.8rem;
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
.snackbar-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

@keyframes loading-pulse {
  to {
    opacity: 0.25;
    transform: translateY(-0.45rem);
  }
}

@media (min-width: 48rem) {
  .home-add-button {
    right: calc((100vw - 56rem) / 2 + 2rem);
  }
}
</style>
