<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import MapSelectionSummary from '@/components/shared/MapSelectionSummary.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'
import { parseLocatorForMap } from '@/lib/maidenhead'

const TURKEY_CENTER: [number, number] = [39.93, 32.85]
const MAP_ZOOM = 8

const props = withDefaults(
  defineProps<{
    gridSquare: string | null
    city?: string | null
    district?: string | null
    /** When false, no outer border (e.g. inside dashboard card). */
    standalone?: boolean
    /** When false, map is not clickable (e.g. dashboard preview with separate "Open map" button). */
    interactive?: boolean
    /**
     * dashboard: QTH on map overlay only; no bottom summary strip or marker popup.
     */
    variant?: 'default' | 'dashboard'
  }>(),
  { standalone: true, interactive: true, variant: 'default' }
)

const emit = defineEmits<{
  click: []
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const userGrid = computed(() =>
  props.gridSquare?.trim()?.toUpperCase() ?? null
)

const userParsed = computed(() =>
  userGrid.value ? parseLocatorForMap(userGrid.value) : null
)

const mapCenter = computed((): [number, number] => {
  if (!userParsed.value) return TURKEY_CENTER
  const [a, b] = userParsed.value.bounds
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
})

const mapZoom = computed(() => MAP_ZOOM)

/** Pin yok; sadece popup. Ok tam QTH noktasını gösterir. */
const selectionMarkerIcon = L.divIcon({
  className: 'selection-marker-invisible',
  html: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

const markerLatLng = computed((): [number, number] | null => {
  if (!userParsed.value) return null
  const { lat, lng } = userParsed.value.wgs84
  return [lat, lng]
})

const addressPlace = ref<{
  country: string
  province: string
  district: string
} | null>(null)
const addressLoading = ref(false)
const addressCache = new Map<string, { country: string; province: string; district: string }>()
const markerRef = ref<{ leafletObject: { openPopup: () => void } } | null>(null)

async function fetchAddress(lat: number, lng: number) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = addressCache.get(key)
  if (cached) {
    addressPlace.value = cached
    return
  }
  addressLoading.value = true
  addressPlace.value = null
  try {
    const data = await api.get<{
      address?: Record<string, string>
    } | null>(`/qth/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`)
    if (!data?.address) {
      addressPlace.value = null
      return
    }
    const addr = data.address
    const country = addr.country ?? ''
    const province =
      addr.province ?? addr.state ?? addr.state_district ?? addr.region ?? ''
    const district =
      addr.town ?? addr.county ?? addr.municipality ?? addr.village ?? ''
    const place = { country, province, district }
    addressPlace.value = place
    addressCache.set(key, place)
  } catch {
    addressPlace.value = null
  } finally {
    addressLoading.value = false
  }
}

const popupDecimalDisplay = computed(() => {
  const ll = markerLatLng.value
  return ll ? `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}` : ''
})

watch(
  () => userParsed.value?.wgs84,
  (wgs84) => {
    if (props.variant === 'dashboard') {
      addressPlace.value = null
      return
    }
    if (!wgs84) {
      addressPlace.value = null
      return
    }
    const { lat, lng } = wgs84
    const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
    const cached = addressCache.get(key)
    if (cached) {
      addressPlace.value = cached
      return
    }
    fetchAddress(lat, lng)
  },
  { immediate: true }
)

function openPopupIfReady() {
  if (!markerLatLng.value) return
  const marker = markerRef.value?.leafletObject
  if (marker?.openPopup) marker.openPopup()
}

function onMarkerAdd() {
  if (props.variant === 'dashboard') return
  nextTick(openPopupIfReady)
  setTimeout(openPopupIfReady, 80)
}

const operatorLocationLine = computed(() => {
  const city = props.city?.trim()
  const district = props.district?.trim()
  if (city && district) return `${city}, ${district}`
  if (city) return city
  if (district) return district
  return '—'
})

const tileLayerUrl = computed(() => {
  if (props.variant === 'dashboard') {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const tileLayerAttribution = computed(() => {
  if (props.variant === 'dashboard') {
    return '© <a href="https://www.esri.com/">Esri</a> © <a href="https://carto.com/attributions">CARTO</a>'
  }
  return themeStore.effectiveTheme === 'dark'
    ? '© OpenStreetMap © CARTO'
    : undefined
})

const satelliteLabelsUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'

const mapOptions = {
  dragging: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  zoomControl: false,
  boxZoom: false,
  keyboard: false,
}

function onMapClick() {
  if (props.interactive) emit('click')
}

const selectionSummary = computed(() => {
  if (!userParsed.value) return null
  const ll = markerLatLng.value
  const lat = ll?.[0] ?? null
  const lng = ll?.[1] ?? null
  const district = addressPlace.value?.district ?? null
  return { district, lat, lng }
})
</script>

<template>
  <div
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    class="overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="[
      standalone ? 'rounded-lg border border-border bg-background' : '',
      interactive ? 'cursor-pointer' : ''
    ]"
    :aria-label="interactive ? (userParsed ? t('map.title') : t('dashboard.mapPreviewNoQth')) : undefined"
    @click="interactive ? onMapClick() : undefined"
    @keydown.enter="interactive ? onMapClick() : undefined"
    @keydown.space.prevent="interactive ? onMapClick() : undefined"
  >
    <div class="h-48 relative">
      <div
        class="absolute inset-0 z-0"
        :class="interactive ? 'cursor-pointer' : 'pointer-events-none'"
        @click.stop="interactive ? onMapClick() : undefined"
      >
        <LMap
          :use-global-leaflet="true"
          :center="mapCenter"
          :zoom="mapZoom"
          :class="['h-full w-full', standalone ? 'rounded-lg' : 'rounded-b-lg']"
          :options="mapOptions"
        >
          <LTileLayer
            :url="tileLayerUrl"
            :attribution="tileLayerAttribution"
          />
          <LTileLayer
            v-if="variant === 'dashboard'"
            :url="satelliteLabelsUrl"
            :attribution="undefined"
            :z-index="650"
          />
          <LMarker
            v-if="markerLatLng"
            ref="markerRef"
            :lat-lng="markerLatLng"
            :icon="(selectionMarkerIcon as any)"
            @add="onMarkerAdd"
          >
            <LPopup
              v-if="variant !== 'dashboard'"
              :options="{ closeButton: false, className: 'locator-popup-opaque' }"
            >
              <div
                class="rounded border border-border bg-background px-2 py-1.5 shadow-sm min-w-0 max-w-[20rem]"
                @click.stop
              >
                <p class="text-[11px] font-medium text-foreground break-words">
                  <span class="font-mono">{{ userGrid }}</span>
                  <span class="text-muted-foreground font-normal"> · </span>
                  <span class="text-muted-foreground">{{ addressLoading ? t('common.loading') : (addressPlace?.province || '—') }}{{ addressPlace?.district ? `, ${addressPlace.district}` : '' }}</span>
                </p>
                <p v-if="markerLatLng" class="tabular-nums text-[10px] text-muted-foreground mt-0.5 break-words">
                  {{ popupDecimalDisplay }}
                </p>
              </div>
            </LPopup>
          </LMarker>
        </LMap>
      </div>
      <div
        v-if="variant === 'dashboard' && userParsed && markerLatLng"
        class="absolute bottom-2 left-2 right-2 z-[500] pointer-events-none"
      >
        <div
          class="rounded-md border border-border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-sm min-w-0"
        >
          <p class="text-xs font-medium text-foreground truncate">
            <span class="font-mono tracking-tight">{{ userGrid }}</span>
            <span class="text-muted-foreground font-normal"> · </span>
            <span class="text-muted-foreground font-normal">{{ operatorLocationLine }}</span>
          </p>
          <p class="tabular-nums text-[10px] text-muted-foreground mt-0.5 truncate">
            {{ popupDecimalDisplay }}
          </p>
        </div>
      </div>
      <div
        v-if="!userParsed"
        :class="['absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm', standalone ? 'rounded-lg' : 'rounded-b-lg']"
      >
        <p class="text-sm font-medium text-muted-foreground text-center px-4">
          {{ t('dashboard.mapPreviewNoQth') }}
        </p>
      </div>
    </div>
    <MapSelectionSummary
      v-if="variant !== 'dashboard' && selectionSummary"
      :district="selectionSummary.district"
      :lat="selectionSummary.lat"
      :lng="selectionSummary.lng"
      :rounded-bottom="standalone"
    />
  </div>
</template>

<style>
/* Pin yok; sadece popup. Marker görünmez (Leaflet DOM harita içinde). */
.selection-marker-invisible {
  background: none !important;
  border: none !important;
}
/* Popup ve ok opak (tema rengi) */
.locator-popup-opaque .leaflet-popup-content-wrapper {
  background: transparent !important;
  box-shadow: none !important;
}
.locator-popup-opaque .leaflet-popup-tip {
  background: var(--background) !important;
  border: 1px solid var(--border) !important;
}
</style>
