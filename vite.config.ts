import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: '/',
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['leaflet', 'leaflet.markercluster'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (/node_modules\/(vue|@vue|vue-router|pinia)\//.test(id)) return 'vue-vendor'
          if (/node_modules\/(vue-i18n|@intlify|vue-sonner|lucide-vue-next)\//.test(id)) return 'ui-vendor'
        }
      }
    }
  }
})
