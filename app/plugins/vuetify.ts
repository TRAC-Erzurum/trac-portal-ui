import { defineNuxtPlugin } from '#app'
import type { ThemeDefinition, VuetifyOptions } from 'vuetify'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook(
    'vuetify:before-create',
    (options: { isDev: boolean; vuetifyOptions: VuetifyOptions }) => {
      const lightTheme: ThemeDefinition = {
        dark: false,
        colors: {
          primary: '#01539D',
          secondary: '#1976D2',
          accent: '#FF6B6B',
          background: '#F5F7FA',
          surface: '#FFFFFF',
          error: '#DC3545',
          warning: '#FFC107',
          info: '#0DCAF0',
          success: '#198754',
          'error-lighten-4': '#FFCDD2',
          'inactive-row': '#F5F5F5',
        },
      }

      const darkTheme: ThemeDefinition = {
        dark: true,
        colors: {
          primary: '#1E88E5',
          secondary: '#64B5F6',
          accent: '#FF8A8A',
          background: '#121212',
          surface: '#1E1E1E',
          error: '#EF5350',
          warning: '#FFB74D',
          info: '#4FC3F7',
          success: '#4CAF50',
          'error-lighten-4': '#4A2626',
          'inactive-row': '#2D2D2D',
        },
      }

      options.vuetifyOptions.theme = {
        defaultTheme: 'light',
        themes: {
          light: lightTheme,
          dark: darkTheme,
        },
      }
    }
  )
})
