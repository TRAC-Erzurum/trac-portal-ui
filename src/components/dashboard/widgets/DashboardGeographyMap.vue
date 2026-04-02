<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
// MarkerClusterGroup on L (runtime)
import 'leaflet.markercluster'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'

interface GeographyData {
  countries: { country: string; count: number }[]
  cities: { city: string; count: number; lat?: number; lng?: number }[]
  districts: { city: string; district: string; count: number }[]
}

interface MapPoint {
  city: string
  count: number
  lat: number
  lng: number
}

/** Leaflet marker options: şehir bazlı katılımcı (attendee) sayısı; küme balonunda toplam için. */
const GEO_MARKER_PARTICIPANT_COUNT_KEY = 'dashboardGeoParticipantCount' as const

function markerParticipantCount(marker: L.Marker): number {
  const raw = (marker.options as Record<string, unknown>)[GEO_MARKER_PARTICIPANT_COUNT_KEY]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

const MAP_DEFAULT_CENTER: [number, number] = [39.2, 32.8]
const MAP_DEFAULT_ZOOM = 5
const TOP_CITIES = 20
const DEFAULT_COUNTRY = 'Turkey'

const props = defineProps<{
  data: GeographyData | null
}>()

const { t } = useI18n()
const themeStore = useThemeStore()
const points = ref<MapPoint[]>([])
const mapLoading = ref(false)
const mapRef = ref<{ leafletObject: LeafletMap } | null>(null)
const leafletMapInstance = ref<LeafletMap | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster extends L at runtime
let clusterGroupInstance: any = null
let buildGeneration = 0

function parseCoord(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const t = v.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const tileLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const tileLayerAttribution = computed(() =>
  themeStore.effectiveTheme === 'dark'
    ? '© OpenStreetMap © CARTO'
    : undefined
)

function invalidateMapSize() {
  mapRef.value?.leafletObject?.invalidateSize()
}

function scheduleMapResize() {
  nextTick(() => {
    invalidateMapSize()
    setTimeout(() => invalidateMapSize(), 350)
  })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function mapPointPopupHtml(p: MapPoint): string {
  return `<div class="min-w-[8rem] rounded-md border border-border bg-background py-2 px-3 text-center shadow-sm">
        <div class="font-semibold text-sm">${escapeHtml(p.city)}</div>
      </div>`
}

/** Küme balonu rengi: toplam katılımcı sayısına göre (tekil marker ile aynı ölçek). */
function clusterSizeClassByParticipantSum(sum: number, maxParticipantCount: number): string {
  const max = Math.max(maxParticipantCount, 1)
  const ratio = sum / max
  if (ratio <= 0.33) return 'marker-cluster-small'
  if (ratio <= 0.66) return 'marker-cluster-medium'
  return 'marker-cluster-large'
}

function syncClusterLayer() {
  const map = leafletMapInstance.value
  if (!map || points.value.length === 0) return
  if (clusterGroupInstance) {
    map.removeLayer(clusterGroupInstance)
    clusterGroupInstance = null
  }
  const markerClusterGroupFn = (L as any).markerClusterGroup
  if (!markerClusterGroupFn) return
  const maxParticipantCount = Math.max(...points.value.map((p) => p.count), 1)
  const group = markerClusterGroupFn({
    chunkedLoading: true,
    maxClusterRadius: 60,
    iconCreateFunction(cluster: {
      getAllChildMarkers: () => L.Marker[]
    }) {
      const markers = cluster.getAllChildMarkers()
      const sum = markers.reduce((acc, m) => acc + markerParticipantCount(m), 0)
      const sizeClass = clusterSizeClassByParticipantSum(sum, maxParticipantCount)
      return L.divIcon({
        className: `marker-cluster ${sizeClass}`,
        html: `<div><span>${sum}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    },
  })
  for (const p of points.value) {
    const marker = L.marker([p.lat, p.lng], {
      icon: circleIcon(p.count),
      [GEO_MARKER_PARTICIPANT_COUNT_KEY]: p.count,
    } as L.MarkerOptions)
    marker.bindPopup(mapPointPopupHtml(p), { className: 'net-detail-popup' })
    group.addLayer(marker)
  }
  group.addTo(map)
  clusterGroupInstance = group
  const bounds = clusterGroupInstance.getBounds?.()
  if (bounds?.isValid?.()) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 })
  }
}

function onMapReady(leafletMap: LeafletMap) {
  const map = mapRef.value?.leafletObject ?? leafletMap
  leafletMapInstance.value = map
  nextTick(() => {
    map.invalidateSize()
    setTimeout(() => {
      map.invalidateSize()
      syncClusterLayer()
    }, 350)
  })
}

/** Orana göre renk: en yüksek oran turuncu, orta sarı, düşük yeşil */
function clusterSizeClass(count: number): string {
  const max = Math.max(...points.value.map((p) => p.count), 1)
  const ratio = count / max
  if (ratio <= 0.33) return 'marker-cluster-small'
  if (ratio <= 0.66) return 'marker-cluster-medium'
  return 'marker-cluster-large'
}

/** Çevrim detay sayfasındaki div ile birebir: leaflet-marker-icon + marker-cluster + size, içerik <div><span>N</span></div> */
function circleIcon(count: number): L.DivIcon {
  const sizeClass = clusterSizeClass(count)
  return L.divIcon({
    className: `marker-cluster ${sizeClass}`,
    html: `<div><span>${count}</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

async function buildPoints() {
  const myGen = ++buildGeneration
  const cities =
    props.data?.cities?.slice(0, TOP_CITIES).filter((c) => (c.city ?? '').trim()) ?? []

  if (!cities.length) {
    if (myGen === buildGeneration) {
      points.value = []
      mapLoading.value = false
    }
    return
  }

  mapLoading.value = true
  points.value = []
  const keyToCoords = new Map<string, { lat: number; lng: number }>()

  try {
    for (const c of cities) {
      const city = String(c.city ?? '').trim()
      const key = `${city}|${DEFAULT_COUNTRY}`
      const lat = parseCoord(c.lat)
      const lng = parseCoord(c.lng)
      if (lat != null && lng != null) {
        keyToCoords.set(key, { lat, lng })
      }
    }

    for (const c of cities) {
      if (myGen !== buildGeneration) return
      const city = String(c.city ?? '').trim()
      const key = `${city}|${DEFAULT_COUNTRY}`
      if (keyToCoords.has(key)) continue
      try {
        const params = new URLSearchParams()
        params.set('city', city)
        params.set('country', DEFAULT_COUNTRY)
        const res = await api.get<{ lat: number; lng: number } | null>(
          `/qth/geocode?${params.toString()}`,
        )
        if (res && parseCoord(res.lat) != null && parseCoord(res.lng) != null) {
          keyToCoords.set(key, {
            lat: parseCoord(res.lat)!,
            lng: parseCoord(res.lng)!,
          })
        }
      } catch {
        // skip
      }
    }

    if (myGen !== buildGeneration) return
    const nextPoints: MapPoint[] = []
    for (const c of cities) {
      const city = String(c.city ?? '').trim()
      const coords = keyToCoords.get(`${city}|${DEFAULT_COUNTRY}`)
      if (coords) {
        nextPoints.push({ city, count: c.count, lat: coords.lat, lng: coords.lng })
      }
    }
    if (myGen === buildGeneration) points.value = nextPoints
  } finally {
    if (myGen === buildGeneration) mapLoading.value = false
  }
}

const citiesFingerprint = computed(() => {
  const cities = props.data?.cities?.slice(0, TOP_CITIES) ?? []
  return cities
    .map((c) =>
      [String(c.city ?? '').trim(), c.count, c.lat ?? '', c.lng ?? ''].join('|'),
    )
    .join('||')
})

watch(citiesFingerprint, () => void buildPoints(), { immediate: true })

watch(
  () => points.value.length,
  (len) => {
    if (len === 0) return
    scheduleMapResize()
  },
  { flush: 'post' },
)

watch(tileLayerUrl, () => {
  if (points.value.length === 0) return
  scheduleMapResize()
})

watch(
  () => points.value,
  () => {
    if (!leafletMapInstance.value || points.value.length === 0) return
    syncClusterLayer()
  },
  { flush: 'post' },
)

onUnmounted(() => {
  if (clusterGroupInstance && leafletMapInstance.value) {
    leafletMapInstance.value.removeLayer(clusterGroupInstance)
    clusterGroupInstance = null
  }
})
</script>

<template>
  <div class="rounded-lg overflow-hidden border border-border/50 flex-1 min-h-[200px] lg:min-h-[240px] bg-muted/30">
    <div
      v-if="mapLoading"
      class="h-full min-h-[200px] lg:min-h-[240px] flex items-center justify-center text-sm text-muted-foreground"
    >
      {{ t('netDetail.mapLoading') }}
    </div>
    <template v-else-if="points.length === 0">
      <div
        class="h-full min-h-[200px] lg:min-h-[240px] flex items-center justify-center text-sm text-muted-foreground"
      >
        {{ t('netDetail.mapNoLocations') }}
      </div>
    </template>
    <LMap
      v-else
      ref="mapRef"
      :use-global-leaflet="true"
      :center="MAP_DEFAULT_CENTER"
      :zoom="MAP_DEFAULT_ZOOM"
      class="h-full w-full min-h-[200px] rounded-lg lg:min-h-[240px]"
      :options="{
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        boxZoom: true,
        keyboard: true,
      }"
      @ready="onMapReady"
    >
      <LTileLayer :url="tileLayerUrl" :attribution="tileLayerAttribution" />
    </LMap>
  </div>
</template>
