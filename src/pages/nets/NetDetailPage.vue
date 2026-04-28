<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  Award,
  Clock,
  FileSpreadsheet,
  Image,
  MapPin,
  Plus,
  Printer,
  Share2,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import AppLayout from '@/components/layout/AppLayout.vue'
import { api, API_BASE } from '@/lib/api'
import { getFilenameFromContentDisposition } from '@/lib/content-disposition'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { toast } from 'vue-sonner'
import { useDateFormat } from '@/composables'
import { translateError } from '@/i18n'
import { getReportExportStyles, REPORT_EXPORT_WIDTH } from '@/lib/reportExportStyles'
import EditAttendeeSheet from '@/components/nets/EditAttendeeSheet.vue'
import EditNetSheet from '@/components/nets/EditNetSheet.vue'
import ShareReportSheet from '@/components/nets/ShareReportSheet.vue'
import ExportReportTemplate from '@/components/nets/ExportReportTemplate.vue'
import NetHeader from '@/components/nets/NetHeader.vue'
import AddAttendeePanel from '@/components/nets/AddAttendeePanel.vue'
import AttendeeList from '@/components/nets/AttendeeList.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode'
import type { Map as LeafletMap } from 'leaflet'

// Extend Leaflet with MarkerClusterGroup (side effect)
import 'leaflet.markercluster'

const MAP_DEFAULT_CENTER: [number, number] = [20, 0]
const MAP_DEFAULT_ZOOM = 2

interface Operator {
  id: string
  callSign: string
  fullName?: string
  user?: {
    id: string
  }
}

interface Attendee {
  id: string
  callSign: string
  name?: string
  country?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
  createdAt: string
  picture?: string | null
  operatorId?: string
}

interface NetCommunicationChannel {
  id: string
  communicationChannelId?: string
  isSimplexAdHoc?: boolean
  simplexFrequency?: string
  communicationChannel?: {
    id: string
    name: string
    type: string
  }
}

interface Net {
  id: string
  name: string
  startedAt?: string
  endedAt?: string
  totalDurationMinutes?: number
  attendeeCount: number
  operator: Operator
  branchId?: string
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
    isDefault: boolean
  }
  certificateTemplate?: {
    id: string
    name: string
    imagePath?: string
  } | null
  communicationChannels?: NetCommunicationChannel[]
}

interface CertificatePreview {
  templateId: string
  imagePath: string
  elements: unknown[]
}


const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { formatDateTime, formatTime } = useDateFormat()

const net = ref<Net | null>(null)
const attendees = ref<Attendee[]>([])
const isLoading = ref(true)
const isLoadingAttendees = ref(false)
const canDownloadOthersCertificates = ref(false)

const editingAttendee = ref<Attendee | null>(null)
const isEditSheetOpen = ref(false)
const isEditNetSheetOpen = ref(false)

const exportTemplateRef = ref<InstanceType<typeof ExportReportTemplate> | null>(null)
const exportAttendees = ref<Attendee[]>([])
const isExporting = ref(false)
const isSharing = ref(false)
const shareDialogOpen = ref(false)
const shareToken = ref('')
const shareUrl = ref('')
const shareQrDataUrl = ref('')
const certificatePreview = ref<CertificatePreview | null>(null)
const isLoadingCertificatePreview = ref(false)
const showAddAttendeeForm = ref(false)

const themeStore = useThemeStore()
const mapRef = ref<{ leafletObject: LeafletMap } | null>(null)
const leafletMapInstance = ref<LeafletMap | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.markercluster extends L at runtime
let clusterGroupInstance: any = null

interface AttendeePoint {
  attendee: Attendee
  lat: number
  lng: number
}
const attendeePoints = ref<AttendeePoint[]>([])
const mapLoading = ref(false)

const tileLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})
const tileLayerAttribution = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
    : undefined
})

const netStatus = computed(() => {
  if (net.value?.endedAt && !net.value?.startedAt) return 'cancelled'
  if (net.value?.endedAt) return 'completed'
  if (net.value?.startedAt) return 'active'
  return 'pending'
})
const isCompleted = computed(() => netStatus.value === 'completed')

const attendeesWithCity = computed(() =>
  attendees.value.filter((a) => (a.city ?? '').trim())
)
const showMapSection = computed(
  () => isCompleted.value && attendeesWithCity.value.length > 0
)

/** Re-geocode only when completed + unique city keys change (not on every attendees refetch). */
const attendeeGeoFingerprint = computed(() => {
  if (!isCompleted.value) return `0:${attendees.value.length}`
  const keys = new Set<string>()
  for (const a of attendees.value) {
    if (!(a.city ?? '').trim()) continue
    keys.add(`${(a.city ?? '').trim()}|${(a.district ?? '').trim()}|${(a.country ?? '').trim()}`)
  }
  return `1:${[...keys].sort().join('||')}`
})

async function buildAttendeePoints() {
  const list = attendeesWithCity.value
  if (!list.length) {
    attendeePoints.value = []
    return
  }
  mapLoading.value = true
  attendeePoints.value = []
  try {
    const keyToCoords = new Map<string, { lat: number; lng: number }>()
    const keys = [...new Set(list.map((a) => `${(a.city ?? '').trim()}|${(a.district ?? '').trim()}|${(a.country ?? '').trim()}`))]
    for (const key of keys) {
      const [city, district, country] = key.split('|')
      const params = new URLSearchParams()
      params.set('city', city ?? '')
      if (district) params.set('district', district)
      if (country) params.set('country', country)
      const res = await api.get<{ lat: number; lng: number } | null>(
        `/qth/geocode?${params.toString()}`
      )
      if (res && Number.isFinite(res.lat) && Number.isFinite(res.lng)) {
        keyToCoords.set(key, { lat: res.lat, lng: res.lng })
      }
    }
    const keyIndex = new Map<string, number>()
    const out: AttendeePoint[] = []
    for (const a of list) {
      const k = `${(a.city ?? '').trim()}|${(a.district ?? '').trim()}|${(a.country ?? '').trim()}`
      const coords = keyToCoords.get(k)
      if (!coords) continue
      const idx = keyIndex.get(k) ?? 0
      keyIndex.set(k, idx + 1)
      const offset = 0.006
      const row = Math.floor(idx / 4)
      const col = idx % 4
      out.push({
        attendee: a,
        lat: coords.lat + (row - 1.5) * offset,
        lng: coords.lng + (col - 1.5) * offset
      })
    }
    attendeePoints.value = out
  } catch (err) {
    attendeePoints.value = []
    console.warn('[NetDetail] Harita noktaları alınamadı (geocode/API hatası):', err)
  } finally {
    mapLoading.value = false
  }
}

function getPopupContent(a: Attendee): string {
  const qth = [a.district, a.city, a.country].filter(Boolean).join(', ') || '—'
  const r = a.readability
  const s = a.signalStrength
  const signal = (r != null || s != null) ? `${r ?? '-'}/${s ?? '-'}` : '—'
  const popupQth = String(t('netDetail.popupQth'))
  const popupSignal = String(t('netDetail.popupSignal'))
  const profileLabel = String(t('operators.profile'))
  const profileHref = a.operatorId ? `/operators/${encodeURIComponent(a.operatorId)}` : ''
  return `
    <div class="min-w-[12rem] rounded-md border border-border bg-background py-2 px-3 shadow-sm text-left">
      <div class="font-semibold text-sm">${escapeHtml(a.callSign)}</div>
      <div class="text-xs mt-1.5"><span class="text-muted-foreground">${escapeHtml(popupQth)}:</span> ${escapeHtml(qth)}</div>
      <div class="text-xs"><span class="text-muted-foreground">${escapeHtml(popupSignal)}:</span> ${escapeHtml(signal)}</div>
      ${profileHref ? `<a href="${escapeHtml(profileHref)}" class="text-xs mt-1.5 inline-block text-primary hover:underline focus:underline">${escapeHtml(profileLabel)}</a>` : ''}
    </div>
  `
}

function createAttendeeMarkerIcon(callSign: string): L.DivIcon {
  return L.divIcon({
    className: 'net-detail-attendee-marker',
    html: `<span class="flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium shadow border border-background/80">${escapeHtml(callSign)}</span>`,
    iconSize: [80, 24],
    iconAnchor: [40, 12]
  })
}

/** Orana göre cluster rengi (dashboard ile aynı): en yüksek oran turuncu, orta sarı, düşük yeşil */
function clusterSizeClassByRatio(count: number, total: number): string {
  const max = Math.max(total, 1)
  const ratio = count / max
  if (ratio <= 0.33) return 'marker-cluster-small'
  if (ratio <= 0.66) return 'marker-cluster-medium'
  return 'marker-cluster-large'
}

function updateCluster() {
  const map = leafletMapInstance.value
  if (!map || !attendeePoints.value.length) return
  if (clusterGroupInstance) {
    map.removeLayer(clusterGroupInstance)
    clusterGroupInstance = null
  }
  const markerClusterGroupFn = (L as any).markerClusterGroup
  if (!markerClusterGroupFn) return
  const totalMarkers = attendeePoints.value.length
  const group = markerClusterGroupFn({
    chunkedLoading: true,
    maxClusterRadius: 60,
    iconCreateFunction(cluster: { getChildCount: () => number }) {
      const count = cluster.getChildCount()
      const sizeClass = clusterSizeClassByRatio(count, totalMarkers)
      return L.divIcon({
        className: `marker-cluster ${sizeClass}`,
        html: `<div><span>${count}</span></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    },
  })
  for (const { attendee, lat, lng } of attendeePoints.value) {
    const marker = L.marker([lat, lng], {
      icon: createAttendeeMarkerIcon(attendee.callSign)
    })
    marker.bindPopup(getPopupContent(attendee), { className: 'net-detail-popup' })
    group.addLayer(marker)
  }
  group.addTo(map)
  clusterGroupInstance = group
  const bounds = clusterGroupInstance.getBounds?.()
  if (bounds?.isValid?.()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 })
}

function onMapReady(leafletMap: LeafletMap) {
  leafletMapInstance.value = mapRef.value?.leafletObject ?? leafletMap
  nextTick(() => updateCluster())
}

watch(
  () => [attendeePoints.value, leafletMapInstance.value] as const,
  () => updateCluster(),
  { flush: 'post' }
)
watch(
  attendeeGeoFingerprint,
  () => {
    if (!showMapSection.value) {
      attendeePoints.value = []
      mapLoading.value = false
      return
    }
    void buildAttendeePoints()
  },
  { immediate: true },
)

const geographicDistribution = computed(() => {
  const list = attendees.value
  const byCountry = new Map<string, number>()
  const byCity = new Map<string, number>()
  const byDistrict = new Map<string, number>()
  for (const a of list) {
    const country = (a.country ?? '').trim()
    if (country) {
      byCountry.set(country, (byCountry.get(country) ?? 0) + 1)
    }
    const city = (a.city ?? '').trim()
    if (city) {
      byCity.set(city, (byCity.get(city) ?? 0) + 1)
    }
    const district = (a.district ?? '').trim()
    if (district) {
      byDistrict.set(district, (byDistrict.get(district) ?? 0) + 1)
    }
  }
  const sortByCount = (a: { label: string; count: number }, b: { label: string; count: number }) => b.count - a.count
  return {
    byCountry: Array.from(byCountry.entries())
      .map(([label, count]) => ({ label, count }))
      .sort(sortByCount),
    byCity: Array.from(byCity.entries())
      .map(([label, count]) => ({ label, count }))
      .sort(sortByCount),
    byDistrict: Array.from(byDistrict.entries())
      .map(([label, count]) => ({ label, count }))
      .sort(sortByCount),
  }
})

const geographicTab = ref<'country' | 'city' | 'district'>('city')
const leftStatsRef = ref<HTMLElement | null>(null)
const leftStatsHeight = ref<number>(0)

const updateLeftStatsHeight = () => {
  if (!leftStatsRef.value) return
  leftStatsHeight.value = leftStatsRef.value.offsetHeight
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => net.value?.certificateTemplate?.id,
  (id) => {
    if (id) fetchCertificatePreview()
    else certificatePreview.value = null
  },
  { immediate: true }
)

let shareReportEventSource: EventSource | null = null

function connectShareReportSSE() {
  if (shareReportEventSource) return
  const url = `${API_BASE}/net/report/share/sse`
  const es = new EventSource(url)
  es.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as { token?: string }
      if (data?.token && shareDialogOpen.value && shareToken.value === data.token) {
        toast.success(t('netDetail.shareLinkOpened'))
        shareDialogOpen.value = false
      }
    } catch {
      // ignore parse errors
    }
  }
  es.onerror = () => {
    es.close()
    shareReportEventSource = null
  }
  shareReportEventSource = es
}

function closeShareReportSSE() {
  shareReportEventSource?.close()
  shareReportEventSource = null
}

watch(shareDialogOpen, (open) => {
  if (open) connectShareReportSSE()
  else closeShareReportSSE()
})

onMounted(() => {
  Promise.all([fetchNet(), fetchAttendees()]).then(async () => {
    if (net.value && netStatus.value === 'completed') {
      await fetchComparePrevious()
      nextTick(() => {
        updateLeftStatsHeight()
        if (leftStatsRef.value && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => updateLeftStatsHeight())
          resizeObserver.observe(leftStatsRef.value)
        }
      })
    }
  })
})

onUnmounted(() => {
  shareReportEventSource?.close()
  shareReportEventSource = null
  if (resizeObserver && leftStatsRef.value) {
    resizeObserver.disconnect()
  }
  if (clusterGroupInstance && leafletMapInstance.value) {
    leafletMapInstance.value.removeLayer(clusterGroupInstance)
    clusterGroupInstance = null
  }
})

const maxGeoCount = computed(() => {
  const d = geographicDistribution.value
  const list =
    geographicTab.value === 'country'
      ? d.byCountry
      : geographicTab.value === 'city'
        ? d.byCity
        : d.byDistrict
  return list.length ? Math.max(...list.map((x) => x.count)) : 1
})

const netDurationFormatted = computed(() => {
  const n = net.value
  if (!n) return '-'
  const total = n.totalDurationMinutes ?? 0
  const isActive = n.startedAt != null && n.endedAt == null
  const minutes = isActive && n.startedAt
    ? total + Math.round((Date.now() - new Date(n.startedAt).getTime()) / 60000)
    : total
  if (minutes <= 0) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours} ${t('netDetail.durationHours')} ${mins} ${t('netDetail.durationMinutesShort')}`
  return `${mins} ${t('netDetail.durationMinutesShort')}`
})

const canManageNet = computed(() => {
  if (!net.value) return false
  const branchId = net.value.branchId ?? net.value.branch?.id
  if (!branchId) return false
  if (auth.canLeadBranch(branchId)) return true
  if (net.value.operator.user?.id === auth.user?.id) return true
  return false
})

/** Çevrim silme: süper admin veya ilgili şubede şube yöneticisi/başkan (çevrim operatörü tek başına yetmez). */
const canDeleteNet = computed(() => {
  if (!net.value) return false
  const branchId = net.value.branchId ?? net.value.branch?.id
  if (!branchId) return false
  return auth.canLeadBranch(branchId)
})

watch(netStatus, (status) => {
  if (status === 'active') {
    showAddAttendeeForm.value = true
  } else if (status === 'completed') {
    showAddAttendeeForm.value = false
  }
})

const myAttendee = computed(() => {
  const opId = auth.user?.operator?.id
  if (!opId || !attendees.value.length) return null
  return attendees.value.find((a) => a.operatorId === opId) ?? null
})

const showDownloadMyCertificate = computed(
  () =>
    !!net.value?.certificateTemplate &&
    netStatus.value === 'completed' &&
    !!myAttendee.value
)

const fetchNet = async () => {
  try {
    const data = await api.get<Net>(`/net/${route.params.id}`)
    net.value = data
    if (data.certificateTemplate && data.endedAt) {
      try {
        const r = await api.get<{ canDownloadOthers: boolean }>(
          `/net/${route.params.id}/certificate/can-download-others`
        )
        canDownloadOthersCertificates.value = r.canDownloadOthers
      } catch {
        canDownloadOthersCertificates.value = false
      }
    } else {
      canDownloadOthersCertificates.value = false
    }
  } catch (error) {
    router.push('/nets')
  } finally {
    isLoading.value = false
  }
}

interface AttendeeResponse {
  id: string
  callSign: string
  name?: string
  country?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
  createdAt: string
  operator?: {
    id?: string
    user?: {
      picture?: string
    }
  }
}

const fetchAttendees = async () => {
  isLoadingAttendees.value = true
  try {
    const data = await api.get<AttendeeResponse[]>(`/net/${route.params.id}/attendee`)
    attendees.value = data.map(a => ({
      ...a,
      picture: a.operator?.user?.picture || null,
      operatorId: a.operator?.id
    }))
  } catch (error) {
    attendees.value = []
  } finally {
    isLoadingAttendees.value = false
  }
}

const startNet = async (withOperator: boolean) => {
  try {
    await api.patch(`/net/${route.params.id}/start`, {
      addOperatorAsAttendee: withOperator
    })
    await fetchNet()
    await fetchAttendees()
    toast.success(t('netDetail.netStarted'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const endNet = async () => {
  try {
    await api.patch(`/net/${route.params.id}/end`)
    await fetchNet()
    await fetchComparePrevious()
    toast.success(t('netDetail.netEnded'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const openEditNet = () => {
  isEditNetSheetOpen.value = true
}

const handleNetUpdated = async () => {
  await fetchNet()
  isEditNetSheetOpen.value = false
}

const openEditAttendee = (attendee: Attendee) => {
  editingAttendee.value = attendee
  isEditSheetOpen.value = true
}

const handleAttendeeUpdated = async () => {
  await fetchAttendees()
  isEditSheetOpen.value = false
  editingAttendee.value = null
}

const deleteAttendee = async (attendee: Attendee) => {
  if (!confirm(t('netDetail.confirmDelete', { callSign: attendee.callSign }))) return

  try {
    await api.delete(`/net/${route.params.id}/attendee/${attendee.id}`)
    await fetchAttendees()
    if (net.value) net.value.attendeeCount = attendees.value.length
    toast.success(t('netDetail.attendeeDeleted'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const handleAttendeeAdded = async () => {
  await fetchAttendees()
  if (net.value) net.value.attendeeCount = attendees.value.length
  if (netStatus.value === 'completed') {
    showAddAttendeeForm.value = false
  }
}

const certificatePreviewImageUrl = computed(() => {
  const path = certificatePreview.value?.imagePath ?? net.value?.certificateTemplate?.imagePath
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')
  return `${base}${path}`
})

const fetchCertificatePreview = async () => {
  if (!net.value?.certificateTemplate?.id || !route.params.id) {
    certificatePreview.value = null
    return
  }
  isLoadingCertificatePreview.value = true
  try {
    const data = await api.get<CertificatePreview | null>(`/net/${route.params.id}/certificate/preview`)
    certificatePreview.value = data
  } catch {
    certificatePreview.value = null
  } finally {
    isLoadingCertificatePreview.value = false
  }
}

const getNetDateInfo = () => {
  if (!net.value) return ''
  const { startedAt, endedAt } = net.value
  if (!startedAt) return '-'
  if (!endedAt) return formatDateTime(startedAt)
  const startDate = startedAt.split('T')[0]
  const endDate = endedAt.split('T')[0]
  if (startDate === endDate) return `${formatDateTime(startedAt)} - ${formatTime(endedAt)}`
  return `${formatDateTime(startedAt)} - ${formatDateTime(endedAt)}`
}

const formatReadabilitySignal = (a: Attendee) => {
  const r = a.readability
  const s = a.signalStrength
  if (r == null && s == null) return ''
  return `${r ?? '-'}/${s ?? '-'}`
}

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportCertificates = async () => {
  if (!net.value || isExporting.value) return
  isExporting.value = true
  try {
    const res = await fetch(`${API_BASE}/net/${route.params.id}/certificate/download-all`, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'error.serverError')
    }
    const blob = await res.blob()
    const name = (net.value.name || 'net').replace(/[/\\?%*:|"<>]/g, '-')
    downloadBlob(blob, `${name}-certificates.zip`)
    toast.success(t('certificates.downloadAllSuccess'))
  } catch (e: unknown) {
    const msg = (e instanceof Error ? e.message : null) || 'error.serverError'
    toast.error(translateError(msg))
  } finally {
    isExporting.value = false
  }
}

const downloadCertificate = async (attendee: Attendee) => {
  if (!net.value) return
  try {
    const res = await fetch(`${API_BASE}/net/${route.params.id}/certificate/${attendee.id}`, { credentials: 'include' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'error.serverError')
    }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition')
    const filename =
      getFilenameFromContentDisposition(cd) ??
      `${(attendee.callSign || attendee.id).replace(/[/\\?%*:|"<>]/g, '-')}-certificate.pdf`
    downloadBlob(blob, filename)
    toast.success(t('certificates.downloadSuccess'))
  } catch (e: unknown) {
    const msg = (e instanceof Error ? e.message : null) || 'error.serverError'
    toast.error(translateError(msg))
  }
}

const exportToCsv = async () => {
  if (!net.value) return
  try {
    const sorted = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    const headers = ['#', t('operators.callSign'), t('operators.name'), t('operators.qth'), t('operators.signal'), t('netReport.joinTime')].join(',')
    const rows = sorted.map((a, i) => {
      const qth = [a.district, a.city].filter(Boolean).join(', ') || '-'
      const fields = [i + 1, a.callSign || '', (a.name || '').replace(/"/g, '""'), qth.replace(/"/g, '""'), formatReadabilitySignal(a), formatDateTime(a.createdAt).replace(/"/g, '""')]
      return fields.map(f => {
        const str = String(f)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str}"`
        return str
      }).join(',')
    })
    const blob = new Blob(['\ufeff' + [headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(t('netReport.exportSuccess'))
  } catch {
    toast.error(t('error.serverError'))
  }
}

const escapeHtml = (s: string) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const prepareReportCanvas = async (): Promise<HTMLCanvasElement | null> => {
  if (!net.value) return null
  const sorted = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
  exportAttendees.value = sorted
  await nextTick()
  await new Promise(r => requestAnimationFrame(r))
  return captureReportCanvas()
}

const captureReportCanvas = async (): Promise<HTMLCanvasElement | null> => {
  const templateEl = exportTemplateRef.value?.templateRef ?? null
  if (!templateEl || !net.value) return null
  const origLeft = templateEl.style.left
  const origTop = templateEl.style.top
  const origZIndex = templateEl.style.zIndex
  templateEl.style.left = '0'
  templateEl.style.top = '0'
  templateEl.style.zIndex = '-1'
  try {
    await nextTick()
    await new Promise(r => requestAnimationFrame(r))
    const canvas = await html2canvas(templateEl, {
      backgroundColor: '#ffffff',
      onclone(clonedDoc, clonedNode) {
        const head = clonedDoc.querySelector('head')
        if (head) {
          head.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove())
          const style = clonedDoc.createElement('style')
          style.textContent = getReportExportStyles(REPORT_EXPORT_WIDTH)
          head.appendChild(style)
        }
        clonedNode.style.width = `${REPORT_EXPORT_WIDTH}px`
        clonedNode.style.minWidth = `${REPORT_EXPORT_WIDTH}px`
      }
    })
    return canvas
  } finally {
    templateEl.style.left = origLeft
    templateEl.style.top = origTop
    templateEl.style.zIndex = origZIndex
  }
}

const exportToPng = async () => {
  if (!net.value || isExporting.value) return
  isExporting.value = true
  try {
    const canvas = await prepareReportCanvas()
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}.png`
      link.click()
      toast.success(t('netReport.exportSuccess'))
    } else {
      toast.error(t('error.serverError'))
    }
  } catch {
    toast.error(t('error.serverError'))
  } finally {
    isExporting.value = false
  }
}

const openShareFlow = async () => {
  if (!net.value || isSharing.value || isExporting.value) return
  isSharing.value = true
  try {
    const data = await api.post<{ token: string }>(`/net/${route.params.id}/report/share`)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}/share-report/${data.token}`
    shareToken.value = data.token
    shareUrl.value = url
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
    if (isDesktop) {
      shareQrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 1 })
      shareDialogOpen.value = true
    } else {
      window.location.href = url
    }
  } catch (e: unknown) {
    if ((e as Error)?.name === 'AbortError') {
      return
    }
    const msg = (e as { message?: string })?.message ?? (e instanceof Error ? e.message : null) ?? 'error.serverError'
    toast.error(translateError(msg))
  } finally {
    isSharing.value = false
  }
}

const exportToPdf = async () => {
  if (!net.value || isExporting.value) return
  isExporting.value = true
  try {
    const canvas = await prepareReportCanvas()
    if (!canvas) {
      toast.error(t('error.serverError'))
      return
    }
    const img = canvas.toDataURL('image/png')
    const win = window.open('', '_blank')
    if (win) {
      const title = escapeHtml(net.value.name)
      win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{margin:0;padding:24px;display:flex;justify-content:center;background:#fff}</style></head><body><img src="${img}" style="width:${REPORT_EXPORT_WIDTH}px;max-width:100%;display:block;" /></body></html>`)
      win.document.close()
      win.focus()
    } else {
      toast.error(t('error.serverError'))
    }
  } catch {
    toast.error(t('error.serverError'))
  } finally {
    isExporting.value = false
  }
}

interface NetComparePrevious {
  previousAttendeeCount: number
  previousDurationMinutes: number
  deltaAttendeeCount: number
  deltaDurationMinutes: number
  previousEndedAt: string
}

const comparePrevious = ref<NetComparePrevious | null>(null)
const isLoadingCompare = ref(false)

const showDeleteNetDialog = ref(false)
const isDeletingNet = ref(false)

const confirmDeleteNet = async () => {
  if (!net.value || isDeletingNet.value) return
  isDeletingNet.value = true
  try {
    await api.delete(`/net/${net.value.id}`)
    toast.success(t('netDetail.deleteNetSuccess'))
    showDeleteNetDialog.value = false
    router.push('/nets')
  } catch (error: unknown) {
    const err = error as { message?: string }
    toast.error(translateError(err.message || 'error.serverError'))
  } finally {
    isDeletingNet.value = false
  }
}

const fetchComparePrevious = async () => {
  if (!net.value?.id || !isCompleted.value) return
  try {
    isLoadingCompare.value = true
    const data = await api.get<NetComparePrevious | null>(
      `/insights/net/${net.value.id}/compare-previous`
    )
    comparePrevious.value = data ?? null
  } catch {
    comparePrevious.value = null
  } finally {
    isLoadingCompare.value = false
  }
}
</script>

<template>
  <AppLayout :title="t('nav.nets')" :breadcrumb-label="net?.name ?? '...'">
    <div v-if="isLoading" class="space-y-4">
      <div class="h-8 w-64 bg-muted rounded animate-pulse" />
      <div class="h-4 w-48 bg-muted rounded animate-pulse" />
    </div>

    <div v-else-if="net" class="space-y-6">
      <NetHeader :net="net" :can-manage="canManageNet" :can-delete="canDeleteNet"
        :is-admin="canManageNet" :attendees-count="attendees.length" :is-exporting="isExporting"
        @start="startNet" @end="endNet" @edit="openEditNet" @delete="showDeleteNetDialog = true"
        @export-csv="exportToCsv" @export-pdf="exportToPdf"
        @export-png="exportToPng" @export-certificates="exportCertificates" @share-report="openShareFlow">
        <template v-if="net?.certificateTemplate && (certificatePreviewImageUrl || isLoadingCertificatePreview)"
          #certificate>
          <div class="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
            <div v-if="isLoadingCertificatePreview" class="aspect-[4/3] max-h-32 flex items-center justify-center">
              <span class="text-xs text-muted-foreground">{{ t('common.loading') }}</span>
            </div>
            <img v-else-if="certificatePreviewImageUrl" :src="certificatePreviewImageUrl"
              :alt="t('certificates.template')" class="w-full aspect-[4/3] object-contain max-h-32" />
          </div>
        </template>
      </NetHeader>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch lg:grid-rows-1">
        <section v-if="isCompleted" class="rounded-lg border border-border/50 bg-background p-4 w-full min-w-0">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <TrendingUp class="h-4 w-4" />
            {{ t('netDetail.statsTitle') }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:items-start">
            <!-- Sol sütun: toplam katılımcı, süre, trend (desktop) / mobilde aynı sıra alt alta -->
            <div ref="leftStatsRef" class="flex flex-col gap-3">
              <div class="p-4 rounded-lg border border-border/50 text-center shrink-0">
                <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
                  <Users class="h-5 w-5 text-muted-foreground" />
                  {{ attendees.length }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ t('netReport.totalAttendees') }}</p>
              </div>
              <div class="p-4 rounded-lg border border-border/50 text-center shrink-0">
                <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
                  <Clock class="h-5 w-5 text-muted-foreground" />
                  {{ netDurationFormatted }}
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ t('netDetail.duration') }}</p>
              </div>
              <div v-if="comparePrevious !== null && !isLoadingCompare"
                class="p-4 rounded-lg border border-border/50 text-center shrink-0">
                <div class="flex items-center justify-center gap-1.5 text-xl font-bold flex-wrap">
                  <TrendingUp class="h-5 w-5 text-muted-foreground shrink-0" />
                  <span v-if="comparePrevious.deltaAttendeeCount > 0" class="text-green-600 dark:text-green-400">+{{
                    comparePrevious.deltaAttendeeCount }}</span>
                  <span v-else-if="comparePrevious.deltaAttendeeCount < 0" class="text-red-600 dark:text-red-400">{{
                    comparePrevious.deltaAttendeeCount }}</span>
                  <span v-else class="text-muted-foreground">0</span>
                  <span class="text-muted-foreground font-normal">{{ t('netDetail.trendAttendees') }}</span>
                  <span class="text-muted-foreground">·</span>
                  <span v-if="comparePrevious.deltaDurationMinutes > 0" class="text-green-600 dark:text-green-400">+{{
                    comparePrevious.deltaDurationMinutes }}</span>
                  <span v-else-if="comparePrevious.deltaDurationMinutes < 0" class="text-red-600 dark:text-red-400">{{
                    comparePrevious.deltaDurationMinutes }}</span>
                  <span v-else class="text-muted-foreground">0</span>
                  <span class="text-muted-foreground font-normal">{{ t('netDetail.durationMinutesShort') }}</span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">{{ t('netDetail.trendVsPrevious') }}</p>
              </div>
              <div v-else-if="isLoadingCompare" class="p-4 rounded-lg border border-border/50 text-center shrink-0">
                <div class="h-8 bg-muted animate-pulse rounded mx-auto w-24" />
                <p class="text-xs text-muted-foreground mt-1">{{ t('netDetail.trendVsPrevious') }}</p>
              </div>
            </div>
            <!-- Sağ sütun: coğrafi dağılım, desktop'ta soldaki üç kutunun yüksekliği ile sınırlı, kendi içinde scroll -->
            <div class="min-h-0 flex flex-col lg:overflow-hidden"
              :style="leftStatsHeight ? { '--left-stats-height': leftStatsHeight + 'px' } as Record<string, string> : undefined"
              :class="leftStatsHeight ? 'sm:max-h-[var(--left-stats-height)] sm:h-[var(--left-stats-height)]' : ''">
              <div class="p-4 rounded-lg border border-border/50 flex-1 min-h-0 flex flex-col overflow-hidden">
                <p class="text-xs text-muted-foreground flex items-center gap-2 mb-2 shrink-0">
                  <MapPin class="h-4 w-4" />
                  {{ t('netDetail.geographicSpread') }}
                </p>
                <div class="flex gap-1 mb-2 shrink-0">
                  <button type="button" class="px-2 py-1 text-xs rounded-md border transition-colors"
                    :class="geographicTab === 'country' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
                    @click="geographicTab = 'country'">
                    {{ t('dashboard.stats.countries') }}
                  </button>
                  <button type="button" class="px-2 py-1 text-xs rounded-md border transition-colors"
                    :class="geographicTab === 'city' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
                    @click="geographicTab = 'city'">
                    {{ t('dashboard.stats.cities') }}
                  </button>
                  <button type="button" class="px-2 py-1 text-xs rounded-md border transition-colors"
                    :class="geographicTab === 'district' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
                    @click="geographicTab = 'district'">
                    {{ t('dashboard.stats.districts') }}
                  </button>
                </div>
                <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                  <template v-if="geographicTab === 'country'">
                    <div v-for="(item, i) in geographicDistribution.byCountry" :key="item.label"
                      class="flex items-center gap-2">
                      <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between gap-2">
                          <span class="font-medium truncate text-sm">{{ item.label }}</span>
                          <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                        </div>
                        <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                          <div class="h-full rounded-full bg-primary/30"
                            :style="{ width: `${(item.count / maxGeoCount) * 100}%` }" />
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else-if="geographicTab === 'city'">
                    <div v-for="(item, i) in geographicDistribution.byCity" :key="item.label"
                      class="flex items-center gap-2">
                      <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between gap-2">
                          <span class="font-medium truncate text-sm">{{ item.label }}</span>
                          <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                        </div>
                        <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                          <div class="h-full rounded-full bg-primary/30"
                            :style="{ width: `${(item.count / maxGeoCount) * 100}%` }" />
                        </div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-for="(item, i) in geographicDistribution.byDistrict" :key="item.label"
                      class="flex items-center gap-2">
                      <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between gap-2">
                          <span class="font-medium truncate text-sm">{{ item.label }}</span>
                          <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                        </div>
                        <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                          <div class="h-full rounded-full bg-primary/30"
                            :style="{ width: `${(item.count / maxGeoCount) * 100}%` }" />
                        </div>
                      </div>
                    </div>
                  </template>
                  <p v-if="(geographicTab === 'country' ? geographicDistribution.byCountry : geographicTab === 'city' ? geographicDistribution.byCity : geographicDistribution.byDistrict).length === 0"
                    class="text-xs text-muted-foreground py-2">
                    {{ t('dashboard.noStats') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="showMapSection"
          class="rounded-lg border border-border/50 bg-background p-4 w-full min-w-0 flex flex-col">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
            <MapPin class="h-4 w-4" />
            {{ t('netDetail.participantsMap') }}
          </h3>
          <p class="text-xs text-muted-foreground mb-4">
            {{ t('netDetail.participantsMapDesc') }}
          </p>
          <div class="rounded-lg overflow-hidden border border-border/50 flex-1 min-h-[280px] lg:min-h-0 bg-muted/30">
            <div v-if="mapLoading"
              class="h-full min-h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              {{ t('netDetail.mapLoading') }}
            </div>
            <template v-else-if="attendeePoints.length === 0">
              <div class="h-full min-h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                {{ t('netDetail.mapNoLocations') }}
              </div>
            </template>
            <LMap v-else ref="mapRef" :use-global-leaflet="true" :center="MAP_DEFAULT_CENTER" :zoom="MAP_DEFAULT_ZOOM"
              class="h-full w-full rounded-lg min-h-[280px] lg:min-h-0" :options="{ zoomControl: true }"
              @ready="onMapReady">
              <LTileLayer :url="tileLayerUrl" :attribution="tileLayerAttribution" />
            </LMap>
          </div>
        </section>
      </div>

      <Separator class="my-8" />

      <div v-if="netStatus !== 'pending' && netStatus !== 'cancelled'" class="border-t border-border/50 pt-6">
        <div class="mb-4">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Users class="h-5 w-5" />
            {{ t('netDetail.attendees') }}
            <span class="text-muted-foreground font-normal">({{ attendees.length }})</span>
          </h2>
        </div>

        <AddAttendeePanel v-if="canManageNet && (netStatus === 'active' || (netStatus === 'completed' && showAddAttendeeForm))" :net-id="(route.params.id as string)"
          :attendees="attendees" :priority-branch-id="net?.branch?.id" @attendee-added="handleAttendeeAdded" />

        <AttendeeList :attendees="attendees" :is-loading="isLoadingAttendees" :can-manage="canManageNet"
          :show-certificate-download="!!(net?.certificateTemplate && netStatus === 'completed')"
          :can-download-others-certificates="canDownloadOthersCertificates"
          :current-user-operator-id="auth.user?.operator?.id" @edit="openEditAttendee" @delete="deleteAttendee"
          @download-certificate="downloadCertificate"
        >
          <template #actions>
            <div v-if="canManageNet && netStatus === 'completed' && !showAddAttendeeForm" class="w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                class="w-full gap-2 justify-center sm:w-auto"
                @click="showAddAttendeeForm = true"
              >
                <Plus class="h-4 w-4" />
                {{ t('netDetail.addAttendee') }}
              </Button>
            </div>

            <div v-if="showDownloadMyCertificate && myAttendee" class="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                class="w-full gap-2 justify-center sm:w-auto"
                @click="downloadCertificate(myAttendee)"
              >
                <Award class="h-4 w-4" />
                {{ t('netDetail.downloadMyCertificate') }}
              </Button>
            </div>

            <template v-if="attendees.length > 0">
              <div class="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
                <Button
                  variant="outline"
                  size="sm"
                  class="w-full gap-2 justify-center"
                  :disabled="isExporting"
                  @click="exportToCsv"
                  :title="t('netDetail.exportCsvTooltip')"
                  :aria-label="t('netDetail.exportCsvTooltip')"
                >
                  <FileSpreadsheet class="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="w-full gap-2 justify-center"
                  :disabled="isExporting"
                  @click="exportToPdf"
                  :title="t('netDetail.exportPdfTooltip')"
                  :aria-label="t('netDetail.exportPdfTooltip')"
                >
                  <Printer class="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="w-full gap-2 justify-center"
                  :disabled="isExporting"
                  @click="exportToPng"
                  :title="t('netDetail.exportPngTooltip')"
                  :aria-label="t('netDetail.exportPngTooltip')"
                >
                  <Image class="h-4 w-4" />
                  PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="w-full gap-2 justify-center"
                  :disabled="isSharing || isExporting"
                  @click="openShareFlow"
                  :title="t('netDetail.shareReportAsPng')"
                  :aria-label="t('netDetail.shareReportAsPng')"
                >
                  <Share2 class="h-4 w-4" />
                  {{ t('netDetail.share') }}
                </Button>
              </div>

              <template v-if="net?.certificateTemplate && netStatus === 'completed'">
                <div class="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    class="w-full gap-2 justify-center sm:w-auto"
                    :disabled="isExporting"
                    @click="exportCertificates"
                    :title="t('certificates.downloadAll')"
                    :aria-label="t('certificates.downloadAll')"
                  >
                    <Award class="h-4 w-4" />
                    {{ t('certificates.downloadAll') }}
                  </Button>
                </div>
              </template>
            </template>
          </template>
        </AttendeeList>
      </div>
    </div>

    <EditAttendeeSheet v-if="editingAttendee" :open="isEditSheetOpen" :attendee="editingAttendee"
      :net-id="(route.params.id as string)" @update:open="isEditSheetOpen = $event" @updated="handleAttendeeUpdated" />

    <EditNetSheet v-if="net" :open="isEditNetSheetOpen" :net="net as any" @update:open="isEditNetSheetOpen = $event"
      @updated="handleNetUpdated" />

    <ExportReportTemplate v-if="net" ref="exportTemplateRef" :net-name="net.name"
      :operator-call-sign="net.operator.callSign" :operator-name="net.operator.fullName"
      :attendees="exportAttendees" :date-info="getNetDateInfo()" :branch-name="net.branch?.name"
      :branch-call-sign="net.branchCallSign?.callSign" :branch-is-headquarters="net.branch?.isHeadquarters"
      :communication-channels="net.communicationChannels" />

    <Dialog v-model:open="showDeleteNetDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('netDetail.deleteNet') }}</DialogTitle>
          <DialogDescription>
            {{ t('netDetail.deleteNetConfirm', { name: net?.name ?? '' }) }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" :disabled="isDeletingNet" @click="showDeleteNetDialog = false">
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            class="trac-btn-destructive-outlined"
            :disabled="isDeletingNet"
            @click="confirmDeleteNet"
          >
            <Trash2 v-if="!isDeletingNet" class="h-4 w-4 mr-2" />
            {{ isDeletingNet ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </AppLayout>
  <ShareReportSheet :open="shareDialogOpen" :share-url="shareUrl" :share-qr-data-url="shareQrDataUrl"
    @update:open="shareDialogOpen = $event" />
</template>
