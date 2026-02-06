import { type Ref, watch } from 'vue'

const STORAGE_PREFIX = 'trac-filters-'

function getStorageKey(key: string | Ref<string>): string {
  return STORAGE_PREFIX + (typeof key === 'string' ? key : key.value)
}

export function usePersistedFilters(key: string | Ref<string>, refs: Record<string, Ref<unknown>>): void {
  const load = () => {
    const storageKey = getStorageKey(key)
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>
        for (const [k, ref] of Object.entries(refs)) {
          if (saved[k] !== undefined && ref) {
            ;(ref as Ref<unknown>).value = saved[k]
          }
        }
      }
    } catch {
      // ignore
    }
  }

  load()

  if (typeof key !== 'string') {
    watch(key, load)
  }

  watch(
    () => Object.fromEntries(Object.entries(refs).map(([k, r]) => [k, (r as Ref<unknown>).value])),
    (val) => {
      try {
        sessionStorage.setItem(getStorageKey(key), JSON.stringify(val))
      } catch {
        // ignore
      }
    },
    { deep: true }
  )
}
