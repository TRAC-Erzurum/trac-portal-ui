import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/i18n'

export type LocaleMode = 'system' | 'tr' | 'en'
export type EffectiveLocale = 'tr' | 'en'

const STORAGE_KEY = 'trac-locale'

export const useLocaleStore = defineStore('locale', () => {
  const mode = ref<LocaleMode>('system')

  function getSystemLocale(): EffectiveLocale {
    try {
      const browserLang = navigator.language.split('-')[0]
      return browserLang === 'en' ? 'en' : 'tr'
    } catch {
      return 'tr'
    }
  }

  function getEffectiveLocale(): EffectiveLocale {
    return mode.value === 'system' ? getSystemLocale() : mode.value
  }

  function applyLocale(localeMode: LocaleMode) {
    const effectiveLocale = localeMode === 'system' ? getSystemLocale() : localeMode
    i18n.global.locale.value = effectiveLocale
    document.documentElement.lang = effectiveLocale
  }

  function setMode(newMode: LocaleMode) {
    mode.value = newMode
    localStorage.setItem(STORAGE_KEY, newMode)
    applyLocale(newMode)
  }

  function initialize() {
    const saved = localStorage.getItem(STORAGE_KEY) as LocaleMode | null
    if (saved && ['system', 'tr', 'en'].includes(saved)) {
      mode.value = saved
    } else {
      localStorage.setItem(STORAGE_KEY, mode.value)
    }
    applyLocale(mode.value)

    window.addEventListener('languagechange', () => {
      if (mode.value === 'system') {
        applyLocale('system')
      }
    })
  }

  return {
    mode,
    setMode,
    initialize,
    getEffectiveLocale
  }
})
