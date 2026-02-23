<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables'
import { Button } from '@/components/ui/button'
import { Share2, Download } from 'lucide-vue-next'
import ExportReportTemplate from '@/components/nets/ExportReportTemplate.vue'
import { getReportExportStyles, REPORT_EXPORT_WIDTH } from '@/lib/reportExportStyles'
import html2canvas from 'html2canvas'

const route = useRoute()
const { t } = useI18n()
const { formatDateTime, formatTime } = useDateFormat()

const API_BASE = import.meta.env.VITE_API_URL || ''

const status = ref<'loading' | 'building' | 'ready' | 'error'>('loading')
const imageUrl = ref<string | null>(null)
const blob = ref<Blob | null>(null)
const reportData = ref<{
  net: {
    name: string
    operator: { callSign: string }
    branch?: { name: string; isHeadquarters?: boolean }
    branchCallSign?: { callSign: string } | null
    communicationChannels?: Array<{
      id: string
      communicationChannel?: { id: string; name?: string; type?: string }
      isSimplexAdHoc?: boolean
      simplexFrequency?: string
    }>
    startedAt?: string
    endedAt?: string
  }
  attendees: Array<{
    id: string
    callSign: string
    name?: string | null
    city?: string | null
    district?: string | null
    readability?: number | null
    signalStrength?: number | null
    createdAt: string
  }>
} | null>(null)
const exportTemplateRef = ref<InstanceType<typeof ExportReportTemplate> | null>(null)

function getNetDateInfo(net: { startedAt?: string; endedAt?: string }): string {
  const { startedAt, endedAt } = net
  if (!startedAt) return '-'
  if (!endedAt) return formatDateTime(startedAt)
  const startDate = startedAt.split('T')[0]
  const endDate = endedAt.split('T')[0]
  if (startDate === endDate) return `${formatDateTime(startedAt)} - ${formatTime(endedAt)}`
  return `${formatDateTime(startedAt)} - ${formatDateTime(endedAt)}`
}

const dateInfo = computed(() =>
  reportData.value ? getNetDateInfo(reportData.value.net) : '',
)

function downloadBlob() {
  if (!blob.value) return
  const url = URL.createObjectURL(blob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = 'report.png'
  a.click()
  URL.revokeObjectURL(url)
}

async function shareBlob() {
  if (!blob.value) return
  const file = new File([blob.value], 'report.png', { type: 'image/png' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (_) {}
  } else {
    downloadBlob()
  }
}

async function buildPngBlob(): Promise<Blob | null> {
  const templateEl = exportTemplateRef.value?.templateRef ?? null
  if (!templateEl || !reportData.value) return null
  const origLeft = templateEl.style.left
  const origTop = templateEl.style.top
  const origZIndex = templateEl.style.zIndex
  templateEl.style.left = '0'
  templateEl.style.top = '0'
  templateEl.style.zIndex = '-1'
  try {
    await nextTick()
    await new Promise((r) => requestAnimationFrame(r))
    const canvas = await html2canvas(templateEl, {
      backgroundColor: '#ffffff',
      onclone(clonedDoc, clonedNode) {
        const head = clonedDoc.querySelector('head')
        if (head) {
          head.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => el.remove())
          const style = clonedDoc.createElement('style')
          style.textContent = getReportExportStyles(REPORT_EXPORT_WIDTH)
          head.appendChild(style)
        }
        ;(clonedNode as HTMLElement).style.width = `${REPORT_EXPORT_WIDTH}px`
        ;(clonedNode as HTMLElement).style.minWidth = `${REPORT_EXPORT_WIDTH}px`
      },
    })
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? null), 'image/png', 1)
    })
  } finally {
    templateEl.style.left = origLeft
    templateEl.style.top = origTop
    templateEl.style.zIndex = origZIndex
  }
}

onMounted(async () => {
  const token = route.params.token as string
  if (!token) {
    status.value = 'error'
    return
  }
  try {
    const res = await fetch(`${API_BASE}/net/report/share/${token}`)
    if (!res.ok) {
      status.value = 'error'
      return
    }
    const data = (await res.json()) as typeof reportData.value
    reportData.value = data
    status.value = 'building'
    await nextTick()
    const pngBlob = await buildPngBlob()
    if (!pngBlob) {
      status.value = 'error'
      return
    }
    blob.value = pngBlob
    imageUrl.value = URL.createObjectURL(pngBlob)
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
    <p v-if="status === 'loading'" class="text-sm font-medium text-muted-foreground">
      {{ t('netDetail.shareReportLoading') }}
    </p>
    <p v-else-if="status === 'building'" class="text-sm font-medium text-muted-foreground">
      {{ t('netDetail.shareReportOpening') }}
    </p>
    <p v-else-if="status === 'error'" class="text-sm font-medium text-muted-foreground">
      {{ t('netDetail.shareReportInvalidLink') }}
    </p>
    <div
      v-else-if="status === 'ready' && imageUrl"
      class="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      <img
        :src="imageUrl"
        alt=""
        class="absolute inset-0 w-full h-full object-cover object-center blur-[2px] opacity-95"
        aria-hidden="true"
      />
      <div class="relative z-10 flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          class="gap-2 bg-background"
          @click="shareBlob"
        >
          <Share2 class="h-4 w-4" />
          {{ t('netDetail.share') }}
        </Button>
        <Button
          variant="outline"
          size="lg"
          class="gap-2 bg-background"
          @click="downloadBlob"
        >
          <Download class="h-4 w-4" />
          {{ t('netDetail.shareReportDownload') }}
        </Button>
      </div>
    </div>

    <ExportReportTemplate
      v-if="reportData"
      ref="exportTemplateRef"
      :net-name="reportData.net.name"
      :operator-call-sign="reportData.net.operator.callSign"
      :attendees="reportData.attendees"
      :date-info="dateInfo"
      :branch-name="reportData.net.branch?.name"
      :branch-call-sign="reportData.net.branchCallSign?.callSign"
      :branch-is-headquarters="reportData.net.branch?.isHeadquarters"
      :communication-channels="reportData.net.communicationChannels"
    />
  </div>
</template>
