<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft,
  Clock,
  Compass,
  Copy,
  Crosshair,
  Globe,
  Layers,
  MapPin,
  Mountain,
  Ruler,
  Search,
  Share2,
  X
} from 'lucide-vue-next'
import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LPopup, LPolyline } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
import AppFooter from '@/components/layout/AppFooter.vue'
import MapSearchPanel from '@/components/shared/MapSearchPanel.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { toast } from 'vue-sonner'

const TURKEY_CENTER: [number, number] = [39.93, 32.85]
const TURKEY_ZOOM = 6
import { useCookieConsentStore } from '@/stores/cookieConsent'

const cookieStore = useCookieConsentStore()

const MAP_LAYER_STORAGE_KEY = 'trac-map-layer'
const MAP_LAYER_TTL_MS = 60 * 60 * 1000
const SEARCH_DEBOUNCE_MS = 400
const LOCATOR_SEARCH_MIN_LEN = 2
const LOCATOR_SEARCH_MAX_LEN = 10

/** Röle: küçük kule ikonu, 16x16 — yakınlaştırınca görünür */
const REPEATER_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><path d="M16.2 4.7a6.14 6.14 0 0 1 .8 7.5"/><path d="M19.1 1.9a10.56 10.56 0 0 1 0 14.2"/><circle cx="12" cy="9" r="2"/><path d="M12 11v7"/></svg>'
/** APRS: küçük navigasyon ikonu, 14x14 */
const APRS_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>'

const CHANNEL_ICON_STYLES = {
  repeater: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb' },
  aprs: { bg: '#fff7ed', border: '#fdba74', icon: '#ea580c' },
} as const

function createChannelIcon(type: 'repeater' | 'aprs'): L.DivIcon {
  const svg = type === 'aprs' ? APRS_ICON_SVG : REPEATER_ICON_SVG
  const { bg, border, icon } = CHANNEL_ICON_STYLES[type]
  return L.divIcon({
    className: 'channel-marker-icon',
    html: `<div class="channel-marker-dot" style="background:${bg};border-color:${border};color:${icon}">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const repeaterIcon = createChannelIcon('repeater')
const aprsIcon = createChannelIcon('aprs')

/** Tıklanan noktada sadece popup gösterilir; pin yok. Ok tam tıklanan noktayı gösterir. */
const selectionMarkerIcon = L.divIcon({
  className: 'selection-marker-invisible',
  html: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  let sizeClass = 'channel-cluster-small'
  let size = 36
  if (count >= 50) { sizeClass = 'channel-cluster-large'; size = 48 }
  else if (count >= 10) { sizeClass = 'channel-cluster-medium'; size = 42 }
  return L.divIcon({
    html: `<div class="channel-cluster ${sizeClass}"><span>${count}</span></div>`,
    className: 'channel-cluster-icon',
    iconSize: [size, size],
  })
}

// ---- Programmatic cluster layer ----
let channelClusterGroup: any = null

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()

type MapBaseLayer = 'standard' | 'satellite' | 'terrain'
const LAYERS: MapBaseLayer[] = ['standard', 'satellite', 'terrain']

function getStoredMapLayer(): MapBaseLayer | null {
  if (!cookieStore.isAllAllowed) return null
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
  if (!cookieStore.isAllAllowed) return
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
const coordModeDMS = ref(false)
const elevationCache = new Map<string, number>()
const mouseMapLatLng = ref<[number, number] | null>(null)
const locatorSearchQuery = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

/* ---- Search panel state ---- */
const searchPanelRef = ref<InstanceType<typeof MapSearchPanel> | null>(null)
const mobileSearchPanelRef = ref<InstanceType<typeof MapSearchPanel> | null>(null)
const mobileSheetOpen = ref(false)
const desktopPanelOpen = ref(false)
const mapSelectingPoint = ref<'A' | 'B' | null>(null)

function openSearchPanel() {
  if (window.innerWidth >= 1024) {
    desktopPanelOpen.value = true
  } else {
    mobileSheetOpen.value = true
  }
}

// When sidebar opens/closes, Leaflet must recalculate container size
watch(desktopPanelOpen, () => {
  // Wait for the CSS transition to finish (300ms open / 200ms close)
  setTimeout(() => mapRef.value?.invalidateSize(), 350)
})

/** Custom circle-with-letter DivIcon for A/B measurement markers */
function createPointIcon(letter: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'measurement-marker-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full border-2 shadow-md text-xs font-bold" style="background-color:${color};border-color:white;color:white">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}
const pointAIcon = createPointIcon('A', '#2563eb')
const pointBIcon = createPointIcon('B', '#dc2626')

/** Computed measurement marker positions (reactive from search panel) */
const measurePointA = computed(() => {
  const p = searchPanelRef.value?.pointA
  return p ? [p.lat, p.lng] as [number, number] : null
})
const measurePointB = computed(() => {
  const p = searchPanelRef.value?.pointB
  return p ? [p.lat, p.lng] as [number, number] : null
})
const measureLine = computed(() => {
  if (!measurePointA.value || !measurePointB.value) return null
  return [measurePointA.value, measurePointB.value]
})

/** Ölçüm markerına tıklanınca o konumda popup aç */
function openPopupAtMeasurePoint(latlng: [number, number]) {
  const [lat, lng] = latlng
  const locator = nativeWGS84ToMaidenhead({ lat, lng }, 10)
  selectedLatLng.value = [lat, lng]
  selectedLocator.value = locator
  locatorSearchQuery.value = locator
  locatorSetByClick.value = true
  router.replace({ name: 'map', query: { locator } })
}

function handleSearchGoTo(lat: number, lng: number, _label: string) {
  center.value = [lat, lng]
  zoom.value = 14
  const locator = nativeWGS84ToMaidenhead({ lat, lng }, 10)
  selectedLatLng.value = [lat, lng]
  selectedLocator.value = locator
  locatorSearchQuery.value = locator
  locatorSetByClick.value = true
  router.replace({ name: 'map', query: { locator } })
  nextTick(() => mapRef.value?.setView(center.value, zoom.value))
  // Close mobile sheet after navigation
  mobileSheetOpen.value = false
}

/** Popup'taki ölçüm butonu: A noktasını seç, panel aç, popup kapat */
function startMeasureFromPopup() {
  const ll = selectedLatLng.value
  if (!ll) return
  const lat = ll[0]
  const lng = ll[1]
  const label = popupAddressDisplay.value || `${lat.toFixed(5)}, ${lng.toFixed(5)}`

  // Popup'u kapat
  clearSelection()

  const isMobile = window.innerWidth < 1024

  if (!isMobile) {
    // Desktop: sidebar aç, ölçüm tabına geç, A noktasını set et
    desktopPanelOpen.value = true
    nextTick(() => {
      const panel = searchPanelRef.value
      if (panel) {
        panel.activeTab = 'measure'
        panel.setMeasurementPoint(lat, lng, label, 'A')
      }
    })
  } else {
    // Mobil: gizli desktop panel üzerinde de set et (harita markerları için)
    if (searchPanelRef.value) {
      searchPanelRef.value.activeTab = 'measure'
      searchPanelRef.value.setMeasurementPoint(lat, lng, label, 'A')
    }
    // Sheet'i aç
    mobileSheetOpen.value = true
    nextTick(() => {
      nextTick(() => {
        const panel = mobileSearchPanelRef.value
        if (panel) {
          panel.activeTab = 'measure'
          panel.setMeasurementPoint(lat, lng, label, 'A')
        }
      })
    })
  }
}

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

function channelMarkerIcon(channel: CommunicationChannel): L.DivIcon {
  return channel.type === 'aprs' ? aprsIcon : repeaterIcon
}

const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function buildChannelPopupHtml(ch: CommunicationChannel): string {
  const name = escapeHtml(
    ch.description?.trim() ||
    ch.location?.trim() ||
    formatCommunicationChannelLabel({ communicationChannel: ch }) ||
    t('communicationChannels.types.' + ch.type)
  )
  const typeName = escapeHtml(t('communicationChannels.types.' + ch.type))
  const location = ch.location ? `<span class="block mt-0.5">${escapeHtml(ch.location)}</span>` : ''
  const tutorial = getChannelTutorial(ch)
  const howTo = escapeHtml(t('communicationChannels.howToConnect'))
  return `<div class="channel-popup min-w-[16rem] max-w-[20rem] rounded-md border border-border bg-background py-2 px-3 shadow-sm">
    <div class="font-medium text-sm mb-1">${name}</div>
    <div class="text-xs text-muted-foreground mb-2">${typeName}${location}</div>
    <hr class="my-2 border-border" />
    <p class="text-xs font-medium text-muted-foreground mb-1">${howTo}</p>
    <div class="text-xs whitespace-pre-line leading-snug">${escapeHtml(tutorial.content)}</div>
  </div>`
}

function updateChannelCluster() {
  const map = mapRef.value
  if (!map) return
  if (channelClusterGroup) {
    map.removeLayer(channelClusterGroup)
    channelClusterGroup = null
  }
  if (!channelsWithLocation.value.length) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster extends L at runtime
  const markerClusterGroupFn = (L as any).markerClusterGroup
  if (!markerClusterGroupFn) return
  const group = markerClusterGroupFn({
    chunkedLoading: true,
    maxClusterRadius: 55,
    iconCreateFunction: createClusterIcon,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 14,
  })
  for (const ch of channelsWithLocation.value) {
    const lat = Number(ch.latitude)
    const lng = Number(ch.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const marker = L.marker([lat, lng], { icon: channelMarkerIcon(ch) })
    marker.bindPopup(buildChannelPopupHtml(ch), { closeButton: true })
    group.addLayer(marker)
  }
  group.addTo(map)
  channelClusterGroup = group
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
  nextTick(updateChannelCluster)

  // Popup: marker gecikmeli mount olabilir; birkaç kez dene
  if (selectedLatLng.value) {
    openPopupIfReady()
    setTimeout(openPopupIfReady, 200)
    setTimeout(openPopupIfReady, 600)
  }

  map.on('mousemove', (e: { latlng: { lat: number; lng: number } }) => {
    mouseMapLatLng.value = [e.latlng.lat, e.latlng.lng]
  })
  map.on('mouseout', () => {
    mouseMapLatLng.value = null
  })
  map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
    const { lat, lng } = e.latlng
    // If in measurement point selection mode, delegate to search panel
    const selecting = mapSelectingPoint.value || searchPanelRef.value?.selectingPoint
    if (selecting) {
      // Panel may be unmounted (mobile sheet closed), so re-open first and set point
      mapSelectingPoint.value = null
      if (window.innerWidth < 1024) {
        // Mobile: open sheet, then set point on panel once mounted
        mobileSheetOpen.value = true
        nextTick(() => {
          nextTick(() => {
            const panel = mobileSearchPanelRef.value || searchPanelRef.value
            if (panel) panel.setMeasurementPoint(lat, lng, '', selecting)
          })
        })
      } else {
        searchPanelRef.value?.setMeasurementPoint(lat, lng, '', selecting)
      }
      return
    }
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
function onMarkerAdd(e: { target: { openPopup?: () => void; on?: (ev: string, fn: () => void) => void; getPopup?: () => { options?: Record<string, unknown> } } }) {
  nextTick(() => {
    e.target.openPopup?.()
    // İlk açılıştan sonra autoPan kapat ki async içerik güncellenince harita titresin
    setTimeout(() => {
      const popup = e.target.getPopup?.()
      if (popup?.options) popup.options.autoPan = false
    }, 300)
  })
  e.target.on?.('popupclose', clearSelection)
}

function copyLocator() {
  if (!selectedLocator.value) return
  navigator.clipboard?.writeText(selectedLocator.value)
  toast.success(t('map.locatorCopied'))
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
  toast.success(t('map.decimalCopied'))
}

function copyDMS() {
  const text = popupDMS.value
  if (!text) return
  navigator.clipboard?.writeText(text)
  toast.success(t('map.dmsCopied'))
}

function toggleCoordMode() {
  coordModeDMS.value = !coordModeDMS.value
}

function copyActiveCoord() {
  if (coordModeDMS.value) {
    copyDMS()
  } else {
    copyDecimal()
  }
}

function shareMapLink() {
  if (!mapUrl.value) return
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${mapUrl.value}` : mapUrl.value
  navigator.clipboard?.writeText(fullUrl)
  toast.success(t('map.mapLinkCopied'))
}

// İlk render ÖNCE URL'den state al ki LMap/LMarker doğru değerle oluşsun; mount sonrası tekrar (fallback)
syncFromUrl()
onMounted(() => {
  setTimeout(syncFromUrl, 0)
  fetchChannelsWithLocation().then(() => nextTick(updateChannelCluster))
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

    <div class="flex-1 min-h-0 pt-14 relative flex">
      <!-- Desktop sidebar (lg+) -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="-translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="-translate-x-full opacity-0"
      >
        <aside
          v-if="desktopPanelOpen"
          class="hidden lg:flex flex-col w-80 shrink-0 border-r border-border bg-background z-[500] relative"
        >
          <div class="absolute top-2 right-2 z-10">
            <Button
              variant="ghost"
              size="icon-sm"
              @click="desktopPanelOpen = false"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <MapSearchPanel
            ref="searchPanelRef"
            :visible="desktopPanelOpen"
            @go-to="handleSearchGoTo"
            @select-point="(w: 'A' | 'B') => { mapSelectingPoint = w }"
          />
        </aside>
      </Transition>

      <div class="flex-1 min-h-0 relative">
      <!-- Open button (only when sidebar/sheet is closed) -->
      <Button
        v-if="!desktopPanelOpen && !mobileSheetOpen"
        variant="outline"
        size="icon-sm"
        class="absolute top-3 left-3 z-[500] bg-background/90 border border-border/50 shadow-sm"
        :aria-label="t('mapSearch.openSearch')"
        @click="openSearchPanel"
      >
        <Search class="h-4 w-4" />
      </Button>
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
        <!-- İletişim kanalları: programmatic cluster layer ile ekleniyor (onMapReady + updateChannelCluster) -->
        <LMarker
          v-if="selectedLatLng"
          ref="markerRef"
          :lat-lng="selectedLatLng"
          :icon="(selectionMarkerIcon as any)"
          @add="onMarkerAdd"
        >
          <LPopup :options="{ closeButton: false, autoPan: true, autoPanPadding: [40, 40], className: 'compact-popup' }">
            <!-- Desktop popup -->
            <div class="hidden md:block w-[15rem] rounded-md border border-border bg-background py-1.5 px-2.5 shadow-sm">
              <!-- QTH locator + copy -->
              <div class="flex items-center gap-1.5">
                <Crosshair class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="font-mono text-xs font-medium min-w-0 flex-1 truncate">{{ selectedLocator }}</span>
                <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.copyLocatorA11y')" @click="copyLocator">
                  <Copy class="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
              <!-- Adres -->
              <div class="flex items-center gap-1.5 mt-1 text-[11px] leading-tight">
                <Globe class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span v-if="addressLoading" class="text-muted-foreground">{{ t('common.loading') }}</span>
                <span v-else-if="popupAddressDisplay" class="font-medium min-w-0 flex-1 truncate" :title="addressPlace?.displayName">{{ popupAddressDisplay }}</span>
                <span v-else class="text-muted-foreground">—</span>
              </div>
              <!-- Koordinat (tıkla → decimal/DMS geçişi) + kopyala -->
              <div class="flex items-center gap-1.5 mt-1 cursor-pointer" @click="toggleCoordMode">
                <MapPin v-if="!coordModeDMS" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Compass v-else class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="text-xs font-medium tabular-nums min-w-0 flex-1 truncate">{{ coordModeDMS ? popupDMS : popupDecimalDisplay }}</span>
                <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" @click.stop="copyActiveCoord">
                  <Copy class="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
              <!-- Timezone + Yükseklik aynı satır -->
              <div class="flex items-center gap-3 mt-1 text-[11px] leading-tight">
                <div v-if="popupUtcOffset" class="flex items-center gap-1">
                  <Clock class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span class="font-medium">{{ popupUtcOffset }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <Mountain class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span v-if="elevationLoading" class="text-muted-foreground">…</span>
                  <span v-else-if="popupElevationDisplay" class="font-medium tabular-nums">{{ popupElevationDisplay }}</span>
                  <span v-else class="text-muted-foreground">—</span>
                </div>
              </div>
              <Separator class="my-1.5" />
              <!-- Aksiyon butonları -->
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.measureFromHere')" :title="t('map.measureFromHere')" @click="startMeasureFromPopup">
                    <Ruler class="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.shareMapA11y')" @click="shareMapLink">
                    <Share2 class="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs trac-btn-icon-destructive" :aria-label="t('common.close')" @click="clearSelection">
                  <X class="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <!-- Mobile popup -->
            <div class="md:hidden w-[13rem] rounded-md border border-border bg-background py-1.5 px-2 shadow-sm">
              <!-- QTH locator -->
              <div class="flex items-center gap-1.5">
                <Crosshair class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="font-mono text-[11px] font-medium min-w-0 flex-1 truncate">{{ selectedLocator }}</span>
              </div>
              <!-- Adres -->
              <div v-if="popupAddressDisplay" class="flex items-center gap-1.5 mt-0.5">
                <Globe class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="text-[11px] text-muted-foreground min-w-0 flex-1 truncate">{{ popupAddressDisplay }}</span>
              </div>
              <!-- Koordinat (tıkla → geçiş) -->
              <div class="flex items-center gap-1.5 mt-0.5 cursor-pointer" @click="toggleCoordMode">
                <MapPin v-if="!coordModeDMS" class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Compass v-else class="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="text-[11px] font-mono tabular-nums min-w-0 flex-1 truncate">{{ coordModeDMS ? popupDMS : popupDecimalDisplay }}</span>
              </div>
              <!-- Timezone + Yükseklik aynı satır -->
              <div class="flex items-center gap-2 mt-0.5 text-[10px] leading-tight">
                <div v-if="popupUtcOffset" class="flex items-center gap-0.5">
                  <Clock class="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span class="font-medium">{{ popupUtcOffset }}</span>
                </div>
                <div class="flex items-center gap-0.5">
                  <Mountain class="h-2.5 w-2.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span v-if="elevationLoading" class="text-muted-foreground">…</span>
                  <span v-else-if="popupElevationDisplay" class="font-medium tabular-nums">{{ popupElevationDisplay }}</span>
                  <span v-else class="text-muted-foreground">—</span>
                </div>
              </div>
              <Separator class="my-1" />
              <!-- Aksiyon butonları -->
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.measureFromHere')" @click="startMeasureFromPopup">
                    <Ruler class="h-3 w-3" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.copyLocatorA11y')" @click="copyLocator">
                    <Copy class="h-3 w-3" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs" :aria-label="t('map.shareMapA11y')" @click="shareMapLink">
                    <Share2 class="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon-sm" class="trac-icon-btn-xs trac-btn-icon-destructive" :aria-label="t('common.close')" @click="clearSelection">
                  <X class="h-3 w-3" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </LPopup>
        </LMarker>
        <!-- Measurement markers A/B -->
        <LMarker v-if="measurePointA" :lat-lng="measurePointA" :icon="(pointAIcon as any)" @click="openPopupAtMeasurePoint(measurePointA!)" />
        <LMarker v-if="measurePointB" :lat-lng="measurePointB" :icon="(pointBIcon as any)" @click="openPopupAtMeasurePoint(measurePointB!)" />
        <!-- Measurement line between A and B -->
        <LPolyline
          v-if="measureLine"
          :lat-lngs="measureLine"
          :options="{ color: '#2563eb', weight: 2, dashArray: '8, 6', opacity: 0.8 }"
        />
      </LMap>
      </div><!-- /map inner -->



      <!-- Mobile Sheet -->
      <Sheet v-model:open="mobileSheetOpen">
        <SheetContent side="bottom" class="h-[85vh] flex flex-col p-0 rounded-t-xl">
          <SheetHeader class="px-4 pt-4 pb-0 shrink-0">
            <SheetTitle>{{ t('mapSearch.openSearch') }}</SheetTitle>
          </SheetHeader>
          <MapSearchPanel
            :ref="(el: any) => { mobileSearchPanelRef = el; if (!desktopPanelOpen) searchPanelRef = el }"
            :visible="mobileSheetOpen"
            @go-to="handleSearchGoTo"
            @close="mobileSheetOpen = false"
            @select-point="(w: 'A' | 'B') => { mapSelectingPoint = w }"
          />
        </SheetContent>
      </Sheet>
    </div>

    <AppFooter class="bg-background/95 safe-area-inset px-4 py-3" />
  </div>
</template>

<style>
/* Tıklanan noktada pin yok; sadece popup. Marker görünmez. */
.selection-marker-invisible {
  background: none !important;
  border: none !important;
}

/* Leaflet popup chrome: minimal */
.compact-popup .leaflet-popup-content-wrapper {
  padding: 0 !important;
  border-radius: 0.375rem !important;
  background: transparent !important;
  box-shadow: none !important;
}
.compact-popup .leaflet-popup-content {
  margin: 0 !important;
  min-width: 0 !important;
}
.compact-popup .leaflet-popup-tip-container {
  margin-top: -1px;
}

/* Popup ve ok her zaman opak */
.compact-popup .leaflet-popup-tip {
  background: var(--background) !important;
  border: 1px solid var(--border) !important;
  box-shadow: none !important;
}
</style>
