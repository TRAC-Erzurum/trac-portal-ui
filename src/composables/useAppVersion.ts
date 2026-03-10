import { ref, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

const buildTimeUiVersion =
  typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION.trim()
    ? import.meta.env.VITE_APP_VERSION.trim()
    : ''

const uiVersion = ref<string>(buildTimeUiVersion)
const apiVersion = ref<string>('0.0.0')
let healthFetched = false

async function fetchVersions() {
  if (healthFetched) return
  healthFetched = true
  try {
    const healthUrl = API_BASE ? `${API_BASE}/health` : '/api/health'
    const res = await fetch(healthUrl, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      // Prefer API's uiVersion (set at deploy from UI_TAG); fallback to build-time only when API doesn't send it
      const fromApi = typeof data?.uiVersion === 'string' && data.uiVersion.trim()
      // If API doesn't provide uiVersion, prefer build-time value; otherwise show 0.0.0
      const fallbackUiVersion = buildTimeUiVersion || '0.0.0'
      uiVersion.value = fromApi ? data.uiVersion.trim() : fallbackUiVersion
      if (typeof data?.version === 'string') apiVersion.value = data.version
    }
  } catch {
    // On fetch failure, prefer build-time version or fall back to 0.0.0
    uiVersion.value = buildTimeUiVersion || '0.0.0'
    apiVersion.value = '0.0.0'
  }
}

export function useAppVersion() {
  onMounted(fetchVersions)

  return {
    uiVersion,
    apiVersion,
  }
}
