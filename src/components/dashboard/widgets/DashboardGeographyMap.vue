<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import type { Map as LeafletMap } from 'leaflet'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { useThemeStore } from '@/stores/theme'

const TUR_ADM1_URL = '/geojson/gadm41_TUR_1.json'

const TURKEY_CENTER: [number, number] = [39.0, 35.2]
const TURKEY_INIT_ZOOM = 6
const TURKEY_MIN_ZOOM = 3
const TURKEY_MAX_ZOOM = 8

interface GeographyData {
  cities: { city: string; count: number; lat?: number; lng?: number }[]
}

type GeographyCountMode = 'total' | 'unique'

const props = defineProps<{
  data: GeographyData | null
  mode: GeographyCountMode
  // Optional manual override: normalized/regular city name -> CSS color.
  cityColors?: Record<string, string>
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const mapRef = ref<{ leafletObject: LeafletMap } | null>(null)
const mapInstance = ref<LeafletMap | null>(null)
const loading = ref(true)

type LayerStatus = 'idle' | 'loading' | 'ready' | 'failed'

let provinceLayer: L.GeoJSON | null = null
let provinceLayerStatus: LayerStatus = 'idle'

let provinceLayerPromise: Promise<void> | null = null
let resizeHandler: (() => void) | null = null

function normalizeKey(v: string): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function normalizeProvinceKey(v: string): string {
  return normalizeKey(v).replace(/[^a-z0-9]/g, '')
}

function canonicalProvinceKey(rawName: string): string {
  return normalizeProvinceKey(rawName)
}

const provinceCountByName = computed(() => {
  const out = new Map<string, number>()
  for (const c of props.data?.cities ?? []) {
    const key = canonicalProvinceKey(c.city)
    if (!key) continue
    out.set(key, (out.get(key) ?? 0) + c.count)
  }
  return out
})

const maxProvince = computed(() => Math.max(1, ...provinceCountByName.value.values()))

const countLabel = computed(() =>
  props.mode === 'total'
    ? t('dashboard.totalParticipants')
    : t('dashboard.uniqueParticipantsSummary')
)

const tileLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
})

const tileLabelLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'
})

const tileLayerAttribution = computed(() => {
  return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
})

function normalizedByLog(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.log1p(value) / Math.log1p(max)
}

type ColorStop = {
  at: number
  rgb: [number, number, number]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function interpolateColor(stops: ColorStop[], ratio: number): [number, number, number] {
  if (ratio <= stops[0].at) return stops[0].rgb
  if (ratio >= stops[stops.length - 1].at) return stops[stops.length - 1].rgb

  for (let i = 0; i < stops.length - 1; i++) {
    const left = stops[i]
    const right = stops[i + 1]
    if (ratio >= left.at && ratio <= right.at) {
      const span = right.at - left.at || 1
      const t = (ratio - left.at) / span
      return [
        Math.round(lerp(left.rgb[0], right.rgb[0], t)),
        Math.round(lerp(left.rgb[1], right.rgb[1], t)),
        Math.round(lerp(left.rgb[2], right.rgb[2], t)),
      ]
    }
  }

  return stops[stops.length - 1].rgb
}

function shadeColor(value: number, max: number): string {
  const ratio = normalizedByLog(value, max)
  const isDark = themeStore.effectiveTheme === 'dark'

  if (ratio <= 0) return isDark ? 'rgba(82,82,91,0.16)' : 'rgba(212,212,216,0.28)'

  // Monochrome ramp requested by user: very light blue -> deep navy.
  const stops: ColorStop[] = isDark
    ? [
        { at: 0, rgb: [138, 170, 210] },
        { at: 1, rgb: [42, 78, 128] },
      ]
    : [
        { at: 0, rgb: [214, 228, 245] },
        { at: 1, rgb: [43, 92, 161] },
      ]

  const [r, g, b] = interpolateColor(stops, ratio)
  const alpha = isDark ? 0.64 : 0.56
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function cityOverrideColor(cityName: string): string | null {
  const source = props.cityColors
  if (!source) return null
  const direct = source[cityName]
  if (direct) return direct
  const normalized = source[normalizeKey(cityName)]
  return normalized ?? null
}

function baseBorder(): string {
  return themeStore.effectiveTheme === 'dark' ? '#3f3f46' : '#d4d4d8'
}

function provinceFeatureStyle(feature: { properties?: Record<string, unknown> | null }): L.PathOptions {
  const p = (feature.properties ?? {}) as Record<string, unknown>
  const provinceName = String(p.NAME_1 ?? p.name_1 ?? '')
  const province = canonicalProvinceKey(provinceName)
  const count = provinceCountByName.value.get(province) ?? 0
  const override = cityOverrideColor(provinceName)
  return {
    fillColor: override ?? shadeColor(count, maxProvince.value),
    fillOpacity: 0.86,
    color: baseBorder(),
    weight: 0.8,
  }
}

function bindTooltipWithCount(
  layer: L.Layer,
  label: string,
  count: number,
) {
  layer.bindTooltip(
    `<div class="compact-popup-body"><p class="compact-popup-title">${label}</p><p class="compact-popup-value">${countLabel.value}: ${count}</p></div>`,
    {
      className: 'compact-popup',
      sticky: false,
      opacity: 1,
      direction: 'top',
      offset: [0, -6],
    },
  )
}

function restyleProvinceLayer() {
  if (!provinceLayer) return
  provinceLayer.eachLayer((ly) => {
    const feat = (ly as L.Layer & { feature?: { properties?: Record<string, unknown> | null } }).feature
    if (!feat || !(ly as L.Path).setStyle) return
    ;(ly as L.Path).setStyle(provinceFeatureStyle(feat))
    const p = (feat.properties ?? {}) as Record<string, unknown>
    const rawName = String(p.NAME_1 ?? p.name_1 ?? '—')
    const name = rawName
    const cnt = provinceCountByName.value.get(canonicalProvinceKey(rawName)) ?? 0
    bindTooltipWithCount(ly, name, cnt)
  })
}

function fitTurkeyToViewport() {
  const map = mapInstance.value
  if (!map || !provinceLayer) return
  const bounds = provinceLayer.getBounds()
  if (!bounds.isValid()) return

  map.fitBounds(bounds, {
    paddingTopLeft: [10, 10],
    paddingBottomRight: [10, 12],
    maxZoom: TURKEY_INIT_ZOOM,
  })

  if (map.getZoom() < TURKEY_MIN_ZOOM) {
    map.setZoom(TURKEY_MIN_ZOOM)
  }
}

async function ensureProvinceLayer() {
  if (provinceLayerStatus === 'ready' || provinceLayer) return
  if (provinceLayerPromise) {
    await provinceLayerPromise
    return
  }

  provinceLayerStatus = 'loading'
  provinceLayerPromise = (async () => {
    const res = await fetch(TUR_ADM1_URL)
    if (!res.ok) throw new Error('adm1-geo-unavailable')
    const gj = (await res.json()) as object
    provinceLayer = L.geoJSON(gj as never, {
      style: (f) => provinceFeatureStyle(f as { properties?: Record<string, unknown> | null }),
    })
    restyleProvinceLayer()
    provinceLayerStatus = 'ready'
  })()

  try {
    await provinceLayerPromise
  } catch {
    provinceLayerStatus = 'failed'
    provinceLayer = null
    throw new Error('adm1-geo-unavailable')
  } finally {
    provinceLayerPromise = null
  }
}

function onMapReady(leafletMap: LeafletMap) {
  const map = (mapRef.value?.leafletObject ?? leafletMap) as unknown as LeafletMap
  mapInstance.value = map
  nextTick(async () => {
    try {
      loading.value = true
      map.setView(TURKEY_CENTER, TURKEY_INIT_ZOOM)

      await ensureProvinceLayer()
      if (provinceLayer && !map.hasLayer(provinceLayer)) map.addLayer(provinceLayer)

      fitTurkeyToViewport()
    } finally {
      loading.value = false
      map.invalidateSize()
      setTimeout(() => {
        map.invalidateSize()
        fitTurkeyToViewport()
      }, 120)
    }
  })

  if (!resizeHandler) {
    resizeHandler = () => {
      map.invalidateSize()
      fitTurkeyToViewport()
    }
    window.addEventListener('resize', resizeHandler)
  }
}

watch(
  [provinceCountByName, () => themeStore.effectiveTheme, () => props.mode, () => props.cityColors],
  () => {
    restyleProvinceLayer()
  },
)

onUnmounted(() => {
  const map = mapInstance.value
  if (map && provinceLayer) map.removeLayer(provinceLayer)

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }

  provinceLayer = null
  provinceLayerStatus = 'idle'
  provinceLayerPromise = null
})
</script>

<template>
  <div class="rounded-lg overflow-hidden border border-border/50 w-full min-h-[220px] sm:min-h-[320px] h-[38vh] sm:h-[min(62vh,560px)] bg-muted/20 relative">
    <div
      v-if="loading"
      class="absolute inset-0 z-[2] flex items-center justify-center text-sm text-muted-foreground bg-background/60 backdrop-blur-[1px]"
    >
      {{ t('netDetail.mapLoading') }}
    </div>
    <LMap
      ref="mapRef"
      :use-global-leaflet="true"
      :center="TURKEY_CENTER"
      :zoom="TURKEY_INIT_ZOOM"
      class="h-full w-full min-h-[220px] sm:min-h-[320px] rounded-lg z-0"
      :options="{
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.25,
        minZoom: TURKEY_MIN_ZOOM,
        maxZoom: TURKEY_MAX_ZOOM,
      }"
      @ready="onMapReady"
    >
      <LTileLayer
        :url="tileLayerUrl"
        :attribution="tileLayerAttribution"
      />
      <LTileLayer
        :url="tileLabelLayerUrl"
        :attribution="undefined"
        :opacity="0.42"
      />
    </LMap>

    <div class="pointer-events-none absolute right-1.5 bottom-1.5 sm:right-2 sm:bottom-2 z-[1] rounded-md border border-border/60 bg-background/90 px-1.5 py-1 sm:px-2 sm:py-1.5 text-[9px] sm:text-[10px] text-foreground/85">
      <p class="font-medium mb-1">Yoğunluk</p>
      <div class="h-2 w-24 sm:h-2.5 sm:w-28 rounded-sm bg-[linear-gradient(90deg,#d6e4f5_0%,#2b5ca1_100%)]" />
      <div class="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Az</span>
        <span>En Yüksek</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Leaflet popup chrome from /map page */
:deep(.compact-popup .leaflet-popup-content-wrapper) {
  padding: 0 !important;
  border-radius: 0.375rem !important;
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.compact-popup .leaflet-popup-content) {
  margin: 0 !important;
  min-width: 0 !important;
}

:deep(.compact-popup .leaflet-popup-tip-container) {
  margin-top: -1px;
}

:deep(.compact-popup .leaflet-popup-tip) {
  background: var(--background) !important;
  border: 1px solid var(--border) !important;
  box-shadow: none !important;
}

/* Hover tooltip should keep the same compact popup look. */
:deep(.leaflet-tooltip.compact-popup) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
  white-space: normal !important;
}

:deep(.leaflet-tooltip.compact-popup::before) {
  border-top-color: var(--background) !important;
}

:deep(.leaflet-tooltip.compact-popup .leaflet-tooltip-content) {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
}

:deep(.compact-popup-body) {
  min-width: 12rem;
  max-width: min(15rem, calc(100vw - 2.5rem));
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--background);
  color: var(--foreground);
  padding: 0.375rem 0.625rem;
  box-shadow: var(--shadow-sm);
}

:deep(.compact-popup-title) {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--foreground);
  overflow-wrap: break-word;
  word-break: normal;
}

:deep(.compact-popup-value) {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--muted-foreground);
  overflow-wrap: break-word;
  word-break: normal;
}

@media (max-width: 640px) {
  :deep(.compact-popup-body) {
    min-width: 10.5rem;
    max-width: calc(100vw - 2rem);
    padding: 0.32rem 0.5rem;
  }

  :deep(.compact-popup-title) {
    font-size: 0.75rem;
    line-height: 1.25;
  }

  :deep(.compact-popup-value) {
    margin-top: 0.125rem;
    font-size: 0.6875rem;
    line-height: 1.2;
  }
}
</style>
