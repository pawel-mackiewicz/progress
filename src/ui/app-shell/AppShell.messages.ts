export const APP_SHELL_MESSAGES = {
  pl: {
    app: {
      name: 'Progress'
    },
    header: {
      back: 'Wróć',
      language: 'Język',
      updates: {
        check: 'Sprawdź aktualizacje',
        checking: 'Sprawdzanie aktualizacji…',
        found: 'Znaleziono aktualizację. Instalowanie…',
        upToDate: 'Masz najnowszą wersję',
        error: 'Nie udało się sprawdzić aktualizacji'
      }
    },
    routes: {
      home: 'Progress',
      exerciseNew: 'Nowe ćwiczenie',
      exerciseEdit: 'Edytuj ćwiczenie'
    },
    home: {
      eyebrow: 'Template',
      title: 'Vue PWA Template',
      body: 'Mobile-first shell ready for your app.',
      versionLabel: 'Version',
      pwaLabel: 'PWA',
      pwaValue: 'Enabled',
      routerLabel: 'Routing',
      routerValue: 'Ready'
    }
  },
  en: {
    app: {
      name: 'Progress'
    },
    header: {
      back: 'Go back',
      language: 'Language',
      updates: {
        check: 'Check for updates',
        checking: 'Checking for updates…',
        found: 'Update found. Installing…',
        upToDate: 'You’re up to date',
        error: 'Unable to check for updates'
      }
    },
    routes: {
      home: 'Progress',
      exerciseNew: 'New exercise',
      exerciseEdit: 'Edit exercise'
    },
    home: {
      eyebrow: 'Template',
      title: 'Vue PWA Template',
      body: 'Mobile-first shell ready for your app.',
      versionLabel: 'Version',
      pwaLabel: 'PWA',
      pwaValue: 'Enabled',
      routerLabel: 'Routing',
      routerValue: 'Ready'
    }
  }
} as const

export type AppShellLocale = keyof typeof APP_SHELL_MESSAGES
