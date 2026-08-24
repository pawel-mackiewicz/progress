<script setup lang="ts">
import { BadgeCheck, ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  fromLocalDayKey,
  toLocalDayKey,
  type LocalDayKey
} from '@/progress/date'
import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

const props = defineProps<{
  month: Date
  completedDays: LocalDayKey[]
  today: LocalDayKey
}>()

defineEmits<{
  previous: []
  next: []
}>()

const { locale, t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const completedDaySet = computed(() => new Set(props.completedDays))
const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric'
  }).format(props.month)
)
const weekdayLabels = computed(() => {
  const monday = new Date(2024, 0, 1)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)

    return new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' }).format(
      day
    )
  })
})
const cells = computed(() => {
  const year = props.month.getFullYear()
  const month = props.month.getMonth()
  const numberOfDays = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7
  const result: Array<{
    key: string
    date: Date | null
    day: LocalDayKey | null
    completed: boolean
    today: boolean
    future: boolean
  }> = Array.from({ length: leadingBlanks }, (_, index) => ({
    key: `blank-before-${index}`,
    date: null,
    day: null,
    completed: false,
    today: false,
    future: false
  }))

  for (let dayNumber = 1; dayNumber <= numberOfDays; dayNumber += 1) {
    const date = new Date(year, month, dayNumber)
    const day = toLocalDayKey(date)

    result.push({
      key: day,
      date,
      day,
      completed: completedDaySet.value.has(day),
      today: day === props.today,
      future: day > props.today
    })
  }

  while (result.length % 7 !== 0) {
    result.push({
      key: `blank-after-${result.length}`,
      date: null,
      day: null,
      completed: false,
      today: false,
      future: false
    })
  }

  return result
})
const canGoNext = computed(() => {
  const today = fromLocalDayKey(props.today)

  return (
    props.month.getFullYear() < today.getFullYear() ||
    (props.month.getFullYear() === today.getFullYear() &&
      props.month.getMonth() < today.getMonth())
  )
})

function cellLabel(cell: (typeof cells.value)[number]) {
  if (!cell.date) {
    return undefined
  }

  const parts = [
    new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
      cell.date
    )
  ]

  if (cell.today) {
    parts.push(t('calendar.today'))
  }

  if (cell.completed) {
    parts.push(t('calendar.completed'))
  }

  return parts.join(', ')
}
</script>

<template>
  <section class="completion-calendar" aria-labelledby="calendar-title">
    <div class="completion-calendar__intro">
      <div>
        <p class="app-section-label">{{ t('calendar.eyebrow') }}</p>
        <h2 id="calendar-title" class="completion-calendar__title">
          {{ t('calendar.title') }}
        </h2>
      </div>
      <div class="completion-calendar__controls">
        <button
          type="button"
          :aria-label="t('calendar.previous')"
          @click="$emit('previous')"
        >
          <ChevronLeft aria-hidden="true" :size="19" />
        </button>
        <button
          type="button"
          :aria-label="t('calendar.next')"
          :disabled="!canGoNext"
          @click="$emit('next')"
        >
          <ChevronRight aria-hidden="true" :size="19" />
        </button>
      </div>
    </div>

    <p class="completion-calendar__month">{{ monthLabel }}</p>

    <div class="completion-calendar__weekdays" aria-hidden="true">
      <span
        v-for="(weekday, index) in weekdayLabels"
        :key="`${weekday}-${index}`"
      >
        {{ weekday }}
      </span>
    </div>

    <div class="completion-calendar__grid">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="completion-calendar__day"
        :class="{
          'completion-calendar__day--blank': !cell.date,
          'completion-calendar__day--complete': cell.completed,
          'completion-calendar__day--today': cell.today,
          'completion-calendar__day--future': cell.future
        }"
        :aria-label="cellLabel(cell)"
        :data-day="cell.day"
      >
        <span v-if="cell.date">{{ cell.date.getDate() }}</span>
        <BadgeCheck
          v-if="cell.completed"
          class="completion-calendar__badge"
          aria-hidden="true"
          :size="21"
          :stroke-width="2.8"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.completion-calendar {
  padding: 1.25rem;
  border: 1px solid var(--color-outline);
  border-radius: 1.5rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgb(from var(--color-accent) r g b / 0.12),
      transparent 38%
    ),
    var(--color-surface-container-lowest);
  box-shadow: 0 1rem 2.5rem rgb(0 0 0 / 0.18);
}

.completion-calendar__intro,
.completion-calendar__controls,
.completion-calendar__weekdays,
.completion-calendar__grid {
  display: grid;
}

.completion-calendar__intro {
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
}

.completion-calendar__title {
  margin: 0.35rem 0 0;
  font-family: var(--font-headline);
  font-size: 1.35rem;
}

.completion-calendar__controls {
  grid-template-columns: repeat(2, 2.75rem);
  gap: 0.45rem;
}

.completion-calendar__controls button {
  display: inline-flex;
  min-width: 2.75rem;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-outline);
  border-radius: 0.85rem;
  color: var(--color-on-surface);
  background: rgb(255 255 255 / 0.03);
}

.completion-calendar__controls button:hover:not(:disabled),
.completion-calendar__controls button:focus-visible {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.completion-calendar__controls button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.completion-calendar__controls button:disabled {
  opacity: 0.3;
}

.completion-calendar__month {
  margin: 1.25rem 0 0.8rem;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.completion-calendar__weekdays,
.completion-calendar__grid {
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.35rem;
}

.completion-calendar__weekdays {
  margin-bottom: 0.45rem;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 800;
  text-align: center;
  text-transform: uppercase;
}

.completion-calendar__day {
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
}

.completion-calendar__day--today {
  border-color: var(--color-primary);
  color: var(--color-on-surface);
}

.completion-calendar__day--future {
  opacity: 0.28;
}

.completion-calendar__day--complete {
  color: var(--color-success);
  background: rgb(from var(--color-success) r g b / 0.1);
  box-shadow: inset 0 0 1rem rgb(from var(--color-success) r g b / 0.1);
}

.completion-calendar__day--complete > span {
  position: absolute;
  top: 0.18rem;
  left: 0.28rem;
  font-size: 0.55rem;
}

.completion-calendar__badge {
  filter: drop-shadow(0 0 0.4rem rgb(from var(--color-success) r g b / 0.7));
}
</style>
