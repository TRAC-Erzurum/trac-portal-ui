<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'

interface GeographyData {
  countries: { country: string; count: number }[]
  cities: { city: string; count: number }[]
  districts: { city: string; district: string; count: number }[]
}

interface MapPoint {
  city: string
  count: number
  lat: number
  lng: number
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
const mapLoading = ref(true)

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
  const cities = props.data?.cities?.slice(0, TOP_CITIES).filter((c) => (c.city ?? '').trim()) ?? []
  if (!cities.length) {
    points.value = []
    mapLoading.value = false
    return
  }
  mapLoading.value = true
  points.value = []
  const keyToCoords = new Map<string, { lat: number; lng: number }>()
  for (const c of cities) {
    const city = String(c.city ?? '').trim()
    const key = `${city}|${DEFAULT_COUNTRY}`
    if (keyToCoords.has(key)) continue
    try {
      const params = new URLSearchParams()
      params.set('city', city)
      params.set('country', DEFAULT_COUNTRY)
      const res = await api.get<{ lat: number; lng: number } | null>(`/qth/geocode?${params.toString()}`)
      if (res && Number.isFinite(res.lat) && Number.isFinite(res.lng)) {
        keyToCoords.set(key, { lat: res.lat, lng: res.lng })
      }
    } catch {
      // skip
    }
  }
  for (const c of cities) {
    const city = String(c.city ?? '').trim()
    const coords = keyToCoords.get(`${city}|${DEFAULT_COUNTRY}`)
    if (coords) {
      points.value.push({
        city,
        count: c.count,
        lat: coords.lat,
        lng: coords.lng,
      })
    }
  }
  mapLoading.value = false
}

onMounted(() => {
  buildPoints()
})

watch(
  () => props.data,
  () => buildPoints(),
  { deep: true }
)
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
      :use-global-leaflet="true"
      :center="MAP_DEFAULT_CENTER"
      :zoom="MAP_DEFAULT_ZOOM"
      class="h-full w-full rounded-lg min-h-[200px] lg:min-h-[240px] pointer-events-none select-none"
      :options="{
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      }"
    >
      <LTileLayer :url="tileLayerUrl" :attribution="tileLayerAttribution" />
      <LMarker
        v-for="(p, i) in points"
        :key="i"
        :lat-lng="[p.lat, p.lng]"
        :icon="circleIcon(p.count) as any"
      />
    </LMap>
  </div>
</template>
