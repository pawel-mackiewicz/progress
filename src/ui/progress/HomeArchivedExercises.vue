<script setup lang="ts">
import { ArchiveRestore } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import type { Exercise } from '@/progress/types'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

defineProps<{
  exercises: Exercise[]
}>()

const emit = defineEmits<{
  restore: [exerciseId: string]
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})
</script>

<template>
  <details v-if="exercises.length" class="home-archived">
    <summary>
      <ArchiveRestore aria-hidden="true" :size="18" />
      {{ t('home.archivedTitle', { count: exercises.length }) }}
    </summary>
    <ul>
      <li v-for="exercise in exercises" :key="exercise.id">
        <span>{{ exercise.name }}</span>
        <button
          type="button"
          :aria-label="t('home.restoreLabel', { name: exercise.name })"
          @click="emit('restore', exercise.id)"
        >
          {{ t('home.restore') }}
        </button>
      </li>
    </ul>
  </details>
</template>

<style scoped>
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
</style>
