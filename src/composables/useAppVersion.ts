import { ref, computed, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

const uiVersion = ref<string>('')
const apiVersion = ref<string>('')
let healthFetched = false

async function fetchVersions() {
  if (healthFetched || !API_BASE) return
  healthFetched = true
  try {
    const res = await fetch(`${API_BASE}/health`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      if (typeof data?.uiVersion === 'string') uiVersion.value = data.uiVersion
      if (typeof data?.version === 'string') apiVersion.value = data.version
    }
  } catch {
    uiVersion.value = ''
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
