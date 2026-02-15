import { ref, computed, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

const buildTimeUiVersion =
  typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION.trim()
    ? import.meta.env.VITE_APP_VERSION.trim()
    : ''

const uiVersion = ref<string>(buildTimeUiVersion)
const apiVersion = ref<string>('')
let healthFetched = false

async function fetchVersions() {
  if (healthFetched || !API_BASE) return
  healthFetched = true
  try {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      // Prefer API's uiVersion (set at deploy from UI_TAG); fallback to build-time only when API doesn't send it
      const fromApi = typeof data?.uiVersion === 'string' && data.uiVersion.trim()
      uiVersion.value = fromApi ? data.uiVersion.trim() : buildTimeUiVersion
      if (typeof data?.version === 'string') apiVersion.value = data.version
    }
  } catch {
    uiVersion.value = buildTimeUiVersion
    apiVersion.value = ''
  }
}

function formatVersionText(): string {
  const ui = uiVersion.value.trim()
  const api = apiVersion.value.trim()
  if (!ui && !api) return ''
  if (ui && api) return `${ui} | API ${api}`
  if (api) return `API ${api}`
  return ui
}

export function useAppVersion() {
  onMounted(fetchVersions)

  const versionText = computed(() => formatVersionText())

  return {
    uiVersion,
    apiVersion,
    versionText,
    fetchVersions,
  }
}
