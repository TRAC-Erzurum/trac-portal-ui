import { createApp } from 'vue'
import { createPinia } from 'pinia'
import L from 'leaflet'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './style.css'
import '@/lib/echarts'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'

// Expose Leaflet globally so @vue-leaflet/vue-leaflet can use it (avoids "Default" undefined in Vite dev)
if (typeof window !== 'undefined') (window as unknown as { L: typeof L }).L = L

const app = createApp(App)
const pinia = createPinia()

app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Component:', instance)
  console.error('Info:', info)
}

app.use(pinia)
app.use(router)
app.use(i18n)

const themeStore = useThemeStore()
themeStore.initialize()

const localeStore = useLocaleStore()
localeStore.initialize()

app.mount('#app')
