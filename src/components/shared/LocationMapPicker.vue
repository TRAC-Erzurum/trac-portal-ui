<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { LMap, LMarker, LPopup, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import MapSelectionSummary from '@/components/shared/MapSelectionSummary.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'
import { WGS84ToMaidenhead, parseLocatorForMap } from '@/lib/maidenhead'

export interface LocationSelection {
  gridSquare: string
  city: string
  district: string
  lat: number
  lng: number
  altitude: number | null
}

const TURKEY_CENTER: [number, number] = [39.93, 32.85]
const MAP_ZOOM = 6
const FOCUS_ZOOM = 14

const props = withDefaults(
  defineProps<{
    modelValue?: LocationSelection | null
    /** When set, only allow confirming selection if reverse-geocoded province matches (case-insensitive). */
    allowedProvince?: string
    /** When false, no outer border (e.g. inside sheet). */
    standalone?: boolean
  }>(),
  { modelValue: null, allowedProvince: undefined, standalone: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: LocationSelection | null]
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const mapRef = ref<{ leafletObject: L.Map } | null>(null)
const pendingMarkerRef = ref<{ leafletObject: { openPopup: () => void } } | null>(null)
const pendingSelection = ref<{
  lat: number
  lng: number
  gridSquare: string
  city: string
  district: string
  altitude: number | null
  outOfBounds: boolean
} | null>(null)
const addressLoading = ref(false)
const elevationLoading = ref(false)
const addressCache = new Map<string, { province: string; district: string }>()
const elevationCache = new Map<string, number | null>()

const userGrid = computed(() => props.modelValue?.gridSquare?.trim()?.toUpperCase() ?? null)
const userLatLng = computed((): [number, number] | null => {
  const v = props.modelValue
  if (v?.lat != null && v?.lng != null && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
    return [v.lat, v.lng]
  }
  return null
})
const userParsed = computed(() =>
  userGrid.value ? parseLocatorForMap(userGrid.value) : null
)

const mapCenter = computed((): [number, number] => {
  if (userLatLng.value) return userLatLng.value
  if (!userParsed.value) return TURKEY_CENTER
  const [a, b] = userParsed.value.bounds
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
})

const markerLatLng = computed((): [number, number] | null => {
  if (userLatLng.value) return userLatLng.value
  if (!userParsed.value) return null
  const { lat, lng } = userParsed.value.wgs84
  return [lat, lng]
})

const pendingMarkerLatLng = computed((): [number, number] | null => {
  const p = pendingSelection.value
  return p ? [p.lat, p.lng] : null
})

const tileLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const tileLayerAttribution = computed(() =>
  themeStore.effectiveTheme === 'dark' ? '© OpenStreetMap © CARTO' : undefined
)

async function fetchAddress(lat: number, lng: number) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = addressCache.get(key)
  if (cached) return cached
  addressLoading.value = true
  try {
    const data = await api.get<{
      address?: Record<string, string>
    } | null>(`/qth/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`)
    if (!data?.address) {
      return { province: '', district: '' }
    }
    const addr = data.address
    const province =
      addr.province ?? addr.state ?? addr.state_district ?? addr.region ?? ''
    const district =
      addr.town ?? addr.county ?? addr.municipality ?? addr.village ?? ''
    const place = { province, district }
    addressCache.set(key, place)
    return place
  } catch {
    return { province: '', district: '' }
  } finally {
    addressLoading.value = false
  }
}

async function fetchElevation(lat: number, lng: number): Promise<number | null> {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = elevationCache.get(key)
  if (cached !== undefined) return cached
  elevationLoading.value = true
  try {
    const data = await api.get<{ elevation: number | null }>(
      `/qth/elevation?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    )
    const m = data.elevation
    const value = typeof m === 'number' && Number.isFinite(m) ? m : 0
    elevationCache.set(key, value)
    return value
  } catch {
    elevationCache.set(key, 0)
    return 0
  } finally {
    elevationLoading.value = false
  }
}

function onMapReady() {
  const map = mapRef.value?.leafletObject
  if (!map) return
  if (userLatLng.value) {
    map.setView(mapCenter.value, FOCUS_ZOOM, { animate: false })
  }
  map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng
    const gridSquare = WGS84ToMaidenhead({ lat, lng }, 6)
    addressLoading.value = true
    const { province, district } = await fetchAddress(lat, lng)
    addressLoading.value = false
    const altitude = await fetchElevation(lat, lng)
    const allowed = (props.allowedProvince ?? '').trim().toLowerCase()
    const provinceNorm = province.trim().toLowerCase()
    const outOfBounds = allowed.length > 0 && provinceNorm !== allowed
    pendingSelection.value = {
      lat,
      lng,
      gridSquare,
      city: province,
      district,
      altitude,
      outOfBounds
    }
    nextTick(() => {
      setTimeout(openPendingPopup, 80)
    })
  })
}

function openPendingPopup() {
  const marker = pendingMarkerRef.value?.leafletObject
  if (marker?.openPopup) marker.openPopup()
}

onBeforeUnmount(() => {
  const map = mapRef.value?.leafletObject
  if (map) map.off('click')
})

function confirmSelection() {
  if (!pendingSelection.value || pendingSelection.value.outOfBounds) return
  const p = pendingSelection.value
  const selection: LocationSelection = {
    gridSquare: p.gridSquare,
    city: p.city,
    district: p.district,
    lat: p.lat,
    lng: p.lng,
    altitude: p.altitude
  }
  emit('update:modelValue', selection)
  pendingSelection.value = null
}

watch(
  () => [props.modelValue?.gridSquare, props.modelValue?.lat, props.modelValue?.lng] as const,
  () => {
    if (!props.modelValue?.gridSquare && props.modelValue?.lat == null) return
    nextTick(() => {
      const map = mapRef.value?.leafletObject
      if (map && mapCenter.value) {
        const zoom = userLatLng.value ? FOCUS_ZOOM : MAP_ZOOM
        map.setView(mapCenter.value, zoom, { animate: false })
      }
    })
  }
)

function cancelSelection() {
  pendingSelection.value = null
}

const mapOptions = {
  dragging: true,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  zoomControl: true,
  boxZoom: false,
  keyboard: true
}

const hintOrLoading = computed(() => {
  if (addressLoading.value || elevationLoading.value) return t('common.loading')
  return t('communicationChannels.selectLocationOnMap')
})

</script>

<template>
  <div
    :class="[
      'overflow-hidden rounded-lg border border-border bg-background',
      standalone ? '' : 'border-0 rounded-b-lg'
    ]"
  >
    <div class="h-56 relative">
      <LMap
        ref="mapRef"
        :use-global-leaflet="true"
        :center="mapCenter"
        :zoom="MAP_ZOOM"
        :class="['h-full w-full', standalone ? 'rounded-lg' : 'rounded-b-lg']"
        :options="mapOptions"
        @ready="onMapReady"
      >
        <LTileLayer
          :url="tileLayerUrl"
          :attribution="tileLayerAttribution"
        />
        <LMarker
          v-if="markerLatLng"
          :key="(userGrid ?? userLatLng?.join(',')) ?? 'empty'"
          :lat-lng="markerLatLng"
        />
        <LMarker
          v-if="pendingMarkerLatLng"
          ref="pendingMarkerRef"
          :lat-lng="pendingMarkerLatLng"
          :z-index-offset="1000"
          @add="openPendingPopup"
        >
          <LPopup :options="{ closeButton: true }">
            <div
              class="rounded bg-background px-2 py-1.5 shadow-sm min-w-0 max-w-[20rem]"
              @click.stop
            >
              <p class="text-[11px] font-medium text-foreground break-words">
                {{ pendingSelection?.gridSquare ?? '—' }}
                <span class="text-muted-foreground font-normal"> · </span>
                <span class="text-muted-foreground">{{ pendingSelection?.city || '—' }}{{ pendingSelection?.district ? `, ${pendingSelection.district}` : '' }}</span>
              </p>
              <p v-if="pendingSelection?.altitude != null" class="tabular-nums text-[10px] text-muted-foreground mt-0.5">
                {{ pendingSelection.altitude }} m
              </p>
              <p
                v-if="pendingSelection?.outOfBounds && props.allowedProvince"
                class="text-[10px] text-destructive mt-1"
              >
                {{ t('communicationChannels.locationMapPickerOnlyProvince', { province: props.allowedProvince }) }}
              </p>
              <div class="flex gap-1 mt-1.5">
                <Button type="button" variant="outline" size="sm" class="h-6 flex-1 text-[11px] px-1.5" @click="cancelSelection">
                  {{ t('common.cancel') }}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-6 flex-1 text-[11px] px-1.5"
                  :disabled="!!pendingSelection?.outOfBounds"
                  @click="confirmSelection"
                >
                  {{ t('common.confirm') }}
                </Button>
              </div>
            </div>
          </LPopup>
        </LMarker>
      </LMap>
      <div
        v-if="!markerLatLng || addressLoading || elevationLoading"
        :class="[
          'absolute inset-x-0 bottom-0 z-10 flex items-center justify-center py-2 bg-background/80 backdrop-blur-sm text-center',
          standalone ? 'rounded-b-lg' : ''
        ]"
      >
        <p class="text-xs font-medium text-muted-foreground px-4">
          {{ hintOrLoading }}
        </p>
      </div>
    </div>
    <MapSelectionSummary
      v-if="modelValue"
      :district="modelValue.district"
      :lat="modelValue.lat"
      :lng="modelValue.lng"
      :rounded-bottom="standalone"
    />
  </div>
</template>
