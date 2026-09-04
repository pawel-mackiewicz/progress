import { createApp } from 'vue'

import { createAppServices } from './appServices'
import { ProgressDatabase } from './db'
import { provideAppServices } from './ui/appServices'
import { i18n } from './ui/i18n'
import App from './ui/App.vue'
import router from './ui/router'
import { registerPwa } from './ui/pwa/register'
import { requestPersistentStorage } from './ui/pwa/storage'
import './ui/fonts.css'
import './ui/style.css'

registerPwa({
  immediate: true,
  onRegisterError(error) {
    console.error('Failed to register the service worker.', error)
  }
})

void requestPersistentStorage()

const app = createApp(App)
const services = createAppServices(new ProgressDatabase())

provideAppServices(app, services)

app.use(i18n).use(router).mount('#app')
