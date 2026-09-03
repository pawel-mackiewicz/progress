<script setup lang="ts">
import { Trophy } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

defineProps<{
  visible: boolean
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})
</script>

<template>
  <Transition name="celebration">
    <div v-if="visible" class="celebration" role="status" aria-live="assertive">
      <div class="celebration__confetti" aria-hidden="true">
        <span v-for="index in 14" :key="index" />
      </div>
      <Trophy class="celebration__trophy" aria-hidden="true" :size="54" />
      <p>{{ t('celebration.kicker') }}</p>
      <strong>{{ t('celebration.title') }}</strong>
      <span>{{ t('celebration.body') }}</span>
    </div>
  </Transition>
</template>

<style scoped>
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

.celebration-enter-active,
.celebration-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
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
</style>
