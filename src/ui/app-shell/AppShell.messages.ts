export const APP_SHELL_MESSAGES = {
  pl: {
    app: {
      name: 'Progress'
    },
    header: {
      back: 'Wróć',
      language: 'Język'
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
      language: 'Language'
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
