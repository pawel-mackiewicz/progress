<script setup lang="ts">
import { Check, Sparkles, Trophy } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

import { PROGRESS_MESSAGES } from '@/ui/progress/Progress.messages'

defineProps<{
  visible: boolean
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: PROGRESS_MESSAGES
})

const confettiPieces = [
  [-62, -15, -820, 30, 'pink', 'shard'],
  [-57, -36, 740, 0, 'gold', 'dot'],
  [-44, -55, -920, 90, 'cyan', 'sliver'],
  [-25, -65, 810, 20, 'lime', 'shard'],
  [-5, -70, -780, 130, 'violet', 'dot'],
  [16, -67, 940, 55, 'pink', 'sliver'],
  [36, -59, -860, 10, 'gold', 'shard'],
  [52, -43, 760, 110, 'cyan', 'dot'],
  [61, -22, -980, 45, 'lime', 'sliver'],
  [64, 3, 880, 145, 'violet', 'shard'],
  [60, 27, -720, 70, 'pink', 'dot'],
  [48, 48, 840, 175, 'cyan', 'sliver'],
  [30, 62, -940, 210, 'lime', 'dot'],
  [9, 69, 800, 155, 'gold', 'shard'],
  [-14, 68, -860, 235, 'pink', 'sliver'],
  [-35, 59, 900, 185, 'violet', 'dot'],
  [-52, 43, -960, 220, 'cyan', 'shard'],
  [-62, 22, 780, 165, 'pink', 'dot'],
  [-49, -48, -880, 250, 'gold', 'sliver'],
  [48, -52, 920, 195, 'lime', 'shard'],
  [54, 39, -760, 280, 'violet', 'dot'],
  [-45, 51, 840, 270, 'cyan', 'sliver']
].map(([x, y, spin, delay, color, shape], index) => ({
  id: index,
  className: [
    `celebration__particle--${color}`,
    `celebration__particle--${shape}`
  ],
  style: `--particle-x-mid: ${Number(x) * 0.72}vw; --particle-y-mid: ${Number(y) * 0.72}vh; --particle-x: ${Number(x) * 1.12}vw; --particle-y: ${Number(y) * 1.12}vh; --particle-mid-spin: ${Number(spin) * 0.52}deg; --particle-spin: ${spin}deg; --particle-delay: ${delay}ms`
}))
</script>

<template>
  <Transition name="celebration">
    <section
      v-if="visible"
      class="celebration"
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby="completion-celebration-title"
      aria-describedby="completion-celebration-description"
    >
      <div class="celebration__grid" aria-hidden="true" />
      <div class="celebration__rays" aria-hidden="true" />

      <div class="celebration__shockwaves" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div class="celebration__confetti" aria-hidden="true">
        <span
          v-for="piece in confettiPieces"
          :key="piece.id"
          class="celebration__particle"
          :class="piece.className"
          :style="piece.style"
        />
      </div>

      <div class="celebration__content">
        <div class="celebration__emblem" aria-hidden="true">
          <span class="celebration__orbit celebration__orbit--outer" />
          <span class="celebration__orbit celebration__orbit--inner" />
          <span class="celebration__spark celebration__spark--left">
            <Sparkles :size="20" :stroke-width="2.4" />
          </span>
          <span class="celebration__spark celebration__spark--right">
            <Sparkles :size="16" :stroke-width="2.4" />
          </span>
          <span class="celebration__trophy-shell">
            <span class="celebration__trophy-shine" />
            <Trophy
              class="celebration__trophy"
              :size="58"
              :stroke-width="1.8"
            />
          </span>
        </div>

        <p class="celebration__kicker">
          <span />
          {{ t('celebration.kicker') }}
          <span />
        </p>

        <h2 id="completion-celebration-title">
          {{ t('celebration.title') }}
        </h2>

        <p
          id="completion-celebration-description"
          class="celebration__description"
        >
          {{ t('celebration.body') }}
        </p>

        <div class="celebration__completion-mark" aria-hidden="true">
          <span class="celebration__rule" />
          <span class="celebration__completion-badge">
            <Check :size="17" :stroke-width="3.2" />
            100%
          </span>
          <span class="celebration__rule" />
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.celebration {
  --celebration-pink: var(--color-accent);
  --celebration-gold: var(--color-accent-warm);
  --celebration-cyan: var(--color-primary);
  --celebration-lime: var(--color-success);
  --celebration-violet: #a78bfa;
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: max(1.25rem, env(safe-area-inset-top))
    max(1.25rem, env(safe-area-inset-right))
    max(1.25rem, env(safe-area-inset-bottom))
    max(1.25rem, env(safe-area-inset-left));
  color: var(--color-on-surface);
  background:
    radial-gradient(
      circle at 50% 44%,
      rgb(from var(--celebration-cyan) r g b / 0.22),
      transparent min(45vw, 24rem)
    ),
    radial-gradient(
      circle at 18% 88%,
      rgb(from var(--celebration-pink) r g b / 0.17),
      transparent 36rem
    ),
    radial-gradient(
      circle at 88% 12%,
      rgb(from var(--celebration-violet) r g b / 0.14),
      transparent 32rem
    ),
    rgb(from var(--color-surface) r g b / 0.94);
  isolation: isolate;
  text-align: center;
  backdrop-filter: blur(18px) saturate(1.18);
}

.celebration::before,
.celebration::after {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: '';
}

.celebration::before {
  background:
    linear-gradient(
      115deg,
      transparent 28%,
      rgb(255 255 255 / 0.025) 48%,
      transparent 68%
    ),
    radial-gradient(
      ellipse at 50% 112%,
      rgb(from var(--celebration-cyan) r g b / 0.2),
      transparent 52%
    );
  animation: atmosphere-arrival 900ms ease-out both;
}

.celebration::after {
  background: radial-gradient(circle, transparent 28%, rgb(2 2 9 / 0.72) 100%);
}

.celebration__grid {
  position: absolute;
  inset: -4rem;
  z-index: -1;
  background:
    linear-gradient(
      rgb(from var(--celebration-cyan) r g b / 0.055) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgb(from var(--celebration-cyan) r g b / 0.055) 1px,
      transparent 1px
    );
  background-size: 2.5rem 2.5rem;
  mask-image: radial-gradient(circle at center, black, transparent 68%);
  opacity: 0.72;
  transform: perspective(32rem) rotateX(58deg) translateY(42%);
  transform-origin: center bottom;
  animation: grid-arrival 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__rays {
  position: absolute;
  z-index: -1;
  width: min(54rem, 160vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background: repeating-conic-gradient(
    from -8deg,
    transparent 0deg 12deg,
    rgb(from var(--celebration-cyan) r g b / 0.075) 13deg 14deg,
    transparent 15deg 29deg,
    rgb(from var(--celebration-gold) r g b / 0.055) 30deg 31deg
  );
  mask-image: radial-gradient(
    circle,
    transparent 0 12%,
    black 25%,
    transparent 72%
  );
  animation:
    rays-arrival 1s 80ms cubic-bezier(0.16, 1, 0.3, 1) both,
    rays-turn 18s 1s linear infinite;
}

.celebration__shockwaves {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -1;
  width: min(21rem, 78vw);
  aspect-ratio: 1;
  pointer-events: none;
  transform: translate(-50%, -55%);
}

.celebration__shockwaves span {
  position: absolute;
  inset: 0;
  border: 1px solid rgb(from var(--celebration-cyan) r g b / 0.68);
  border-radius: 50%;
  box-shadow:
    0 0 1.2rem rgb(from var(--celebration-cyan) r g b / 0.4),
    inset 0 0 1.2rem rgb(from var(--celebration-cyan) r g b / 0.18);
  opacity: 0;
  animation: shockwave 1.4s 120ms cubic-bezier(0.15, 0.7, 0.2, 1) both;
}

.celebration__shockwaves span:nth-child(2) {
  border-color: rgb(from var(--celebration-gold) r g b / 0.55);
  animation-delay: 250ms;
}

.celebration__shockwaves span:nth-child(3) {
  border-color: rgb(from var(--celebration-lime) r g b / 0.45);
  animation-delay: 390ms;
}

.celebration__content {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(100%, 40rem);
  justify-items: center;
}

.celebration__emblem {
  position: relative;
  display: grid;
  width: clamp(8rem, 34vw, 11rem);
  aspect-ratio: 1;
  place-items: center;
  animation: emblem-arrival 780ms 40ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__orbit {
  position: absolute;
  border-radius: 50%;
}

.celebration__orbit--outer {
  inset: 0;
  border: 1px dashed rgb(from var(--celebration-cyan) r g b / 0.48);
  box-shadow: 0 0 2.2rem rgb(from var(--celebration-cyan) r g b / 0.18);
  animation: orbit-turn 9s linear infinite;
}

.celebration__orbit--outer::before,
.celebration__orbit--outer::after {
  position: absolute;
  left: 50%;
  width: 0.48rem;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--celebration-gold);
  box-shadow:
    0 0 0.5rem var(--celebration-gold),
    0 0 1.2rem var(--celebration-gold);
  content: '';
  transform: translateX(-50%);
}

.celebration__orbit--outer::before {
  top: -0.24rem;
}

.celebration__orbit--outer::after {
  bottom: -0.24rem;
}

.celebration__orbit--inner {
  inset: 0.85rem;
  border: 1px solid rgb(from var(--celebration-gold) r g b / 0.24);
  background: radial-gradient(
    circle,
    rgb(from var(--celebration-gold) r g b / 0.13),
    rgb(from var(--celebration-cyan) r g b / 0.06) 48%,
    transparent 68%
  );
  box-shadow:
    inset 0 0 2.2rem rgb(from var(--celebration-gold) r g b / 0.1),
    0 0 2.8rem rgb(from var(--celebration-cyan) r g b / 0.16);
}

.celebration__trophy-shell {
  position: relative;
  display: grid;
  width: clamp(4.7rem, 19vw, 6.2rem);
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgb(from var(--celebration-gold) r g b / 0.72);
  border-radius: 1.7rem;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 0.13), transparent 40%),
    linear-gradient(
      145deg,
      rgb(from var(--celebration-gold) r g b / 0.2),
      rgb(from var(--celebration-cyan) r g b / 0.1)
    ),
    var(--color-surface-container-lowest);
  box-shadow:
    0 0 0 1px rgb(255 255 255 / 0.07) inset,
    0 0 1.8rem rgb(from var(--celebration-gold) r g b / 0.38),
    0 0 4rem rgb(from var(--celebration-cyan) r g b / 0.3),
    0 1rem 2rem rgb(0 0 0 / 0.45);
  transform: rotate(45deg);
}

.celebration__trophy-shine {
  position: absolute;
  inset: -35%;
  background: linear-gradient(
    110deg,
    transparent 35%,
    rgb(255 255 255 / 0.55) 48%,
    transparent 61%
  );
  transform: translateX(-85%);
  animation: trophy-shine 820ms 520ms ease-out both;
}

.celebration__trophy {
  color: var(--celebration-gold);
  filter: drop-shadow(0 0 0.35rem rgb(from var(--celebration-gold) r g b / 0.9))
    drop-shadow(0 0 1rem rgb(from var(--celebration-cyan) r g b / 0.55));
  transform: rotate(-45deg);
}

.celebration__spark {
  position: absolute;
  display: grid;
  place-items: center;
  color: var(--celebration-lime);
  filter: drop-shadow(0 0 0.55rem currentColor);
  animation: spark-pop 480ms 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__spark--left {
  top: 12%;
  left: -4%;
  transform: rotate(-14deg);
}

.celebration__spark--right {
  right: -1%;
  bottom: 16%;
  color: var(--celebration-pink);
  animation-delay: 760ms;
  transform: rotate(12deg);
}

.celebration__kicker {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 1.15rem 0 0.55rem;
  color: var(--celebration-gold);
  font-family: var(--font-mono);
  font-size: clamp(0.68rem, 2.8vw, 0.78rem);
  font-weight: 900;
  letter-spacing: 0.2em;
  line-height: 1.2;
  text-shadow: 0 0 1rem rgb(from var(--celebration-gold) r g b / 0.58);
  animation: copy-arrival 520ms 330ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__kicker span {
  width: clamp(1.3rem, 8vw, 3.2rem);
  height: 1px;
  background: linear-gradient(90deg, transparent, currentColor);
  box-shadow: 0 0 0.5rem currentColor;
}

.celebration__kicker span:last-child {
  background: linear-gradient(90deg, currentColor, transparent);
}

.celebration h2 {
  max-width: 11ch;
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(2.8rem, 13.8vw, 5.8rem);
  font-weight: 850;
  letter-spacing: -0.065em;
  line-height: 0.88;
  text-wrap: balance;
  text-shadow:
    0 0 1.2rem rgb(from var(--celebration-cyan) r g b / 0.46),
    0 0 3.4rem rgb(from var(--celebration-violet) r g b / 0.2);
  animation: title-arrival 620ms 390ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@supports (-webkit-background-clip: text) {
  .celebration h2 {
    color: transparent;
    background: linear-gradient(
      112deg,
      var(--color-on-surface) 16%,
      #d9fdff 46%,
      var(--celebration-cyan) 72%,
      var(--color-on-surface) 94%
    );
    background-clip: text;
    -webkit-background-clip: text;
  }
}

.celebration__description {
  max-width: 30rem;
  margin: 1rem 0 0;
  color: #c3c3d8;
  font-size: clamp(0.92rem, 3.5vw, 1.08rem);
  line-height: 1.55;
  text-wrap: balance;
  animation: copy-arrival 520ms 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__completion-mark {
  display: grid;
  width: min(100%, 20rem);
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.3rem;
  animation: copy-arrival 520ms 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.celebration__rule {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(from var(--celebration-lime) r g b / 0.72)
  );
  box-shadow: 0 0 0.55rem rgb(from var(--celebration-lime) r g b / 0.42);
}

.celebration__rule:last-child {
  background: linear-gradient(
    90deg,
    rgb(from var(--celebration-lime) r g b / 0.72),
    transparent
  );
}

.celebration__completion-badge {
  display: inline-flex;
  min-height: 2.15rem;
  align-items: center;
  gap: 0.38rem;
  padding: 0.4rem 0.72rem;
  border: 1px solid rgb(from var(--celebration-lime) r g b / 0.55);
  border-radius: 999px;
  color: var(--celebration-lime);
  background: rgb(from var(--celebration-lime) r g b / 0.08);
  box-shadow:
    0 0 1rem rgb(from var(--celebration-lime) r g b / 0.16),
    inset 0 0 0.8rem rgb(from var(--celebration-lime) r g b / 0.06);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.celebration__confetti {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.celebration__particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.48rem;
  height: 1.1rem;
  border-radius: 0.1rem;
  color: var(--celebration-cyan);
  background: currentColor;
  box-shadow: 0 0 0.75rem currentColor;
  opacity: 0;
  animation: confetti-burst 1.65s var(--particle-delay)
    cubic-bezier(0.12, 0.72, 0.22, 1) both;
}

.celebration__particle--pink {
  color: var(--celebration-pink);
}

.celebration__particle--gold {
  color: var(--celebration-gold);
}

.celebration__particle--lime {
  color: var(--celebration-lime);
}

.celebration__particle--violet {
  color: var(--celebration-violet);
}

.celebration__particle--dot {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
}

.celebration__particle--sliver {
  width: 0.2rem;
  height: 1.35rem;
  border-radius: 999px;
}

.celebration-enter-active {
  transition: opacity 180ms ease-out;
}

.celebration-leave-active {
  transition:
    opacity 240ms ease-in,
    transform 240ms ease-in;
}

.celebration-enter-from {
  opacity: 0;
}

.celebration-leave-to {
  opacity: 0;
  transform: scale(1.025);
}

@keyframes atmosphere-arrival {
  from {
    opacity: 0;
    transform: scale(1.12);
  }
}

@keyframes grid-arrival {
  from {
    opacity: 0;
    transform: perspective(32rem) rotateX(58deg) translateY(58%);
  }
}

@keyframes rays-arrival {
  from {
    opacity: 0;
    transform: scale(0.55) rotate(-10deg);
  }

  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes rays-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shockwave {
  0% {
    opacity: 0;
    transform: scale(0.32);
  }

  18% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
    transform: scale(2.4);
  }
}

@keyframes emblem-arrival {
  0% {
    opacity: 0;
    transform: scale(0.18) rotate(-24deg);
  }

  68% {
    opacity: 1;
    transform: scale(1.1) rotate(3deg);
  }

  100% {
    transform: scale(1) rotate(0);
  }
}

@keyframes orbit-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes trophy-shine {
  to {
    transform: translateX(85%);
  }
}

@keyframes spark-pop {
  from {
    opacity: 0;
    scale: 0;
  }
}

@keyframes title-arrival {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.92);
  }
}

@keyframes copy-arrival {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

@keyframes confetti-burst {
  0% {
    opacity: 0;
    transform: translate3d(-50%, -50%, 0) scale(0.15) rotate(0);
  }

  7% {
    opacity: 1;
  }

  62% {
    opacity: 1;
    transform: translate3d(
        calc(-50% + var(--particle-x-mid)),
        calc(-50% + var(--particle-y-mid)),
        0
      )
      scale(1) rotate(var(--particle-mid-spin));
  }

  100% {
    opacity: 0;
    transform: translate3d(
        calc(-50% + var(--particle-x)),
        calc(-50% + var(--particle-y)),
        0
      )
      scale(0.42) rotate(var(--particle-spin));
  }
}

@media (min-width: 48rem) {
  .celebration__content {
    transform: translateY(-1vh);
  }

  .celebration__description {
    margin-top: 1.2rem;
  }
}

@media (max-height: 40rem) {
  .celebration__emblem {
    width: 7rem;
  }

  .celebration__trophy-shell {
    width: 4.25rem;
    border-radius: 1.2rem;
  }

  .celebration__trophy {
    width: 2.65rem;
    height: 2.65rem;
  }

  .celebration__kicker {
    margin-top: 0.65rem;
  }

  .celebration h2 {
    font-size: clamp(2.3rem, 10vw, 3.75rem);
  }

  .celebration__description {
    margin-top: 0.7rem;
  }

  .celebration__completion-mark {
    margin-top: 0.8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .celebration__confetti,
  .celebration__rays,
  .celebration__shockwaves {
    display: none;
  }

  .celebration::before,
  .celebration__grid,
  .celebration__emblem,
  .celebration__orbit--outer,
  .celebration__trophy-shine,
  .celebration__spark,
  .celebration__kicker,
  .celebration h2,
  .celebration__description,
  .celebration__completion-mark {
    animation: none;
  }
}
</style>
