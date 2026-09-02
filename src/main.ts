import { createApp } from 'vue'

import { requestPersistentStorage } from './progress/database'
import { i18n } from './ui/i18n'
import App from './ui/App.vue'
import router from './ui/router'
import { registerPwa } from './ui/pwa/register'
import './ui/fonts.css'
import './ui/style.css'

registerPwa({
  immediate: true,
  onRegisterError(error) {
    console.error('Failed to register the service worker.', error)
  }
})

void requestPersistentStorage()

createApp(App).use(i18n).use(router).mount('#app')
