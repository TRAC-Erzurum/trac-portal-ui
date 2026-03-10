import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type CookieConsentStatus = 'all' | 'necessary' | 'undecided'

const STORAGE_KEY = 'trac-cookie-consent'

function getInitialStatus(): CookieConsentStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'all' || stored === 'necessary' || stored === 'undecided') {
      return stored as CookieConsentStatus
    }
  } catch (e) {
    // LocalStorage access might be blocked
  }
  return 'undecided'
}

export const useCookieConsentStore = defineStore('cookie-consent', () => {
  const status = ref<CookieConsentStatus>(getInitialStatus())

  const isAccepted = computed(() => status.value !== 'undecided')
  const isAllAllowed = computed(() => status.value === 'all')

  function setConsent(newStatus: CookieConsentStatus) {
    status.value = newStatus
    try {
      localStorage.setItem(STORAGE_KEY, newStatus)
    } catch (e) {
      // LocalStorage access might be blocked
    }
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
