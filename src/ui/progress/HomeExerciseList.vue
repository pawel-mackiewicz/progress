<script setup lang="ts">
import { Plus, Trophy } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import type { DashboardExercise, RepIncrement } from '@/progress/types'
import HomeExerciseListItem from '@/ui/progress/HomeExerciseListItem.vue'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'
import { RouterLink } from '@/ui/router/runtime'

defineProps<{
  exercises: DashboardExercise[]
  expandedExerciseId: string | null
}>()

const emit = defineEmits<{
  toggle: [exerciseId: string]
  add: [exerciseId: string, exerciseName: string, amount: RepIncrement]
  edit: [exerciseId: string]
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})
</script>

<template>
  <ul
    v-if="exercises.length"
    class="home-exercises"
    :aria-label="t('home.exerciseList')"
  >
    <HomeExerciseListItem
      v-for="exercise in exercises"
      :key="exercise.id"
      :exercise="exercise"
      :expanded="expandedExerciseId === exercise.id"
      @add="emit('add', exercise.id, exercise.name, $event)"
      @edit="emit('edit', exercise.id)"
      @toggle="emit('toggle', exercise.id)"
    />
  </ul>

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
</template>

<style scoped>
.home-exercises {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
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
</style>
