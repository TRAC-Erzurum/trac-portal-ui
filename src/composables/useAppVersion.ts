import { ref, computed, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

const uiVersion = ref<string>(
  typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION
    ? import.meta.env.VITE_APP_VERSION
    : '-'
)
const apiVersion = ref<string>('-')
let healthFetched = false

async function fetchApiVersion() {
  if (healthFetched || !API_BASE) return
  healthFetched = true
  try {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (typeof data?.version === 'string') {
        apiVersion.value = data.version
      }
    }
  } catch {
    apiVersion.value = '-'
  }
}

export function useAppVersion() {
  onMounted(fetchApiVersion)

  const versionText = computed(() => {
    const ui = uiVersion.value
    const api = apiVersion.value
    return `${ui} | API ${api}`
  })

  return {
    uiVersion,
    apiVersion,
    versionText,
    fetchApiVersion,
  }
}
