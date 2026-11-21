<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MapPin,
  Search,
  X,
  Ruler,
  Mountain,
  Navigation,
  Loader2,
  LocateFixed,
  Trash2,
  ArrowRight,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import { useMapMeasurement, formatDistance } from '@/composables/useMapMeasurement'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface SearchResult {
  lat: number
  lng: number
  displayName: string
  type: string
}

/* ------------------------------------------------------------------ */
/*  Props & Emits                                                      */
/* ------------------------------------------------------------------ */
defineProps<{
  /** Whether the panel content should show (controls visibility, not the sheet/sidebar wrapper) */
  visible?: boolean
}>()

const emit = defineEmits<{
  /** Go to a location on the map */
  goTo: [lat: number, lng: number, label: string]
  /** Request to close the panel (mobile sheet) */
  close: []
}>()

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */
const { t } = useI18n()

/* ------------------------------------------------------------------ */
/*  Shared measurement state (survives panel/sheet unmount)            */
/* ------------------------------------------------------------------ */
const {
  pointA,
  pointB,
  selectingPoint,
  panelTab,
  distanceM,
  elevationDiffM,
  startSelecting,
  clearPoint,
  clearMeasurement,
} = useMapMeasurement()

/** Tab state lives in the shared store so the sidebar and the sheet open on the same tab */
const activeTab = panelTab

/* ------------------------------------------------------------------ */
/*  Search                                                             */
/* ------------------------------------------------------------------ */
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const searchLoading = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | null = null
const SEARCH_DEBOUNCE = 500
const MIN_QUERY_LEN = 2

watch(searchQuery, (val) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  const q = val.trim()
  if (q.length < MIN_QUERY_LEN) {
    searchResults.value = []
    return
  }
  searchLoading.value = true
  searchDebounce = setTimeout(async () => {
    try {
      const res = await api.get<SearchResult[]>(
        `/qth/search?q=${encodeURIComponent(q)}&limit=8`,
      )
      searchResults.value = res ?? []
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, SEARCH_DEBOUNCE)
})

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
}

function selectResult(result: SearchResult) {
  emit('goTo', result.lat, result.lng, result.displayName)
}

/* ------------------------------------------------------------------ */
/*  Measurement actions                                                */
/* ------------------------------------------------------------------ */
/** Enter map-pick mode for A or B. On mobile the sheet closes so the map is reachable. */
function startSelectPoint(which: 'A' | 'B') {
  startSelecting(which, 'panel')
  emit('close')
}

/* ------------------------------------------------------------------ */
/*  Display helpers                                                    */
/* ------------------------------------------------------------------ */
const distanceDisplay = computed(() => {
  const m = distanceM.value
  if (m == null) return ''
  return formatDistance(m)
})

const elevationDiffDisplay = computed(() => {
  const diff = elevationDiffM.value
  if (diff == null) return '—'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff} m`
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Tab bar -->
    <div class="flex border-b border-border shrink-0">
      <button
        :class="[
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
          activeTab === 'search'
            ? 'border-b-2 border-primary text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = 'search'"
      >
        <Search class="h-4 w-4" />
        {{ t('mapSearch.searchTab') }}
      </button>
      <button
        :class="[
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
          activeTab === 'measure'
            ? 'border-b-2 border-primary text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = 'measure'"
      >
        <Ruler class="h-4 w-4" />
        {{ t('mapSearch.measureTab') }}
      </button>
    </div>

    <!-- Search Tab -->
    <div v-if="activeTab === 'search'" class="flex-1 overflow-y-auto">
      <!-- Search input -->
      <div class="p-3">
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="searchQuery"
            type="text"
            :placeholder="t('mapSearch.searchPlaceholder')"
            :class="['pl-9 w-full', searchQuery ? 'pr-9' : '']"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            :aria-label="t('common.clear')"
            @click="clearSearch"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          {{ t('mapSearch.searchHint') }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="searchLoading" class="flex items-center justify-center py-6">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>

      <!-- Results -->
      <div v-else-if="searchResults.length > 0" class="pb-2">
        <button
          v-for="(result, idx) in searchResults"
          :key="idx"
          class="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
          @click="selectResult(result)"
        >
          <MapPin class="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <div class="min-w-0 flex-1">
            <p class="text-sm leading-snug break-words">{{ result.displayName }}</p>
            <p class="text-xs text-muted-foreground mt-0.5 font-mono">
              {{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}
            </p>
          </div>
          <ArrowRight class="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="searchQuery.trim().length >= MIN_QUERY_LEN && !searchLoading"
        class="px-3 py-6 text-center text-sm text-muted-foreground"
      >
        {{ t('mapSearch.noResults') }}
      </div>
    </div>

    <!-- Measure Tab -->
    <div v-if="activeTab === 'measure'" class="flex-1 overflow-y-auto">
      <div class="p-3 space-y-3">
        <!-- Instruction -->
        <p class="text-xs text-muted-foreground">
          {{ t('mapSearch.measureHint') }}
        </p>

        <!-- Point A -->
        <div class="rounded-lg border border-border p-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">A</span>
              {{ t('mapSearch.pointA') }}
            </span>
            <div class="flex items-center gap-1">
              <Button
                v-if="!pointA"
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                :class="selectingPoint === 'A' ? 'border-primary text-primary' : ''"
                @click="startSelectPoint('A')"
              >
                <LocateFixed class="h-3.5 w-3.5 mr-1" />
                {{ selectingPoint === 'A' ? t('mapSearch.selecting') : t('mapSearch.select') }}
              </Button>
              <Button
                v-if="pointA"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 text-muted-foreground hover:text-destructive"
                :aria-label="t('common.clear')"
                @click="clearPoint('A')"
              >
                <X class="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div v-if="pointA" class="space-y-1">
            <p class="text-sm leading-snug break-words">{{ pointA.label }}</p>
            <p class="text-xs text-muted-foreground font-mono">
              {{ pointA.lat.toFixed(5) }}, {{ pointA.lng.toFixed(5) }}
            </p>
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mountain class="h-3.5 w-3.5" aria-hidden="true" />
              <Loader2 v-if="pointA.elevationLoading" class="h-3 w-3 animate-spin" />
              <span v-else-if="pointA.elevation != null">{{ pointA.elevation }} m</span>
              <span v-else>—</span>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">
            {{ selectingPoint === 'A' ? t('mapSearch.clickMapToSelect') : t('mapSearch.notSelected') }}
          </p>
        </div>

        <!-- Point B -->
        <div class="rounded-lg border border-border p-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
              <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">B</span>
              {{ t('mapSearch.pointB') }}
            </span>
            <div class="flex items-center gap-1">
              <Button
                v-if="!pointB"
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                :class="selectingPoint === 'B' ? 'border-primary text-primary' : ''"
                @click="startSelectPoint('B')"
              >
                <LocateFixed class="h-3.5 w-3.5 mr-1" />
                {{ selectingPoint === 'B' ? t('mapSearch.selecting') : t('mapSearch.select') }}
              </Button>
              <Button
                v-if="pointB"
                variant="ghost"
                size="icon-sm"
                class="h-7 w-7 text-muted-foreground hover:text-destructive"
                :aria-label="t('common.clear')"
                @click="clearPoint('B')"
              >
                <X class="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div v-if="pointB" class="space-y-1">
            <p class="text-sm leading-snug break-words">{{ pointB.label }}</p>
            <p class="text-xs text-muted-foreground font-mono">
              {{ pointB.lat.toFixed(5) }}, {{ pointB.lng.toFixed(5) }}
            </p>
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mountain class="h-3.5 w-3.5" aria-hidden="true" />
              <Loader2 v-if="pointB.elevationLoading" class="h-3 w-3 animate-spin" />
              <span v-else-if="pointB.elevation != null">{{ pointB.elevation }} m</span>
              <span v-else>—</span>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground">
            {{ selectingPoint === 'B' ? t('mapSearch.clickMapToSelect') : t('mapSearch.notSelected') }}
          </p>
        </div>

        <!-- Results -->
        <div v-if="pointA && pointB" class="space-y-2">
          <Separator />

          <!-- Distance -->
          <div class="rounded-lg bg-muted/50 p-3 space-y-2">
            <div class="flex items-center gap-2">
              <Navigation class="h-4 w-4 text-primary" aria-hidden="true" />
              <span class="text-sm font-medium">{{ t('mapSearch.birdDistance') }}</span>
            </div>
            <p class="text-2xl font-bold tabular-nums">{{ distanceDisplay }}</p>
          </div>

          <!-- Elevation Difference -->
          <div class="rounded-lg bg-muted/50 p-3 space-y-2">
            <div class="flex items-center gap-2">
              <Mountain class="h-4 w-4 text-primary" aria-hidden="true" />
              <span class="text-sm font-medium">{{ t('mapSearch.elevationDiff') }}</span>
            </div>
            <p class="text-2xl font-bold tabular-nums">{{ elevationDiffDisplay }}</p>
            <p class="text-xs text-muted-foreground mt-1">
              A: {{ pointA.elevation != null ? `${pointA.elevation} m` : '—' }}
              → B: {{ pointB.elevation != null ? `${pointB.elevation} m` : '—' }}
            </p>
          </div>
        </div>

        <!-- Clear measurement -->
        <div v-if="pointA || pointB" class="pt-1">
          <Button
            variant="outline"
            size="sm"
            class="w-full trac-btn-destructive-outlined"
            @click="clearMeasurement"
          >
            <Trash2 class="h-4 w-4 mr-2" aria-hidden="true" />
            {{ t('mapSearch.clearMeasurement') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
