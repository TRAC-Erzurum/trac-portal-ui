import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'trac-theme'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const effectiveTheme = ref<'dark' | 'light'>('dark')

  function getSystemTheme(): 'dark' | 'light' {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  }

  function applyTheme(themeMode: ThemeMode) {
    const next = themeMode === 'system' ? getSystemTheme() : themeMode
    effectiveTheme.value = next
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(STORAGE_KEY, newMode)
    applyTheme(newMode)
  }

  function initialize() {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved && ['dark', 'light', 'system'].includes(saved)) {
      mode.value = saved
    } else {
      localStorage.setItem(STORAGE_KEY, mode.value)
    }
    applyTheme(mode.value)

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') {
        applyTheme('system')
      }
    })
  }

  return {
    mode,
    effectiveTheme,
    setMode,
    initialize
  }
})
