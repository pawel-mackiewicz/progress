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
  --confetti-pink: var(--color-accent);
  --confetti-gold: var(--color-accent-warm);
  --confetti-cyan: var(--color-primary);
  --confetti-green: var(--color-success);
  --confetti-violet: #a78bfa;
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
      circle at 50% 43%,
      rgb(from var(--color-primary) r g b / 0.4),
      transparent 27%
    ),
    radial-gradient(
      circle at 30% 68%,
      rgb(from var(--confetti-pink) r g b / 0.16),
      transparent 30%
    ),
    radial-gradient(
      circle at 75% 30%,
      rgb(from var(--confetti-cyan) r g b / 0.14),
      transparent 28%
    ),
    rgb(from var(--color-surface) r g b / 0.88);
  text-align: center;
  backdrop-filter: blur(14px);
}

.celebration::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(18rem, 66vw);
  aspect-ratio: 1;
  border: 2px solid rgb(from var(--color-primary) r g b / 0.32);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgb(from var(--confetti-gold) r g b / 0.17),
    transparent 68%
  );
  box-shadow:
    0 0 4rem rgb(from var(--color-primary) r g b / 0.26),
    inset 0 0 3rem rgb(from var(--confetti-gold) r g b / 0.12);
  content: '';
  animation: celebration-halo 1.4s 120ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__trophy {
  z-index: 1;
  color: var(--confetti-gold);
  filter: drop-shadow(0 0 0.4rem rgb(from var(--confetti-gold) r g b / 0.9))
    drop-shadow(0 0 1.5rem rgb(from var(--color-primary) r g b / 0.7));
  animation: trophy-arrival 680ms cubic-bezier(0.16, 1, 0.3, 1);
}

.celebration > p {
  z-index: 1;
  margin: 1rem 0 0.4rem;
  color: var(--confetti-gold);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-shadow: 0 0 1rem rgb(from var(--confetti-gold) r g b / 0.55);
}

.celebration > strong {
  z-index: 1;
  font-family: var(--font-headline);
  font-size: clamp(2.5rem, 12vw, 5rem);
  line-height: 0.95;
  text-shadow:
    0 0 1.5rem rgb(from var(--color-primary) r g b / 0.42),
    0 0 3rem rgb(from var(--confetti-cyan) r g b / 0.14);
}

.celebration > span {
  z-index: 1;
  max-width: 28rem;
  margin-top: 1rem;
  color: var(--color-secondary);
}

.celebration__confetti {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.celebration__confetti span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.6rem;
  height: 1.15rem;
  border-radius: 0.12rem;
  color: var(--confetti-cyan);
  background: currentColor;
  box-shadow: 0 0 0.75rem currentColor;
  opacity: 0;
  animation: confetti-burst 1.9s calc(var(--piece) * 18ms)
    cubic-bezier(0.15, 0.65, 0.35, 1) both;
}

.celebration__confetti span:nth-child(5n + 1) {
  color: var(--confetti-pink);
}

.celebration__confetti span:nth-child(5n + 2) {
  color: var(--confetti-gold);
}

.celebration__confetti span:nth-child(5n + 3) {
  color: var(--confetti-green);
}

.celebration__confetti span:nth-child(5n + 4) {
  color: var(--confetti-violet);
}

.celebration__confetti span:nth-child(even) {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 50%;
}

.celebration__confetti span:nth-child(odd) {
  --mid-spin: -360deg;
}

.celebration__confetti span:nth-child(even) {
  --mid-spin: 360deg;
}

.celebration__confetti span:nth-child(1) {
  --piece: 1;
  --x: -47vw;
  --y: -30vh;
  --drift: 4vw;
  --spin: -760deg;
}

.celebration__confetti span:nth-child(2) {
  --piece: 2;
  --x: -36vw;
  --y: -43vh;
  --drift: -3vw;
  --spin: 680deg;
}

.celebration__confetti span:nth-child(3) {
  --piece: 3;
  --x: -24vw;
  --y: -48vh;
  --drift: 6vw;
  --spin: -920deg;
}

.celebration__confetti span:nth-child(4) {
  --piece: 4;
  --x: -11vw;
  --y: -42vh;
  --drift: -5vw;
  --spin: 800deg;
}

.celebration__confetti span:nth-child(5) {
  --piece: 5;
  --x: 4vw;
  --y: -49vh;
  --drift: 5vw;
  --spin: -700deg;
}

.celebration__confetti span:nth-child(6) {
  --piece: 6;
  --x: 17vw;
  --y: -44vh;
  --drift: -4vw;
  --spin: 900deg;
}

.celebration__confetti span:nth-child(7) {
  --piece: 7;
  --x: 31vw;
  --y: -39vh;
  --drift: 6vw;
  --spin: -840deg;
}

.celebration__confetti span:nth-child(8) {
  --piece: 8;
  --x: 46vw;
  --y: -27vh;
  --drift: -4vw;
  --spin: 720deg;
}

.celebration__confetti span:nth-child(9) {
  --piece: 9;
  --x: -45vw;
  --y: -14vh;
  --drift: 7vw;
  --spin: -860deg;
}

.celebration__confetti span:nth-child(10) {
  --piece: 10;
  --x: -32vw;
  --y: -25vh;
  --drift: -5vw;
  --spin: -780deg;
}

.celebration__confetti span:nth-child(11) {
  --piece: 11;
  --x: -18vw;
  --y: -34vh;
  --drift: 8vw;
  --spin: -960deg;
}

.celebration__confetti span:nth-child(12) {
  --piece: 12;
  --x: 21vw;
  --y: -32vh;
  --drift: -7vw;
  --spin: -880deg;
}

.celebration__confetti span:nth-child(13) {
  --piece: 13;
  --x: 34vw;
  --y: -24vh;
  --drift: 5vw;
  --spin: -740deg;
}

.celebration__confetti span:nth-child(14) {
  --piece: 14;
  --x: 47vw;
  --y: -11vh;
  --drift: -7vw;
  --spin: -940deg;
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
  0% {
    opacity: 0;
    transform: scale(0.15) rotate(-22deg);
  }

  68% {
    opacity: 1;
    transform: scale(1.16) rotate(5deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes celebration-halo {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes confetti-burst {
  0% {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.2) rotate(0);
  }

  12% {
    opacity: 1;
  }

  45% {
    opacity: 1;
    transform: translate3d(calc(-50% + var(--x)), calc(-50% + var(--y)), 0)
      scale(1) rotate(var(--mid-spin));
  }

  100% {
    opacity: 0;
    transform: translate3d(
        calc(-50% + var(--x) + var(--drift)),
        calc(-50% + 62vh),
        0
      )
      scale(0.78) rotate(var(--spin));
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebration::before,
  .celebration__trophy {
    animation: none;
  }

  .celebration__confetti {
    display: none;
  }

  .celebration-enter-active,
  .celebration-leave-active {
    transition-duration: 1ms;
  }
}
</style>
