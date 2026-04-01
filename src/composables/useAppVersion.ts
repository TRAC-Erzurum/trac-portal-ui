import { ref, onMounted } from 'vue'
import { API_BASE } from '@/lib/api'

const buildTimeUiVersion =
  typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION.trim()
    ? import.meta.env.VITE_APP_VERSION.trim()
    : ''

const uiVersion = ref<string>(buildTimeUiVersion)
const apiVersion = ref<string>('0.0.0')
const githubRepoUrl = ref<string | null>(null)
const githubIssuesUrl = ref<string | null>(null)
let healthFetched = false

async function fetchVersions() {
  if (healthFetched) return
  healthFetched = true
  try {
    const healthUrl = `${API_BASE}/health`
    const res = await fetch(healthUrl, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      const fromApi = typeof data?.uiVersion === 'string' && data.uiVersion.trim()
      const fallbackUiVersion = buildTimeUiVersion || '0.0.0'
      uiVersion.value = fromApi ? data.uiVersion.trim() : fallbackUiVersion
      if (typeof data?.version === 'string') apiVersion.value = data.version
      if (typeof data?.githubRepoUrl === 'string' && data.githubRepoUrl.trim()) {
        githubRepoUrl.value = data.githubRepoUrl.trim()
      }
      if (typeof data?.githubIssuesUrl === 'string' && data.githubIssuesUrl.trim()) {
        githubIssuesUrl.value = data.githubIssuesUrl.trim()
      }
    }
  } catch {
    uiVersion.value = buildTimeUiVersion || '0.0.0'
    apiVersion.value = '0.0.0'
  }
}

export function useAppVersion() {
  onMounted(fetchVersions)

  return {
    uiVersion,
    apiVersion,
    githubRepoUrl,
    githubIssuesUrl,
  }
}
