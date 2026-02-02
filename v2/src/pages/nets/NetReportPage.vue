<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Printer, Image, FileSpreadsheet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'vue-sonner'
import { formatDateTime } from '@/lib/formatters'

interface Operator {
  id: string
  callSign: string
  fullName?: string
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
}

interface Net {
  id: string
  name: string
  frequency: string
  mode: string
  startedAt?: string
  endedAt?: string
  operator: Operator
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const net = ref<Net | null>(null)
const attendees = ref<Attendee[]>([])
const isLoading = ref(true)
const reportRef = ref<HTMLElement | null>(null)

const fetchData = async () => {
  try {
    const [netData, attendeesData] = await Promise.all([
      api.get<Net>(`/net/${route.params.id}`),
      api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    ])
    net.value = netData
    attendees.value = attendeesData
  } catch (error) {
    toast.error(t('error.serverError'))
    router.push('/nets')
  } finally {
    isLoading.value = false
  }
}

const formatQth = (attendee: Attendee) => {
  return [attendee.district, attendee.city].filter(Boolean).join(', ') || '-'
}

const formatDate = (dateStr?: string) => {
  const loc = locale.value === 'tr' ? 'tr-TR' : 'en-US'
  return formatDateTime(dateStr, loc)
}

const formatTime = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const netDateInfo = computed(() => {
  if (!net.value) return ''
  const { startedAt, endedAt } = net.value
  if (!startedAt) return '-'
  
  if (!endedAt) return formatDate(startedAt)
  
  const startDate = startedAt.split('T')[0]
  const endDate = endedAt.split('T')[0]
  
  if (startDate === endDate) {
    return `${formatDate(startedAt)} - ${formatTime(endedAt)}`
  }
  
  return `${formatDate(startedAt)} - ${formatDate(endedAt)}`
})

const exportToPdf = () => {
  window.print()
}

const exportToImage = async () => {
  if (!reportRef.value || !net.value) return
  
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(reportRef.value, {
      backgroundColor: '#ffffff',
      scale: 2
    })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}.png`
    link.click()
    toast.success(t('netReport.exportSuccess'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const exportToCsv = () => {
  if (!net.value) return
  
  try {
    const headers = [
      '#',
      t('operators.callSign'),
      t('operators.name'),
      t('operators.qth'),
      t('operators.readability'),
      t('operators.signal'),
      t('netReport.joinTime')
    ].join(',')
    
    const rows = attendees.value.map((a, i) => {
      const fields = [
        i + 1,
        a.callSign || '',
        (a.name || '').replace(/"/g, '""'),
        formatQth(a).replace(/"/g, '""'),
        a.readability || '',
        a.signalStrength || '',
        formatDate(a.createdAt).replace(/"/g, '""')
      ]
      return fields.map(f => {
        const str = String(f)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str}"`
        }
        return str
      }).join(',')
    })
    
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(t('netReport.exportSuccess'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const goBack = () => {
  router.push(`/nets/${route.params.id}`)
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="min-h-screen bg-white print:bg-white">
    <div class="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
      <Button variant="outline" size="sm" @click="goBack" class="gap-2 bg-white">
        <ArrowLeft class="h-4 w-4" />
        {{ t('common.back') }}
      </Button>
      <Button variant="outline" size="sm" @click="exportToPdf" class="gap-2 bg-white">
        <Printer class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" @click="exportToImage" class="gap-2 bg-white">
        <Image class="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" @click="exportToCsv" class="gap-2 bg-white">
        <FileSpreadsheet class="h-4 w-4" />
      </Button>
    </div>

    <div v-if="isLoading" class="p-8 max-w-4xl mx-auto space-y-6">
      <div class="h-7 w-48 bg-muted rounded animate-pulse mx-auto" />
      <div class="space-y-2">
        <div class="h-10 w-full bg-muted rounded animate-pulse" />
        <div v-for="i in 8" :key="i" class="h-12 w-full bg-muted/50 rounded animate-pulse" />
      </div>
    </div>

    <div v-else-if="net" ref="reportRef" class="p-8 max-w-4xl mx-auto">
      <h1 class="text-xl font-bold text-center text-black mb-6">{{ net.name }}</h1>

      <div v-if="attendees.length === 0" class="text-center py-8 text-red-600 font-medium">
        {{ t('netReport.noAttendees') }}
      </div>

      <table v-else class="w-full border-collapse text-sm text-black">
        <thead>
          <tr class="bg-zinc-100">
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">#</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.callSign') }}</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.name') }}</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.qth') }}</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.readability') }}</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.signal') }}</th>
            <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('netReport.joinTime') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(attendee, index) in attendees" :key="attendee.id" class="hover:bg-zinc-50">
            <td class="border border-zinc-300 px-3 py-2">{{ index + 1 }}</td>
            <td class="border border-zinc-300 px-3 py-2 font-medium">{{ attendee.callSign }}</td>
            <td class="border border-zinc-300 px-3 py-2">{{ attendee.name || '-' }}</td>
            <td class="border border-zinc-300 px-3 py-2">{{ formatQth(attendee) }}</td>
            <td class="border border-zinc-300 px-3 py-2 text-center">{{ attendee.readability || '-' }}</td>
            <td class="border border-zinc-300 px-3 py-2 text-center">{{ attendee.signalStrength || '-' }}</td>
            <td class="border border-zinc-300 px-3 py-2">{{ formatDate(attendee.createdAt) }}</td>
          </tr>
        </tbody>
        <tfoot class="bg-zinc-50">
          <tr>
            <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
              {{ t('netReport.totalAttendees') }}:
            </td>
            <td class="border border-zinc-300 px-3 py-2 font-bold">{{ attendees.length }}</td>
          </tr>
          <tr>
            <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
              {{ t('netReport.operator') }}:
            </td>
            <td class="border border-zinc-300 px-3 py-2">{{ net.operator.callSign }}</td>
          </tr>
          <tr>
            <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
              {{ t('netReport.date') }}:
            </td>
            <td class="border border-zinc-300 px-3 py-2">{{ netDateInfo }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A4;
    margin: 1cm;
  }
  
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
