import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type CookieConsentStatus = 'all' | 'necessary' | 'undecided'

const STORAGE_KEY = 'trac-cookie-consent'

export const useCookieConsentStore = defineStore('cookie-consent', () => {
  const status = ref<CookieConsentStatus>((localStorage.getItem(STORAGE_KEY) as CookieConsentStatus) || 'undecided')

  const isAccepted = computed(() => status.value !== 'undecided')
  const isAllAllowed = computed(() => status.value === 'all')

  function setConsent(newStatus: CookieConsentStatus) {
    status.value = newStatus
    localStorage.setItem(STORAGE_KEY, newStatus)
  }

  function allowAll() {
    setConsent('all')
  }

  function allowNecessary() {
    setConsent('necessary')
  }

  return {
    status,
    isAccepted,
    isAllAllowed,
    setConsent,
    allowAll,
    allowNecessary
  }
})
