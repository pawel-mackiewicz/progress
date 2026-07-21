export const APP_SHELL_MESSAGES = {
  pl: {
    app: {
      name: 'Vue PWA Template'
    },
    header: {
      back: 'Wroc'
    },
    network: {
      offline: 'Offline'
    },
    routes: {
      home: 'Home'
    },
    bottomNav: {
      home: 'Home'
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
      name: 'Vue PWA Template'
    },
    header: {
      back: 'Go back'
    },
    network: {
      offline: 'Offline'
    },
    routes: {
      home: 'Home'
    },
    bottomNav: {
      home: 'Home'
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
