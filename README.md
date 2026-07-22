# Vue PWA Template

Reusable Vue 3, Vite, TypeScript, and PWA starter for mobile-first apps deployed on Cloudflare.

## Start

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm run build
```

Use `pnpm dev` for local development when you want to run the app locally.

## Step 1: App Identity

Update these files for each app created from the template:

- `package.json`: set `name`, `version`, and scripts that should stay for the new app.
- `index.html`: set `<title>`, meta description, and theme color.
- `vite.config.ts`: set the PWA manifest `name`, `short_name`, `description`, theme color, background color, and icon list.
- `public/favicon.svg` and `public/icons/*`: replace the placeholder assets with app-specific icons.

## Step 2: Cloudflare

`wrangler.jsonc` uses a neutral prod worker name and no custom domains.

For a real app:

- Set the top-level `name`.
- Set `env.prod.name`.
- Add custom domain `routes` only when the domains are ready.
- Keep `assets.not_found_handling` as `single-page-application` for Vue Router history mode.
- Add these repository secrets before using GitHub Actions deployment:
  - `CLOUDFLARE_API_TOKEN`: Cloudflare API token configured for Workers deploys.
  - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID for the target account.
- Follow Cloudflare's Workers GitHub Actions docs for the required API token permissions:
  https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/#api-token

Example route block:

```jsonc
"routes": [
  {
    "pattern": "app.example.com",
    "custom_domain": true
  }
]
```

## Step 3: Shell And Routes

The template ships with one route, `/`, rendered by `src/ui/views/HomeView.vue`.

When adding app screens:

- Add the view component under `src/ui/views`.
- Register the route in `src/ui/router/index.ts`.
- Add a route title key in `src/ui/app-shell/AppShell.config.ts`.
- Add visible copy in `src/ui/app-shell/AppShell.messages.ts`.
- Add a bottom navigation item only for primary mobile destinations.
- Use route meta `showBack`, `backTo`, and `hideBottomNav` for detail or full-screen flows.

## Step 4: Data Layer

No app data layer is included. Add storage only when the new app needs it.

Recommended defaults:

- Use API services for server-backed apps.
- Use a small composable or Pinia store for UI-only state.
- Add browser storage deliberately, with tests that describe the user flow and failure path.

## Step 5: Tests

Keep tests story-like: name the user situation, action, and outcome.

Current checks cover:

- The neutral home route.
- The mobile shell around route content.
- Header back behavior.
- Bottom navigation visibility and active state.
- Locale detection and persistence.

Run:

```sh
pnpm typecheck
pnpm test
pnpm run build
```
