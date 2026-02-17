<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  Crosshair,
  Globe,
  Layers,
  MapPin,
  Mountain,
  Search,
  Share2,
  X
} from 'lucide-vue-next'
import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import LangToggle from '@/components/layout/LangToggle.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import { AppVersionBox } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { buildTutorialContent } from '@/lib/tutorial-content'
import { api } from '@/lib/api'
import { formatCommunicationChannelLabel } from '@/lib/formatters'
import {
  getZoomForLocatorLength,
  nativeWGS84ToMaidenhead,
  parseLocatorForMap,
  WGS84ToMaidenhead,
  getMapLocatorUrl,
  formatLatLngDMS,
  approximateUtcOffsetFromLng
} from '@/lib/maidenhead'
import type { CommunicationChannel } from '@/types/communication-channel'
import type { Map as LeafletMap } from 'leaflet'

const TURKEY_CENTER: [number, number] = [39.93, 32.85]
const TURKEY_ZOOM = 6
const MAP_LAYER_STORAGE_KEY = 'trac-map-layer'
const MAP_LAYER_TTL_MS = 60 * 60 * 1000
const SEARCH_DEBOUNCE_MS = 400
const LOCATOR_SEARCH_MIN_LEN = 2
const LOCATOR_SEARCH_MAX_LEN = 10

/** Röle: CommunicationChannelCard / EditCommChannelSheet ile aynı — TowerControl, mavi (blue-500/600) */
const REPEATER_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18"/><path d="M19 3v18"/><path d="M5 7h14"/><path d="M5 11h14"/><path d="M12 3v4"/><path d="M12 15v6"/></svg>'
/** APRS: CommunicationChannelCard / EditCommChannelSheet ile aynı — Navigation (paper plane), turuncu (orange-500/600) */
const APRS_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>'

const CHANNEL_ICON_STYLES = {
  repeater: { bg: '#dbeafe', icon: '#2563eb' },
  aprs: { bg: '#ffedd5', icon: '#ea580c' },
} as const

function createChannelIcon(type: 'repeater' | 'aprs'): L.DivIcon {
  const svg = type === 'aprs' ? APRS_ICON_SVG : REPEATER_ICON_SVG
  const { bg, icon } = CHANNEL_ICON_STYLES[type]
  return L.divIcon({
    className: 'channel-marker-icon',
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-md border border-background/80 shadow-sm" style="background-color:${bg};color:${icon}">${svg}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

const repeaterIcon = createChannelIcon('repeater')
const aprsIcon = createChannelIcon('aprs')

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

type MapBaseLayer = 'standard' | 'satellite' | 'terrain'
const LAYERS: MapBaseLayer[] = ['standard', 'satellite', 'terrain']

function getStoredMapLayer(): MapBaseLayer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MAP_LAYER_STORAGE_KEY)
    if (!raw) return null
    const { layer, expiresAt } = JSON.parse(raw) as { layer: string; expiresAt: number }
    if (typeof expiresAt !== 'number' || Date.now() > expiresAt) return null
    if (LAYERS.includes(layer as MapBaseLayer)) return layer as MapBaseLayer
    return null
  } catch {
    return null
  }
}

function setStoredMapLayer(layer: MapBaseLayer) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      MAP_LAYER_STORAGE_KEY,
      JSON.stringify({ layer, expiresAt: Date.now() + MAP_LAYER_TTL_MS })
    )
  } catch {
    // ignore
  }
}

const storedLayer = getStoredMapLayer()
const mapBaseLayer = ref<MapBaseLayer>(storedLayer ?? 'standard')
if (storedLayer) setStoredMapLayer(storedLayer)

function cycleMapBaseLayer() {
  const i = LAYERS.indexOf(mapBaseLayer.value)
  const next = LAYERS[(i + 1) % LAYERS.length]
  if (next) {
    mapBaseLayer.value = next
    setStoredMapLayer(next)
  }
}

const mapBaseLayerLabel = computed(() => t(`map.layer${mapBaseLayer.value === 'standard' ? 'Standard' : mapBaseLayer.value === 'satellite' ? 'Satellite' : 'Terrain'}`))

const tileLayerUrl = computed(() => {
  if (mapBaseLayer.value === 'satellite') {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  }
  if (mapBaseLayer.value === 'terrain') {
    return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  }
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})
const tileLayerAttribution = computed(() => {
  if (mapBaseLayer.value === 'satellite') {
    return '© <a href="https://www.esri.com/">Esri</a> © <a href="https://carto.com/attributions">CARTO</a>'
  }
  if (mapBaseLayer.value === 'terrain') {
    return '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
    : undefined
})

const satelliteLabelsUrl = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png'

const center = ref<[number, number]>(TURKEY_CENTER)
const zoom = ref(TURKEY_ZOOM)
const selectedLocator = ref<string | null>(null)
const selectedLatLng = ref<[number, number] | null>(null)
/** Harita tıklanınca URL'i biz set ediyoruz; watch selectedLatLng'i değiştirmesin (tıklanan nokta kalsın) */
const locatorSetByClick = ref(false)
const markerRef = ref<{ leafletObject: { openPopup: () => void } } | null>(null)
const mapRef = ref<LeafletMap | null>(null)
const elevationMeters = ref<number | null>(null)
const addressPlace = ref<{
  country: string
  province: string
  district: string
  displayName?: string
} | null>(null)
const addressLoading = ref(false)
const addressCache = new Map<string, { country: string; province: string; district: string; displayName?: string }>()
const addressExpanded = ref(false)
const elevationLoading = ref(false)
const elevationCache = new Map<string, number>()
const mouseMapLatLng = ref<[number, number] | null>(null)
const locatorSearchQuery = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const channelsWithLocation = ref<CommunicationChannel[]>([])
async function fetchChannelsWithLocation() {
  try {
    const res = await api.get<{ data: CommunicationChannel[]; total: number }>(
      '/communication-channel?hasLocation=true&pageNumber=1&pageSize=500'
    )
    const list = res.data ?? []
    channelsWithLocation.value = list.filter(
      (c) =>
        c.latitude != null &&
        c.longitude != null &&
        Number.isFinite(Number(c.latitude)) &&
        Number.isFinite(Number(c.longitude))
    )
  } catch {
    channelsWithLocation.value = []
  }
}

function channelMarkerIcon(channel: CommunicationChannel): L.Icon {
  return (channel.type === 'aprs' ? aprsIcon : repeaterIcon) as L.Icon
}

function getChannelTutorial(channel: CommunicationChannel): { title: string; content: string } {
  const name =
    channel.description?.trim() ||
    channel.location?.trim() ||
    formatCommunicationChannelLabel({ communicationChannel: channel }) ||
    t('communicationChannels.types.' + channel.type)
  return buildTutorialContent({ ...channel, name }, t)
}

/** Rakım API'den async gelir; popup zaten açık, cevap gelince güncellenir. */
async function fetchElevation(lat: number, lng: number) {
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
    elevationLoading.value = false
    return
  }
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  try {
    const data = await api.get<{ elevation: number | null }>(
      `/qth/elevation?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    )
    const m = data.elevation
    if (typeof m === 'number' && Number.isFinite(m)) {
      elevationMeters.value = m
      elevationCache.set(key, m)
    } else {
      elevationMeters.value = null
    }
  } catch {
    elevationMeters.value = null
  } finally {
    elevationLoading.value = false
  }
}

const popupElevationDisplay = computed(() => {
  const m = elevationMeters.value
  if (m == null) return ''
  const ft = Math.round(m * 3.28084)
  return `${m} m / ${ft.toLocaleString()} ft`
})

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
      display_name?: string
    } | null>(`/qth/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`)
    if (!data) {
      addressPlace.value = null
      return
    }
    const addr = data.address
    const displayName = data.display_name ?? ''
    if (addr) {
      const country = addr.country ?? ''
      // İl: Nominatim Türkiye'de province (Erzurum); region = Doğu Anadolu Bölgesi
      const province =
        addr.province ??
        addr.state ??
        addr.state_district ??
        addr.region ??
        ''
      // İlçe: town (Yakutiye), county, municipality
      const district =
        addr.town ??
        addr.county ??
        addr.municipality ??
        addr.village ??
        ''
      const place = { country, province, district, displayName: displayName || undefined }
      addressPlace.value = place
      addressCache.set(key, place)
    }
  } catch {
    addressPlace.value = null
  } finally {
    addressLoading.value = false
  }
}

const popupAddressDisplay = computed(() => {
  const p = addressPlace.value
  if (!p) return ''
  const parts = [p.district, p.province, p.country].filter(Boolean)
  return parts.join(', ')
})

/** Tek kaynak: URL. 2/4/6/8/10 karakter locator'ı parseLocatorForMap ile normalize edip kullanır. */
function syncFromUrl() {
  const loc =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('locator')?.trim()?.toUpperCase() ?? null
      : null

  const parsed = loc ? parseLocatorForMap(loc) : null
  if (parsed) {
    const [a, b] = parsed.bounds
    center.value = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    zoom.value = getZoomForLocatorLength(parsed.forConversion.length as 2 | 4 | 6 | 8 | 10)
    selectedLocator.value = parsed.display
    selectedLatLng.value = [parsed.wgs84.lat, parsed.wgs84.lng]
    locatorSearchQuery.value = parsed.display
    nextTick(() => mapRef.value?.setView(center.value, zoom.value))
    return
  }

  const userGrid = authStore.user?.operator?.gridSquare?.trim()?.toUpperCase()
  const userParsed = userGrid ? parseLocatorForMap(userGrid) : null
  if (userParsed) {
    const [a, b] = userParsed.bounds
    center.value = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    zoom.value = getZoomForLocatorLength(userParsed.forConversion.length as 2 | 4 | 6 | 8 | 10)
    selectedLocator.value = userParsed.display
    selectedLatLng.value = [userParsed.wgs84.lat, userParsed.wgs84.lng]
    locatorSearchQuery.value = userParsed.display
    nextTick(() => mapRef.value?.setView(center.value, zoom.value))
    return
  }

  center.value = TURKEY_CENTER
  zoom.value = TURKEY_ZOOM
  selectedLocator.value = null
  selectedLatLng.value = null
  locatorSearchQuery.value = ''
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        center.value = [pos.coords.latitude, pos.coords.longitude]
        zoom.value = 15
      },
      () => {}
    )
  }
}

function onMapReady(map: LeafletMap) {
  mapRef.value = map
  map.setView(center.value, zoom.value)

  // Popup: marker gecikmeli mount oluyor; 3 saniye boyunca her 150ms dene
  if (selectedLatLng.value) {
    openPopupIfReady()
    let n = 0
    const tid = setInterval(() => {
      openPopupIfReady()
      n++
      if (n >= 20) clearInterval(tid)
    }, 150)
  }

  map.on('mousemove', (e: { latlng: { lat: number; lng: number } }) => {
    mouseMapLatLng.value = [e.latlng.lat, e.latlng.lng]
  })
  map.on('mouseout', () => {
    mouseMapLatLng.value = null
  })
  map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng
    const locator = nativeWGS84ToMaidenhead({ lat, lng }, 10)
    selectedLatLng.value = [lat, lng]
    selectedLocator.value = locator
    locatorSearchQuery.value = locator
    locatorSetByClick.value = true
    router.replace({ name: 'map', query: { locator } })
  })
  map.on('moveend', () => setStoredMapLayer(mapBaseLayer.value))
  map.on('zoomend', () => setStoredMapLayer(mapBaseLayer.value))
}

/** Popup kapatıldığında pin, query string ve search box temizle. Replace'ı nextTick ile yapıyoruz ki geri giderken unmount sırasında tetiklenen popupclose replace yapıp tekrar /map'e çekmesin. */
function clearSelection() {
  selectedLatLng.value = null
  selectedLocator.value = null
  locatorSearchQuery.value = ''
  nextTick(() => {
    if (route.name === 'map') {
      router.replace({ name: 'map', query: {} })
    }
  })
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/dashboard')
  }
}

/** Search box'tan girilen QTH ile haritaya git; zoom değişmez, sadece merkez ve pin. */
function goToLocatorFromSearch(raw: string) {
  const s = raw.trim().toUpperCase()
  if (s.length < LOCATOR_SEARCH_MIN_LEN || s.length > LOCATOR_SEARCH_MAX_LEN) return
  const parsed = parseLocatorForMap(s)
  if (!parsed) return
  const [a, b] = parsed.bounds
  center.value = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  selectedLocator.value = parsed.display
  selectedLatLng.value = [parsed.wgs84.lat, parsed.wgs84.lng]
  router.replace({ name: 'map', query: { locator: parsed.display } })
  nextTick(() => mapRef.value?.setView(center.value, zoom.value))
}

/** Marker haritaya eklendiği anda popup aç; popup kapanınca pin ve query temizle. */
function onMarkerAdd(e: { target: { openPopup?: () => void; on?: (ev: string, fn: () => void) => void } }) {
  const open = () => e.target.openPopup?.()
  nextTick(open)
  setTimeout(open, 80)
  e.target.on?.('popupclose', clearSelection)
}

function copyLocator() {
  if (!selectedLocator.value) return
  navigator.clipboard?.writeText(selectedLocator.value)
}

const mapUrl = computed(() =>
  selectedLocator.value ? getMapLocatorUrl(selectedLocator.value) : ''
)

const popupDMS = computed(() => {
  const ll = selectedLatLng.value
  return ll ? formatLatLngDMS(ll[0], ll[1]) : ''
})

const popupUtcOffset = computed(() => {
  const ll = selectedLatLng.value
  return ll ? approximateUtcOffsetFromLng(ll[1]) : ''
})

const popupDecimalDisplay = computed(() => {
  const ll = selectedLatLng.value
  return ll ? `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}` : ''
})

const mousePositionDisplay = computed(() => {
  const ll = mouseMapLatLng.value
  if (!ll) return null
  const latLng = `${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}`
  const qth = WGS84ToMaidenhead({ lat: ll[0], lng: ll[1] })
  return { latLng, qth }
})

function copyDecimal() {
  const text = popupDecimalDisplay.value
  if (!text) return
  navigator.clipboard?.writeText(text)
}

function copyDMS() {
  const text = popupDMS.value
  if (!text) return
  navigator.clipboard?.writeText(text)
}

function shareMapLink() {
  if (!mapUrl.value) return
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${mapUrl.value}` : mapUrl.value
  navigator.clipboard?.writeText(fullUrl)
}

// İlk render ÖNCE URL'den state al ki LMap/LMarker doğru değerle oluşsun; mount sonrası tekrar (fallback)
syncFromUrl()
onMounted(() => {
  setTimeout(syncFromUrl, 0)
  fetchChannelsWithLocation()
})

// Geri/ileri veya harita tıklayınca URL değişir; state'i güncelle (parseLocatorForMap ile 2/4/6/8 destek)
watch(
  () => route.query.locator,
  (loc) => {
    const s = (loc as string)?.trim()?.toUpperCase()
    if (!s) return
    if (locatorSetByClick.value) {
      locatorSetByClick.value = false
      selectedLocator.value = s
      return
    }
    const parsed = parseLocatorForMap(s)
    if (!parsed) return
    const [a, b] = parsed.bounds
    center.value = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    selectedLocator.value = parsed.display
    selectedLatLng.value = [parsed.wgs84.lat, parsed.wgs84.lng]
    nextTick(() => mapRef.value?.setView(center.value, zoom.value))
  },
  { immediate: false }
)

// Search box: en az 2 karakter girilince debounce ile QTH araması yap.
watch(locatorSearchQuery, (val) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  const s = val.trim().toUpperCase()
  if (s === '' && (selectedLatLng.value || selectedLocator.value)) {
    clearSelection()
    return
  }
  if (s.length >= LOCATOR_SEARCH_MIN_LEN && s.length <= LOCATOR_SEARCH_MAX_LEN) {
    searchDebounceTimer = setTimeout(() => {
      goToLocatorFromSearch(val)
      searchDebounceTimer = null
    }, SEARCH_DEBOUNCE_MS)
  }
})

// Popup aç: tıklanınca veya query string ile açıldığında. Marker bazen henüz mount olmamış olur (query ile açılış),
// bu yüzden hem hemen hem de marker hazır olduktan sonra tekrar deniyoruz.
function openPopupIfReady() {
  if (!selectedLatLng.value) return
  const marker = markerRef.value?.leafletObject
  if (marker?.openPopup) marker.openPopup()
}

watch(selectedLatLng, (latlng) => {
  if (!latlng) return
  nextTick(openPopupIfReady)
  ;[150, 400, 800, 1500].forEach((ms) => setTimeout(openPopupIfReady, ms))
})
watch(() => markerRef.value?.leafletObject, (obj) => {
  if (obj && selectedLatLng.value) nextTick(() => obj.openPopup?.())
}, { immediate: true })

// Rakım: cache varsa hemen göster, yoksa API'den async al. immediate: true ile querystring ile açıldığında da tetiklenir.
watch(selectedLatLng, (latlng) => {
  if (!latlng) {
    elevationMeters.value = null
    return
  }
  const [lat, lng] = latlng
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
  const cached = elevationCache.get(key)
  if (cached != null) {
    elevationMeters.value = cached
    return
  }
  elevationMeters.value = null
  elevationLoading.value = true
  fetchElevation(lat, lng)
}, { immediate: true })

// Adres: cache varsa hemen göster, yoksa async al. immediate: true ile querystring ile açıldığında da tetiklenir.
watch(selectedLatLng, (latlng) => {
  addressExpanded.value = false
  if (!latlng) {
    addressPlace.value = null
    return
  }
  const [lat, lng] = latlng
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`
  const cached = addressCache.get(key)
  if (cached) {
    addressPlace.value = cached
    return
  }
  fetchAddress(lat, lng)
}, { immediate: true })
</script>

<template>
  <div class="fixed inset-0 z-0 flex flex-col bg-background">
    <div
      class="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between gap-2 p-3 safe-area-inset"
    >
      <Button
        variant="outline"
        size="sm"
        class="shrink-0"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4 mr-2" aria-hidden="true" />
        {{ t('common.back') }}
      </Button>
      <span class="text-sm font-medium text-muted-foreground truncate">
        {{ t('map.title') }}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        class="shrink-0"
        :aria-label="mapBaseLayerLabel"
        :title="mapBaseLayerLabel"
        @click="cycleMapBaseLayer"
      >
        <Layers class="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>

    <div class="flex-1 min-h-0 pt-14 relative">
      <!-- Alt orta: QTH bilgisi (fare üzerindeyken) + search box, ikisi de transparan -->
      <div
        class="absolute left-1/2 -translate-x-1/2 bottom-4 z-[500] flex items-center gap-2 px-2"
      >
        <div
          v-if="mousePositionDisplay"
          class="hidden md:block shrink-0 px-3 py-1.5 rounded-md bg-background/90 border border-border/50 shadow-sm pointer-events-none"
          aria-live="polite"
        >
          <span class="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
            {{ mousePositionDisplay.latLng }}
            <span class="mx-1.5 text-border">·</span>
            {{ mousePositionDisplay.qth }}
          </span>
        </div>
        <div class="relative w-full max-w-xs">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="locatorSearchQuery"
            type="text"
            :placeholder="t('map.searchPlaceholder')"
            :maxlength="LOCATOR_SEARCH_MAX_LEN"
            :class="[
              'pl-9 w-full bg-background/90 border border-border/50 shadow-sm font-mono text-sm placeholder:text-muted-foreground/50',
              locatorSearchQuery ? 'pr-9' : ''
            ]"
            :aria-label="t('map.searchPlaceholder')"
          />
          <button
            v-if="locatorSearchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="t('common.clear')"
            @click="clearSelection"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <LMap
        :use-global-leaflet="true"
        :center="center"
        :zoom="zoom"
        class="h-full w-full"
        :options="{ zoomControl: false }"
        @update:zoom="(z) => (zoom = z)"
        @ready="onMapReady"
      >
        <LTileLayer
          :url="tileLayerUrl"
          :attribution="tileLayerAttribution"
        />
        <LTileLayer
          v-if="mapBaseLayer === 'satellite'"
          :url="satelliteLabelsUrl"
          :attribution="undefined"
          :z-index="650"
        />
        <!-- İletişim kanalları (lat/lng olan röle ve APRS) -->
        <template v-for="ch in channelsWithLocation" :key="ch.id">
          <LMarker
            :lat-lng="[Number(ch.latitude!), Number(ch.longitude!)]"
            :icon="channelMarkerIcon(ch)"
          >
            <LPopup :options="{ closeButton: true }">
              <div class="channel-popup min-w-[16rem] max-w-[20rem] rounded-md border border-border bg-background py-2 px-3 shadow-sm">
                <div class="font-medium text-sm mb-1">
                  {{ ch.description?.trim() || ch.location?.trim() || formatCommunicationChannelLabel({ communicationChannel: ch }) || t('communicationChannels.types.' + ch.type) }}
                </div>
                <div class="text-xs text-muted-foreground mb-2">
                  {{ t('communicationChannels.types.' + ch.type) }}
                  <span v-if="ch.location" class="block mt-0.5">{{ ch.location }}</span>
                </div>
                <Separator class="my-2" />
                <p class="text-xs font-medium text-muted-foreground mb-1">{{ t('communicationChannels.howToConnect') }}</p>
                <div class="text-xs whitespace-pre-line leading-snug">{{ getChannelTutorial(ch).content }}</div>
              </div>
            </LPopup>
          </LMarker>
        </template>
        <LMarker
          v-if="selectedLatLng"
          ref="markerRef"
          :lat-lng="selectedLatLng"
          @add="onMarkerAdd"
        >
          <LPopup :options="{ closeButton: false }">
            <div class="min-w-[14rem] rounded-md border border-border bg-background py-2 px-3 shadow-sm">
              <!-- QTH locator -->
              <div class="flex items-center gap-2">
                <Crosshair class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="font-mono text-sm font-medium min-w-0 flex-1 truncate">{{ selectedLocator }}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  class="shrink-0"
                  :aria-label="t('map.copyLocatorA11y')"
                  @click="copyLocator"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Separator class="my-2" />
              <!-- İlçe, il, ülke + isteğe bağlı tam adres -->
              <div class="text-xs">
                <div class="flex items-center gap-2">
                  <Globe class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span v-if="addressLoading" class="text-muted-foreground">{{ t('common.loading') }}</span>
                  <span v-else-if="popupAddressDisplay" class="font-medium min-w-0 flex-1 break-words">{{ popupAddressDisplay }}</span>
                  <span v-else class="text-muted-foreground">—</span>
                  <Button
                    v-if="addressPlace?.displayName && !addressLoading"
                    variant="outline"
                    size="icon-sm"
                    class="shrink-0"
                    :aria-label="addressExpanded ? t('map.addressCollapseA11y') : t('map.addressExpandA11y')"
                    @click="addressExpanded = !addressExpanded"
                  >
                    <ChevronDown v-if="!addressExpanded" class="h-4 w-4" aria-hidden="true" />
                    <ChevronUp v-else class="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <p
                  v-if="addressExpanded && addressPlace?.displayName"
                  class="mt-1.5 pl-6 text-muted-foreground break-words leading-snug"
                >
                  {{ addressPlace.displayName }}
                </p>
              </div>
              <!-- Tahmini GMT -->
              <div v-if="popupUtcOffset" class="flex items-center gap-2 text-xs mt-2">
                <Clock class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="font-medium">{{ popupUtcOffset }}</span>
              </div>
              <Separator class="my-2" />
              <!-- Decimal koordinat -->
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="text-sm font-medium tabular-nums break-all min-w-0 flex-1">{{ popupDecimalDisplay }}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  class="shrink-0"
                  :aria-label="t('map.copyDecimalA11y')"
                  @click="copyDecimal"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <!-- DMS koordinat -->
              <div class="flex items-center gap-2 mt-1.5">
                <Compass class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="text-sm font-medium tabular-nums break-all min-w-0 flex-1">{{ popupDMS }}</span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  class="shrink-0"
                  :aria-label="t('map.copyDMSA11y')"
                  @click="copyDMS"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <!-- Yükseklik -->
              <div class="flex items-center gap-2 text-xs mt-2">
                <Mountain class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span v-if="elevationLoading" class="text-muted-foreground">{{ t('common.loading') }}</span>
                <span v-else-if="popupElevationDisplay" class="font-medium tabular-nums">{{ popupElevationDisplay }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </div>
              <Separator class="my-2" />
              <!-- Share sola, kapat sağa -->
              <div class="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="icon-sm"
                  class="shrink-0"
                  :aria-label="t('map.shareMapA11y')"
                  @click="shareMapLink"
                >
                  <Share2 class="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  class="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  :aria-label="t('common.close')"
                  @click="clearSelection"
                >
                  <X class="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </LPopup>
        </LMarker>
      </LMap>
    </div>

    <footer class="flex-shrink-0 border-t border-border/20 bg-background/95 safe-area-inset">
      <div class="flex justify-between items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <p class="shrink-0">© {{ new Date().getFullYear() }} {{ t('brand.erzurumBranch') }}</p>
        <div class="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />
          <LangToggle />
          <AppVersionBox />
          <span>73!</span>
        </div>
      </div>
    </footer>
  </div>
</template>
