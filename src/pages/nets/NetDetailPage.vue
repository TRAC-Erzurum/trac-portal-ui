<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  Clock,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { useDateFormat } from '@/composables'
import { getReportExportStyles, REPORT_EXPORT_WIDTH } from '@/lib/reportExportStyles'
import EditAttendeeSheet from '@/components/nets/EditAttendeeSheet.vue'
import EditNetSheet from '@/components/nets/EditNetSheet.vue'
import ExportReportTemplate from '@/components/nets/ExportReportTemplate.vue'
import NetHeader from '@/components/nets/NetHeader.vue'
import AddAttendeePanel from '@/components/nets/AddAttendeePanel.vue'
import AttendeeList from '@/components/nets/AttendeeList.vue'
import html2canvas from 'html2canvas'

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
  attendeeCount: number
  operator: Operator
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
  communicationChannels?: NetCommunicationChannel[]
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

const editingAttendee = ref<Attendee | null>(null)
const isEditSheetOpen = ref(false)
const isEditNetSheetOpen = ref(false)

const exportTemplateRef = ref<InstanceType<typeof ExportReportTemplate> | null>(null)
const exportAttendees = ref<Attendee[]>([])
const isExporting = ref(false)

const netStatus = computed(() => {
  if (net.value?.endedAt && !net.value?.startedAt) return 'cancelled'
  if (net.value?.endedAt) return 'completed'
  if (net.value?.startedAt) return 'active'
  return 'pending'
})

const isCompleted = computed(() => netStatus.value === 'completed')

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
  if (resizeObserver && leftStatsRef.value) {
    resizeObserver.disconnect()
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
  if (!n?.startedAt || !n?.endedAt) return '-'
  const start = new Date(n.startedAt)
  const end = new Date(n.endedAt)
  const diffMs = end.getTime() - start.getTime()
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} ${t('netDetail.durationHours')} ${minutes} ${t('netDetail.durationMinutesShort')}`
  return `${minutes} ${t('netDetail.durationMinutesShort')}`
})

const canManageNet = computed(() => {
  if (!net.value) return false
  if (auth.isAdmin || auth.isSuperAdmin) return true
  return net.value.operator.user?.id === auth.user?.id
})

const fetchNet = async () => {
  try {
    const data = await api.get<Net>(`/net/${route.params.id}`)
    net.value = data
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

const restartNet = async () => {
  try {
    await api.patch(`/net/${route.params.id}/restart`)
    await fetchNet()
    toast.success(t('netDetail.netRestarted'))
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
      onclone (clonedDoc, clonedNode) {
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
    const sorted = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    exportAttendees.value = sorted
    await nextTick()
    await new Promise(r => requestAnimationFrame(r))
    const canvas = await captureReportCanvas()
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

const exportToPdf = async () => {
  if (!net.value) return
  try {
    const sorted = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    const dateInfo = getNetDateInfo()
    const qth = (a: Attendee) => [a.district, a.city].filter(Boolean).join(', ') || '-'
    const rs = (a: Attendee) => {
      const r = a.readability; const s = a.signalStrength
      if (r == null && s == null) return ''
      return `${r ?? '-'}/${s ?? '-'}`
    }
    const rows = sorted.map((a, i) => `
      <tr>
        <td style="border:1px solid #d4d4d8;padding:6px 12px">${i + 1}</td>
        <td style="border:1px solid #d4d4d8;padding:6px 12px;font-weight:600">${escapeHtml(a.callSign)}</td>
        <td style="border:1px solid #d4d4d8;padding:6px 12px">${escapeHtml(a.name || '-')}</td>
        <td style="border:1px solid #d4d4d8;padding:6px 12px">${escapeHtml(qth(a))}</td>
        <td style="border:1px solid #d4d4d8;padding:6px 12px;text-align:center">${escapeHtml(rs(a))}</td>
        <td style="border:1px solid #d4d4d8;padding:6px 12px">${escapeHtml(formatDateTime(a.createdAt))}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(net.value.name)}</title>
<style>body{font-family:'Rajdhani',sans-serif;padding:2rem;color:#000;background:#fff}
table{border-collapse:collapse;width:100%;font-size:14px}
th{background:#f4f4f5;border:1px solid #d4d4d8;padding:6px 12px;text-align:left;font-weight:600}
tfoot td{background:#fafafa;border:1px solid #d4d4d8;padding:6px 12px}
h1{text-align:center;font-size:1.5rem;margin-bottom:2rem}</style></head><body>
<h1>${escapeHtml(net.value.name)}</h1>
<table>
<thead><tr>
<th>#</th><th>${escapeHtml(t('operators.callSign'))}</th><th>${escapeHtml(t('operators.name'))}</th>
<th>${escapeHtml(t('operators.qth'))}</th><th>${escapeHtml(t('operators.signal'))}</th><th>${escapeHtml(t('netReport.joinTime'))}</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot>
<tr><td colspan="5" style="text-align:right;font-weight:600">${escapeHtml(t('netReport.totalAttendees'))}:</td><td style="font-weight:600">${sorted.length}</td></tr>
<tr><td colspan="5" style="text-align:right;font-weight:600">${escapeHtml(t('netReport.operator'))}:</td><td>${escapeHtml(net.value.operator.callSign)}</td></tr>
<tr><td colspan="5" style="text-align:right;font-weight:600">${escapeHtml(t('netReport.date'))}:</td><td>${escapeHtml(dateInfo)}</td></tr>
</tfoot>
</table></body></html>`
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
      win.close()
    }
  } catch {
    toast.error(t('error.serverError'))
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

const fetchComparePrevious = async () => {
  if (!net.value?.id || !isCompleted.value) return
  try {
    isLoadingCompare.value = true
    const data = await api.get<NetComparePrevious | null>(
      `/dashboard/net/${net.value.id}/compare-previous`
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
      <NetHeader
        :net="net"
        :can-manage="canManageNet"
        :is-admin="auth.isAdmin || auth.isSuperAdmin"
        :attendees-count="attendees.length"
        :is-exporting="isExporting"
        @start="startNet"
        @end="endNet"
        @restart="restartNet"
        @edit="openEditNet"
        @export-csv="exportToCsv"
        @export-pdf="exportToPdf"
        @export-png="exportToPng"
      />

      <section
        v-if="isCompleted"
        class="rounded-lg border border-border/50 bg-background p-4"
      >
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <TrendingUp class="h-4 w-4" />
          {{ t('netDetail.statsTitle') }}
        </h3>
        <div class="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 lg:items-start">
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
            <div
              v-if="comparePrevious !== null && !isLoadingCompare"
              class="p-4 rounded-lg border border-border/50 text-center shrink-0"
            >
              <div class="flex items-center justify-center gap-1.5 text-xl font-bold flex-wrap">
                <TrendingUp class="h-5 w-5 text-muted-foreground shrink-0" />
                <span v-if="comparePrevious.deltaAttendeeCount > 0" class="text-green-600 dark:text-green-400">+{{ comparePrevious.deltaAttendeeCount }}</span>
                <span v-else-if="comparePrevious.deltaAttendeeCount < 0" class="text-red-600 dark:text-red-400">{{ comparePrevious.deltaAttendeeCount }}</span>
                <span v-else class="text-muted-foreground">0</span>
                <span class="text-muted-foreground font-normal">{{ t('netDetail.trendAttendees') }}</span>
                <span class="text-muted-foreground">·</span>
                <span v-if="comparePrevious.deltaDurationMinutes > 0" class="text-green-600 dark:text-green-400">+{{ comparePrevious.deltaDurationMinutes }}</span>
                <span v-else-if="comparePrevious.deltaDurationMinutes < 0" class="text-red-600 dark:text-red-400">{{ comparePrevious.deltaDurationMinutes }}</span>
                <span v-else class="text-muted-foreground">0</span>
                <span class="text-muted-foreground font-normal">{{ t('netDetail.durationMinutesShort') }}</span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('netDetail.trendVsPrevious') }}</p>
            </div>
            <div
              v-else-if="isLoadingCompare"
              class="p-4 rounded-lg border border-border/50 text-center shrink-0"
            >
              <div class="h-8 bg-muted animate-pulse rounded mx-auto w-24" />
              <p class="text-xs text-muted-foreground mt-1">{{ t('netDetail.trendVsPrevious') }}</p>
            </div>
          </div>
          <!-- Sağ sütun: coğrafi dağılım, desktop'ta soldaki üç kutunun yüksekliği ile sınırlı, kendi içinde scroll -->
          <div
            class="min-h-0 flex flex-col lg:overflow-hidden"
            :style="leftStatsHeight ? { '--left-stats-height': leftStatsHeight + 'px' } as Record<string, string> : undefined"
            :class="leftStatsHeight ? 'lg:max-h-[var(--left-stats-height)] lg:h-[var(--left-stats-height)]' : ''"
          >
            <div class="p-4 rounded-lg border border-border/50 flex-1 min-h-0 flex flex-col overflow-hidden">
              <p class="text-xs text-muted-foreground flex items-center gap-2 mb-2 shrink-0">
                <MapPin class="h-4 w-4" />
                {{ t('netDetail.geographicSpread') }}
              </p>
              <div class="flex gap-1 mb-2 shrink-0">
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border transition-colors"
                  :class="geographicTab === 'country' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'"
                  @click="geographicTab = 'country'"
                >
                  {{ t('dashboard.stats.countries') }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border transition-colors"
                  :class="geographicTab === 'city' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'"
                  @click="geographicTab = 'city'"
                >
                  {{ t('dashboard.stats.cities') }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs rounded-md border transition-colors"
                  :class="geographicTab === 'district' ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'"
                  @click="geographicTab = 'district'"
                >
                  {{ t('dashboard.stats.districts') }}
                </button>
              </div>
              <div class="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                <template v-if="geographicTab === 'country'">
                  <div
                    v-for="(item, i) in geographicDistribution.byCountry"
                    :key="item.label"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between gap-2">
                        <span class="font-medium truncate text-sm">{{ item.label }}</span>
                        <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                      </div>
                      <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-primary/30"
                          :style="{ width: `${(item.count / maxGeoCount) * 100}%` }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else-if="geographicTab === 'city'">
                  <div
                    v-for="(item, i) in geographicDistribution.byCity"
                    :key="item.label"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between gap-2">
                        <span class="font-medium truncate text-sm">{{ item.label }}</span>
                        <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                      </div>
                      <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-primary/30"
                          :style="{ width: `${(item.count / maxGeoCount) * 100}%` }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div
                    v-for="(item, i) in geographicDistribution.byDistrict"
                    :key="item.label"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between gap-2">
                        <span class="font-medium truncate text-sm">{{ item.label }}</span>
                        <span class="text-xs text-muted-foreground shrink-0">{{ item.count }}</span>
                      </div>
                      <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                        <div
                          class="h-full rounded-full bg-primary/30"
                          :style="{ width: `${(item.count / maxGeoCount) * 100}%` }"
                        />
                      </div>
                    </div>
                  </div>
                </template>
                <p v-if="(geographicTab === 'country' ? geographicDistribution.byCountry : geographicTab === 'city' ? geographicDistribution.byCity : geographicDistribution.byDistrict).length === 0" class="text-xs text-muted-foreground py-2">
                  {{ t('dashboard.noStats') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="netStatus !== 'pending' && netStatus !== 'cancelled'" class="border-t border-border/50 pt-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Users class="h-5 w-5" />
            {{ t('netDetail.attendees') }}
            <span class="text-muted-foreground font-normal">({{ attendees.length }})</span>
          </h2>
        </div>

        <AddAttendeePanel
          v-if="canManageNet && netStatus === 'active'"
          :net-id="(route.params.id as string)"
          :attendees="attendees"
          :priority-branch-id="net?.branch?.id"
          @attendee-added="handleAttendeeAdded"
        />

        <AttendeeList
          :attendees="attendees"
          :is-loading="isLoadingAttendees"
          :can-manage="canManageNet"
          :is-active="netStatus === 'active'"
          @edit="openEditAttendee"
          @delete="deleteAttendee"
        />
      </div>
    </div>

    <EditAttendeeSheet
      v-if="editingAttendee"
      :open="isEditSheetOpen"
      :attendee="editingAttendee"
      :net-id="(route.params.id as string)"
      @update:open="isEditSheetOpen = $event"
      @updated="handleAttendeeUpdated"
    />

    <EditNetSheet
      v-if="net"
      :open="isEditNetSheetOpen"
      :net="net as any"
      @update:open="isEditNetSheetOpen = $event"
      @updated="handleNetUpdated"
    />

    <ExportReportTemplate
      v-if="net"
      ref="exportTemplateRef"
      :net-name="net.name"
      :operator-call-sign="net.operator.callSign"
      :attendees="exportAttendees"
      :date-info="getNetDateInfo()"
      :branch-name="net.branch?.name"
      :branch-call-sign="net.branchCallSign?.callSign"
      :branch-is-headquarters="net.branch?.isHeadquarters"
      :communication-channels="net.communicationChannels"
    />
  </AppLayout>
</template>
