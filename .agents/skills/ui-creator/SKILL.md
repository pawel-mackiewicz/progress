---
name: ui-creator
description: Design, implement, refine, or review the user interface for this Vue PWA, including components, layouts, styling, motion, responsive behavior, accessibility, Storybook states, and UI tests. Use whenever requested work changes what users see or interact with; do not use for domain or infrastructure-only work.
---

# UI Creator

Make this app feel beautiful, distinctive, and rewarding to use. Treat visual craft and interaction feedback as part of the product behavior, not decoration added at the end. The user's instructions take precedence over this skill.

## Art Direction

- Preserve and evolve the existing dark neon identity: deep surfaces, cyan as the primary signal, pink and gold accents, lime success states, expressive Space Grotesk headlines, readable Inter body copy, and JetBrains Mono labels.
- Use reward-led intensity. Put the boldest glow, motion, particles, reveals, and celebration around progress, completed actions, streaks, personal bests, and milestones. Keep navigation, forms, and supporting information calmer so the reward moments hit harder.
- Make wildness communicate state. Every flash, pulse, burst, sound, or haptic idea must help the user understand what happened or feel that effort was recognized.
- Avoid generic dashboard sameness. Build deliberate hierarchy with confident typography, layered light, controlled asymmetry, tactile controls, and memorable transitions while keeping the next action obvious.
- Extend shared tokens in `src/ui/style.css` when a value is part of the product language. Keep one-off values local when they belong to a single visual composition.

## Mobile-First Craft

- Design for a narrow touch screen first, then expand the composition for wider screens. Account for safe areas, short viewports, long translated copy, and one-handed use.
- Make interactive targets comfortably tappable, expose visible focus states, and never make hover the only way to discover information or an action.
- Preserve semantic HTML, logical focus order, useful accessible names, sufficient contrast, and live-region behavior where status changes need announcing.
- Provide a meaningful `prefers-reduced-motion` experience. Reduced motion should retain hierarchy and feedback without merely making long animations slightly shorter.
- Favor transform and opacity for frequent animation. Do not let visual effects block input, shift layout unexpectedly, obscure essential content, or make routine interactions tiring.
- Keep the experience PWA-friendly: responsive, lightweight enough for mobile devices, resilient without hover, and compatible with offline-loaded application UI.

## Work in This Repository

1. Read the applicable `AGENTS.md`, then inspect only the relevant view or component, its closest styles or tokens, nearby story and spec, and any affected E2E journey. Stop when the current behavior and visual context are clear.
2. Before editing, define a one-sentence visual intent and identify the primary action or reward moment. Ask the user when product intent or the desired degree of change remains genuinely ambiguous.
3. Use Vue 3, TypeScript, the Composition API, existing localization patterns, and existing components where they fit. Keep user-visible copy in i18n messages.
4. Design all applicable states together: default, pressed, focused, disabled, loading, empty, error, success, completion, and reduced motion. Do not polish only the happy-path screenshot.
5. Suitable motion or graphics dependencies are allowed when they materially improve the result. Prefer focused, tree-shakeable packages that work well with Vue and mobile browsers; consider bundle cost and runtime smoothness, and explain the dependency choice in the handoff.
6. If a compatible app URL or server is already available, inspect the rendered result at mobile and desktop sizes and iterate until hierarchy, spacing, typography, motion, and state transitions feel intentional. Never start a development or Storybook server. If rendering is unavailable, say that visual QA was not performed rather than claiming the result was visually verified.

## Verification

- Write or update tests as a user story, using `given`/`when`/`then`-style helpers when they make intent clearer. Assert observable behavior instead of CSS implementation details.
- Add or update Storybook stories for meaningful component states and responsive or interaction variants introduced by the change.
- Run the smallest relevant unit, Storybook, typecheck, lint, or build checks that validate the work without starting a server.
- After any UI or data change, inspect the relevant `E2E/**/*.spec.ts` journey and update it when visible behavior, accessible names, selectors, copy, state transitions, or user flow changed.
- Do not run a command that can start the development server. Run E2E checks only when their configured server is already available and the command will reuse it.

## Done Means

The primary action is unmistakable, reward moments feel earned and exciting, routine use remains calm and fast, mobile and wider layouts are intentional, accessibility and reduced motion are first-class, applicable stories and tests agree with the UI, and the final handoff says what changed and why.
