import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './style.css'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const themeStore = useThemeStore()
themeStore.initialize()

const localeStore = useLocaleStore()
localeStore.initialize()

app.mount('#app')
