import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as {
  version: string
}

export default defineConfig({
  define: {
    // Surfacing the package version at build time keeps the installed shell badge aligned with package.json without an extra runtime fetch.
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [
    vue(),
    // The custom-block plugin keeps component-local <i18n> dictionaries available in the built PWA shell.
    VueI18nPlugin({}),
    VitePWA({
      // Prompt mode lets a newly deployed shell download quietly until the app asks the user to refresh.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Vue PWA Template',
        short_name: 'Vue PWA',
        description: 'Reusable mobile-first Vue PWA template.',
        theme_color: '#006d77',
        background_color: '#fbfcfb',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Local font files are part of the installable shell, so both woff2 and woff are precached.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
