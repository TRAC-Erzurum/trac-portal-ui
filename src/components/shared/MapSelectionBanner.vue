<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loader2, MapPin, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

/** Floating banner shown while the user picks point A or B on the map. */
interface Props {
  point: 'A' | 'B'
}

defineProps<Props>()

const emit = defineEmits<{
  pick: [lat: number, lng: number, label: string]
  cancel: []
}>()

interface PlaceResult {
  lat: number
  lng: number
  displayName: string
}

const SEARCH_DEBOUNCE = 500
const MIN_QUERY_LEN = 2

const { t } = useI18n()

const query = ref('')
const results = ref<PlaceResult[]>([])
const loading = ref(false)
let debounce: ReturnType<typeof setTimeout> | null = null

watch(query, (val) => {
  if (debounce) clearTimeout(debounce)
  const q = val.trim()
  if (q.length < MIN_QUERY_LEN) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  debounce = setTimeout(async () => {
    try {
      const res = await api.get<PlaceResult[]>(`/qth/search?q=${encodeURIComponent(q)}&limit=5`)
      results.value = res ?? []
    } catch {
      results.value = []
    } finally {
      loading.value = false
      debounce = null
    }
  }, SEARCH_DEBOUNCE)
})

onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce)
})

function pickResult(result: PlaceResult) {
  emit('pick', result.lat, result.lng, result.displayName)
  query.value = ''
  results.value = []
}
</script>

<template>
  <div
    class="pointer-events-auto w-[min(92vw,28rem)] rounded-lg border border-border bg-background/95 shadow-md p-3 space-y-2"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium" role="status" aria-live="polite">
        {{ t('mapSearch.selectionBanner', { point }) }}
      </p>
      <Button variant="outline" size="sm" class="h-7 text-xs shrink-0" @click="emit('cancel')">
        <X class="h-3.5 w-3.5 mr-1" aria-hidden="true" />
        {{ t('common.cancel') }}
      </Button>
    </div>

    <div class="relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        v-model="query"
        type="text"
        :placeholder="t('mapSearch.searchOrClickMap')"
        :aria-label="t('mapSearch.searchOrClickMap')"
        :class="['pl-9 w-full text-sm', query ? 'pr-9' : '']"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        :aria-label="t('common.clear')"
        @click="query = ''; results = []"
      >
        <X class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-2">
      <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>

    <div v-else-if="results.length > 0" class="max-h-48 overflow-y-auto">
      <button
        v-for="(result, idx) in results"
        :key="idx"
        type="button"
        class="w-full flex items-start gap-2 px-2 py-2 hover:bg-muted/50 transition-colors text-left rounded-md"
        @click="pickResult(result)"
      >
        <MapPin class="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
        <p class="text-xs leading-snug break-words min-w-0 flex-1">{{ result.displayName }}</p>
      </button>
    </div>
  </div>
</template>
