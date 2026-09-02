<script setup lang="ts">
import { Archive, Save, Sparkles } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProgressCommands, useProgressQueries } from '@/progress/context'
import { toLocalDayKey } from '@/progress/date'
import { DuplicateExerciseNameError } from '@/progress/commands'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'
import { useRoute, useRouter } from '@/ui/router/runtime'

const queries = useProgressQueries()
const commands = useProgressCommands()
const route = useRoute()
const router = useRouter()
const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const name = ref('')
const dailyGoal = ref('')
const nameError = ref('')
const goalError = ref('')
const formError = ref('')
const loading = ref(false)
const saving = ref(false)

const exerciseId = computed(() => {
  const routeParam = route.params.exerciseId

  return Array.isArray(routeParam) ? routeParam[0] : routeParam
})
const isEditing = computed(() => Boolean(exerciseId.value))

function validateForm() {
  nameError.value = name.value.trim() ? '' : t('form.nameRequired')
  const parsedGoal = Number(dailyGoal.value)
  goalError.value =
    Number.isInteger(parsedGoal) && parsedGoal > 0 ? '' : t('form.goalInvalid')

  return !nameError.value && !goalError.value
}

async function saveExercise() {
  formError.value = ''

  if (!validateForm()) {
    return
  }

  saving.value = true
  const draft = {
    name: name.value.trim(),
    dailyGoal: Number(dailyGoal.value)
  }

  try {
    if (exerciseId.value) {
      await commands.updateExercise(exerciseId.value, draft, toLocalDayKey())
    } else {
      await commands.createExercise(draft, toLocalDayKey())
    }

    await router.push('/')
  } catch (error) {
    formError.value =
      error instanceof DuplicateExerciseNameError
        ? t('form.duplicate')
        : t('form.saveError')
  } finally {
    saving.value = false
  }
}

async function archiveExercise() {
  if (
    !exerciseId.value ||
    !window.confirm(t('form.archiveConfirm', { name: name.value }))
  ) {
    return
  }

  saving.value = true
  formError.value = ''

  try {
    await commands.archiveExercise(exerciseId.value, toLocalDayKey())
    await router.push('/')
  } catch {
    formError.value = t('form.saveError')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!exerciseId.value) {
    return
  }

  loading.value = true

  try {
    const exercise = await queries.getExercise(exerciseId.value)

    if (!exercise || exercise.archivedAt) {
      formError.value = t('form.notFound')
      return
    }

    name.value = exercise.name
    dailyGoal.value = String(exercise.dailyGoal)
  } catch {
    formError.value = t('form.notFound')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="exercise-form-view" aria-labelledby="exercise-form-title">
    <div class="exercise-form-view__intro">
      <span class="exercise-form-view__icon">
        <Sparkles aria-hidden="true" :size="25" />
      </span>
      <div>
        <p class="app-section-label">
          {{ isEditing ? t('form.editEyebrow') : t('form.newEyebrow') }}
        </p>
        <h2 id="exercise-form-title">
          {{ isEditing ? t('form.editTitle') : t('form.newTitle') }}
        </h2>
      </div>
    </div>

    <p v-if="formError" class="app-alert" role="alert">{{ formError }}</p>

    <div v-if="loading" class="exercise-form-view__loading" aria-busy="true" />

    <form
      v-else
      class="exercise-form"
      novalidate
      @submit.prevent="saveExercise"
    >
      <label class="exercise-form__field">
        <span>{{ t('form.name') }}</span>
        <input
          v-model="name"
          autocomplete="off"
          maxlength="80"
          :aria-describedby="nameError ? 'exercise-name-error' : undefined"
          :aria-invalid="Boolean(nameError)"
          :placeholder="t('form.namePlaceholder')"
          type="text"
          @input="nameError = ''"
        />
        <small v-if="nameError" id="exercise-name-error" role="alert">
          {{ nameError }}
        </small>
      </label>

      <label class="exercise-form__field">
        <span>{{ t('form.goal') }}</span>
        <input
          v-model="dailyGoal"
          inputmode="numeric"
          min="1"
          step="1"
          :aria-describedby="goalError ? 'exercise-goal-error' : undefined"
          :aria-invalid="Boolean(goalError)"
          :placeholder="t('form.goalPlaceholder')"
          type="number"
          @input="goalError = ''"
        />
        <small v-if="goalError" id="exercise-goal-error" role="alert">
          {{ goalError }}
        </small>
      </label>

      <button
        class="app-primary-button exercise-form__save"
        type="submit"
        :disabled="saving"
      >
        <Save aria-hidden="true" :size="20" />
        {{ saving ? t('form.saving') : t('form.save') }}
      </button>

      <button
        v-if="isEditing"
        class="exercise-form__archive"
        type="button"
        :disabled="saving"
        @click="archiveExercise"
      >
        <Archive aria-hidden="true" :size="19" />
        {{ t('form.archive') }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.exercise-form-view {
  display: grid;
  gap: 1.5rem;
  width: min(100%, 32rem);
  margin-inline: auto;
  padding-top: 1rem;
}

.exercise-form-view__intro {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.exercise-form-view__icon {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: none;
  place-items: center;
  border: 1px solid var(--color-accent);
  border-radius: 1rem;
  color: var(--color-accent);
  background: rgb(from var(--color-accent) r g b / 0.08);
  box-shadow: 0 0 1.5rem rgb(from var(--color-accent) r g b / 0.18);
}

.exercise-form-view h2 {
  margin: 0.35rem 0 0;
  font-family: var(--font-headline);
  font-size: clamp(2rem, 9vw, 3.2rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
}

.exercise-form {
  display: grid;
  gap: 1.2rem;
  padding: 1.25rem;
  border: 1px solid var(--color-outline);
  border-radius: 1.5rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgb(from var(--color-primary) r g b / 0.1),
      transparent 35%
    ),
    var(--color-surface-container-lowest);
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 0.22);
}

.exercise-form__field {
  display: grid;
  gap: 0.55rem;
}

.exercise-form__field > span {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.exercise-form__field input {
  width: 100%;
  min-height: 3.5rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid var(--color-outline);
  border-radius: 0.9rem;
  outline: 0;
  color: var(--color-on-surface);
  background: var(--color-surface-container-low);
  font-size: 1rem;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.exercise-form__field input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(from var(--color-primary) r g b / 0.15);
}

.exercise-form__field input[aria-invalid='true'] {
  border-color: var(--color-danger);
}

.exercise-form__field small {
  color: var(--color-danger);
  font-size: 0.78rem;
}

.exercise-form__save {
  width: 100%;
  margin-top: 0.35rem;
}

.exercise-form__archive {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid rgb(from var(--color-danger) r g b / 0.45);
  border-radius: 0.9rem;
  color: var(--color-danger);
  background: rgb(from var(--color-danger) r g b / 0.08);
  font-weight: 800;
}

.exercise-form__archive:focus-visible {
  outline: 2px solid var(--color-danger);
  outline-offset: 3px;
}

.exercise-form__loading {
  min-height: 18rem;
  border-radius: 1.5rem;
  background: linear-gradient(
    105deg,
    var(--color-surface-container-lowest) 30%,
    rgb(from var(--color-primary) r g b / 0.12) 45%,
    var(--color-surface-container-lowest) 60%
  );
  background-size: 220% 100%;
  animation: form-loading 1.4s infinite linear;
}

@keyframes form-loading {
  to {
    background-position-x: -220%;
  }
}
</style>
