<script setup lang="ts">
import { Activity, Check } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  ALTERNATIVE_ACTIVITY_PERCENTAGES,
  type AlternativeActivityPercentageValue
} from '@/progress/write/exercises/domain/AlternativeActivityPercentage'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

const props = defineProps<{
  percentage: AlternativeActivityPercentageValue
  saving: boolean
  error: boolean
}>()

const emit = defineEmits<{
  activate: []
  select: [percentage: AlternativeActivityPercentageValue]
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const draftPercentage = ref(props.percentage)
const pointerActive = ref(false)
const keyboardActive = ref(false)
const saved = ref(false)
const lastCommittedPercentage = ref<AlternativeActivityPercentageValue | null>(
  null
)
let savedTimer: ReturnType<typeof setTimeout> | undefined

const expanded = computed(
  () =>
    pointerActive.value ||
    keyboardActive.value ||
    saved.value ||
    props.saving ||
    props.error
)

const displayedPercentage = computed(() =>
  expanded.value ? draftPercentage.value : props.percentage
)

const sliderStyle = computed(() => ({
  '--alternative-activity-value': `${draftPercentage.value}%`
}))

function statusFor(percentage: AlternativeActivityPercentageValue) {
  if (percentage === 0) {
    return t('alternativeActivity.none')
  }

  if (percentage === 100) {
    return t('alternativeActivity.fullStatus')
  }

  return t('alternativeActivity.selectedStatus', { percentage })
}

const status = computed(() => statusFor(displayedPercentage.value))

function isAllowedPercentage(
  percentage: number
): percentage is AlternativeActivityPercentageValue {
  return ALTERNATIVE_ACTIVITY_PERCENTAGES.some(
    (allowedPercentage) => allowedPercentage === percentage
  )
}

function updateDraftFromInput(event: Event) {
  const percentage = (event.currentTarget as HTMLInputElement).valueAsNumber

  if (isAllowedPercentage(percentage)) {
    draftPercentage.value = percentage
  }
}

function updateDraftFromPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const trackInset = Math.min(28, bounds.width * 0.08)
  const trackWidth = Math.max(1, bounds.width - trackInset * 2)
  const progress = Math.min(
    1,
    Math.max(0, (event.clientX - bounds.left - trackInset) / trackWidth)
  )

  draftPercentage.value = (Math.round(progress * 4) * 25) as
    0 | 25 | 50 | 75 | 100
}

function commitDraft() {
  if (
    props.saving ||
    draftPercentage.value === props.percentage ||
    draftPercentage.value === lastCommittedPercentage.value
  ) {
    return
  }

  lastCommittedPercentage.value = draftPercentage.value
  emit('select', draftPercentage.value)
}

function startPointerInteraction(event: PointerEvent) {
  if (props.saving || !event.isPrimary || event.button !== 0) {
    return
  }

  pointerActive.value = true
  keyboardActive.value = false
  saved.value = false
  clearTimeout(savedTimer)
  emit('activate')
  updateDraftFromPointer(event)
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function continuePointerInteraction(event: PointerEvent) {
  if (pointerActive.value) {
    updateDraftFromPointer(event)
  }
}

function finishPointerInteraction(event: PointerEvent) {
  if (!pointerActive.value) {
    return
  }

  updateDraftFromPointer(event)
  commitDraft()
  pointerActive.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

function cancelPointerInteraction() {
  draftPercentage.value = props.percentage
  pointerActive.value = false
}

function activateFromKeyboard() {
  if (props.saving) {
    return
  }

  draftPercentage.value = props.percentage
  keyboardActive.value = true
  saved.value = false
  clearTimeout(savedTimer)
  emit('activate')
}

function commitKeyboardChange(event: Event) {
  updateDraftFromInput(event)
  commitDraft()
}

watch(
  () => props.percentage,
  (percentage) => {
    draftPercentage.value = percentage

    if (lastCommittedPercentage.value === percentage) {
      lastCommittedPercentage.value = null
    }
  }
)

watch(
  () => props.error,
  (error) => {
    if (error) {
      lastCommittedPercentage.value = null
    }
  }
)

watch(
  () => props.saving,
  (saving, wasSaving) => {
    if (!wasSaving || saving || props.error) {
      return
    }

    saved.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => {
      saved.value = false
    }, 1200)
  }
)

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
  <div
    class="alternative-activity-control"
    :class="{
      'alternative-activity-control--expanded': expanded,
      'alternative-activity-control--keyboard': keyboardActive,
      'alternative-activity-control--active': displayedPercentage > 0,
      'alternative-activity-control--full': displayedPercentage === 100,
      'alternative-activity-control--saving': saving,
      'alternative-activity-control--saved': saved,
      'alternative-activity-control--error': error
    }"
    :style="sliderStyle"
    data-testid="alternative-activity-control"
    @pointerdown="startPointerInteraction"
    @pointermove="continuePointerInteraction"
    @pointerup="finishPointerInteraction"
    @pointercancel="cancelPointerInteraction"
  >
    <span class="alternative-activity-control__icon" aria-hidden="true">
      <Check v-if="displayedPercentage === 100" :size="21" :stroke-width="3" />
      <Activity v-else :size="23" :stroke-width="2.4" />
    </span>

    <span class="alternative-activity-control__copy">
      <span class="alternative-activity-control__eyebrow">
        {{ t('alternativeActivity.eyebrow') }}
      </span>
      <strong>{{ status }}</strong>
      <span
        v-if="saving"
        id="alternative-activity-feedback"
        class="alternative-activity-control__description"
        role="status"
      >
        {{ t('alternativeActivity.saving') }}
      </span>
      <span
        v-else-if="error"
        id="alternative-activity-feedback"
        class="alternative-activity-control__description alternative-activity-control__description--error"
        role="alert"
      >
        {{ t('alternativeActivity.error') }}
      </span>
    </span>

    <span
      v-if="saved"
      class="alternative-activity-control__live-value alternative-activity-control__live-value--saved"
      role="status"
    >
      <Check aria-hidden="true" :size="17" :stroke-width="3" />
      {{ t('alternativeActivity.saved') }}
    </span>
    <span
      v-else-if="expanded"
      class="alternative-activity-control__live-value"
      aria-hidden="true"
    >
      {{ draftPercentage }}<small>%</small>
    </span>

    <div class="alternative-activity-control__slider" aria-hidden="true">
      <div class="alternative-activity-control__track">
        <span class="alternative-activity-control__track-fill" />
        <span class="alternative-activity-control__thumb" />
      </div>
      <div class="alternative-activity-control__stops">
        <span
          v-for="option in ALTERNATIVE_ACTIVITY_PERCENTAGES"
          :key="option"
          :class="{
            'alternative-activity-control__stop--selected':
              draftPercentage === option
          }"
        >
          {{ option }}
        </span>
      </div>
    </div>

    <input
      class="alternative-activity-control__input"
      type="range"
      min="0"
      max="100"
      step="25"
      :value="draftPercentage"
      :aria-label="t('alternativeActivity.sliderLabel', { status })"
      :aria-describedby="
        saving || error ? 'alternative-activity-feedback' : undefined
      "
      :aria-busy="saving"
      :disabled="saving"
      @input="updateDraftFromInput"
      @change="commitKeyboardChange"
      @keyup="commitKeyboardChange"
      @focus="activateFromKeyboard"
      @blur="keyboardActive = false"
    />
  </div>
</template>

<style scoped>
.alternative-activity-control {
  position: relative;
  isolation: isolate;
  display: grid;
  width: 100%;
  min-height: 4.9rem;
  overflow: hidden;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-outline);
  border-radius: 1.15rem;
  color: var(--color-on-surface);
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.045), transparent 52%),
    var(--color-surface-container-lowest);
  box-shadow: 0 0.7rem 1.8rem rgb(0 0 0 / 0.18);
  cursor: ew-resize;
  touch-action: pan-y;
  user-select: none;
  transition:
    min-height 180ms ease,
    border-color 160ms ease,
    transform 100ms ease,
    box-shadow 180ms ease;
}

.alternative-activity-control::before {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: -1;
  width: 0.24rem;
  background: var(--color-accent-warm);
  box-shadow: 0 0 1rem rgb(from var(--color-accent-warm) r g b / 0.58);
  content: '';
  opacity: 0.5;
}

.alternative-activity-control::after {
  position: absolute;
  inset: 0;
  z-index: -2;
  background: radial-gradient(
    circle at var(--alternative-activity-value) 110%,
    rgb(from var(--color-accent-warm) r g b / 0.2),
    transparent 40%
  );
  content: '';
  opacity: 0;
  transition: opacity 180ms ease;
}

.alternative-activity-control:hover {
  border-color: rgb(from var(--color-accent-warm) r g b / 0.72);
}

.alternative-activity-control--keyboard {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}

.alternative-activity-control--expanded {
  min-height: 8.5rem;
  align-content: start;
  border-color: rgb(from var(--color-accent-warm) r g b / 0.8);
  box-shadow:
    0 0 1.8rem rgb(from var(--color-accent-warm) r g b / 0.15),
    0 0.8rem 2rem rgb(0 0 0 / 0.26);
}

.alternative-activity-control--expanded::after {
  opacity: 1;
}

.alternative-activity-control--active::before {
  opacity: 1;
}

.alternative-activity-control--full {
  border-color: rgb(from var(--color-success) r g b / 0.62);
}

.alternative-activity-control--full::before {
  background: var(--color-success);
  box-shadow: 0 0 1rem rgb(from var(--color-success) r g b / 0.65);
}

.alternative-activity-control--saving {
  cursor: wait;
  opacity: 0.88;
}

.alternative-activity-control--saved {
  border-color: rgb(from var(--color-success) r g b / 0.78);
  box-shadow:
    0 0 1.6rem rgb(from var(--color-success) r g b / 0.16),
    0 0.8rem 2rem rgb(0 0 0 / 0.26);
}

.alternative-activity-control--saved::before {
  background: var(--color-success);
  box-shadow: 0 0 1rem rgb(from var(--color-success) r g b / 0.7);
}

.alternative-activity-control--error {
  border-color: rgb(from var(--color-error) r g b / 0.72);
  box-shadow:
    0 0 1.4rem rgb(from var(--color-error) r g b / 0.1),
    0 0.8rem 2rem rgb(0 0 0 / 0.26);
}

.alternative-activity-control__icon {
  display: inline-flex;
  width: 2.8rem;
  height: 2.8rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(from var(--color-accent-warm) r g b / 0.4);
  border-radius: 0.85rem;
  color: var(--color-accent-warm);
  background: rgb(from var(--color-accent-warm) r g b / 0.09);
}

.alternative-activity-control--full .alternative-activity-control__icon {
  color: var(--color-surface);
  border-color: var(--color-success);
  background: var(--color-success);
  box-shadow: 0 0 1rem rgb(from var(--color-success) r g b / 0.34);
}

.alternative-activity-control__copy {
  display: grid;
  min-width: 0;
  gap: 0.14rem;
}

.alternative-activity-control__eyebrow {
  color: var(--color-accent-warm);
  font-family: var(--font-mono);
  font-size: 0.67rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.alternative-activity-control__copy strong {
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1.05rem;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alternative-activity-control__description {
  color: var(--color-secondary);
  font-size: 0.78rem;
  line-height: 1.35;
}

.alternative-activity-control__description--error {
  color: var(--color-error);
}

.alternative-activity-control__live-value {
  min-width: 4.1rem;
  padding: 0.48rem 0.55rem;
  border: 1px solid rgb(from var(--color-accent-warm) r g b / 0.5);
  border-radius: 0.8rem;
  color: var(--color-accent-warm);
  background: rgb(from var(--color-accent-warm) r g b / 0.09);
  box-shadow: inset 0 0 1rem rgb(from var(--color-accent-warm) r g b / 0.07);
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.alternative-activity-control__live-value small {
  margin-left: 0.08rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
}

.alternative-activity-control__live-value--saved {
  display: inline-flex;
  min-width: auto;
  align-items: center;
  gap: 0.3rem;
  color: var(--color-surface);
  border-color: var(--color-success);
  background: var(--color-success);
  box-shadow: 0 0 1rem rgb(from var(--color-success) r g b / 0.3);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.alternative-activity-control__slider {
  grid-column: 1 / -1;
  display: grid;
  max-height: 0;
  gap: 0.62rem;
  opacity: 0;
  transform: translateY(0.45rem);
  transition:
    max-height 180ms ease,
    opacity 140ms ease,
    transform 180ms ease;
}

.alternative-activity-control--expanded .alternative-activity-control__slider {
  max-height: 3.25rem;
  opacity: 1;
  transform: translateY(0);
}

.alternative-activity-control__track {
  position: relative;
  height: 0.55rem;
  margin-inline: 1rem;
  border: 1px solid rgb(from var(--color-outline) r g b / 0.85);
  border-radius: 999px;
  background: var(--color-surface-container-high);
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.42);
}

.alternative-activity-control__track-fill {
  position: absolute;
  inset: -1px auto -1px -1px;
  width: var(--alternative-activity-value);
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--color-primary),
    var(--color-accent-warm)
  );
  box-shadow: 0 0 0.8rem rgb(from var(--color-accent-warm) r g b / 0.5);
}

.alternative-activity-control__thumb {
  position: absolute;
  top: 50%;
  left: var(--alternative-activity-value);
  width: 1.45rem;
  height: 1.45rem;
  border: 0.18rem solid var(--color-surface-container-lowest);
  border-radius: 50%;
  background: var(--color-accent-warm);
  box-shadow:
    0 0 0 0.16rem var(--color-on-surface),
    0 0 1rem rgb(from var(--color-accent-warm) r g b / 0.75);
  transform: translate(-50%, -50%);
}

.alternative-activity-control__stops {
  display: flex;
  justify-content: space-between;
  color: rgb(from var(--color-secondary) r g b / 0.74);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 800;
  line-height: 1;
}

.alternative-activity-control__stops span {
  width: 2rem;
  text-align: center;
}

.alternative-activity-control__stop--selected {
  color: var(--color-on-surface);
  text-shadow: 0 0 0.65rem rgb(from var(--color-accent-warm) r g b / 0.75);
}

.alternative-activity-control__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 23rem) {
  .alternative-activity-control {
    gap: 0.65rem;
    padding-inline: 0.8rem;
  }

  .alternative-activity-control__icon {
    width: 2.55rem;
    height: 2.55rem;
  }

  .alternative-activity-control__description {
    font-size: 0.72rem;
  }

  .alternative-activity-control__live-value {
    min-width: 3.55rem;
    font-size: 1.15rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alternative-activity-control,
  .alternative-activity-control::after,
  .alternative-activity-control__slider {
    transition: none;
  }
}
</style>
