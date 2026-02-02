<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Users, AlertCircle, Check } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import EditAttendeeSheet from '@/components/nets/EditAttendeeSheet.vue'
import EditNetSheet from '@/components/nets/EditNetSheet.vue'
import NetHeader from '@/components/nets/NetHeader.vue'
import AddAttendeePanel from '@/components/nets/AddAttendeePanel.vue'
import AttendeeList from '@/components/nets/AttendeeList.vue'
import ExportReportTemplate from '@/components/nets/ExportReportTemplate.vue'
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
  picture?: string | null
}

interface Net {
  id: string
  name: string
  frequency: string
  mode: string
  type: string
  startedAt?: string
  endedAt?: string
  attendeeCount: number
  operator: Operator
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const net = ref<Net | null>(null)
const attendees = ref<Attendee[]>([])
const isLoading = ref(true)
const isLoadingAttendees = ref(false)
const addOperatorAsAttendee = ref(true)

const editingAttendee = ref<Attendee | null>(null)
const isEditSheetOpen = ref(false)
const isEditNetSheetOpen = ref(false)

const exportTemplateRef = ref<InstanceType<typeof ExportReportTemplate> | null>(null)
const isExporting = ref(false)
const exportAttendees = ref<Attendee[]>([])

const netStatus = computed(() => {
  if (!net.value?.startedAt) return 'pending'
  if (!net.value?.endedAt) return 'active'
  return 'completed'
})

const canManageNet = computed(() => {
  if (!net.value) return false
  if (auth.isAdmin || auth.isSuperAdmin) return true
  return String(auth.user?.id) === net.value.operator.id
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
      picture: a.operator?.user?.picture || null
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

const viewReport = () => {
  window.open(`/nets/${route.params.id}/report`, '_blank')
}


const formatQthExport = (attendee: Attendee) => {
  return [attendee.district, attendee.city].filter(Boolean).join(', ') || '-'
}

const getNetDateInfo = () => {
  if (!net.value) return ''
  const { startedAt, endedAt } = net.value
  if (!startedAt) return '-'
  
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (!endedAt) return formatDateTime(startedAt)
  
  const startDate = startedAt.split('T')[0]
  const endDate = endedAt.split('T')[0]
  
  if (startDate === endDate) {
    return `${formatDateTime(startedAt)} - ${formatTime(endedAt)}`
  }
  
  return `${formatDateTime(startedAt)} - ${formatDateTime(endedAt)}`
}

const exportToCsv = async () => {
  if (!net.value) return
  
  try {
    const sortedAttendees = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    
    const headers = [
      '#',
      t('operators.callSign'),
      t('operators.name'),
      t('operators.qth'),
      t('operators.readability'),
      t('operators.signal'),
      t('netReport.joinTime')
    ].join(',')
    
    const rows = sortedAttendees.map((a, i) => {
      const fields = [
        i + 1,
        a.callSign || '',
        (a.name || '').replace(/"/g, '""'),
        formatQthExport(a).replace(/"/g, '""'),
        a.readability || '',
        a.signalStrength || '',
        formatDateTime(a.createdAt).replace(/"/g, '""')
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

const exportToPng = async () => {
  if (!net.value || isExporting.value) return
  
  isExporting.value = true
  try {
    const sortedAttendees = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    exportAttendees.value = sortedAttendees
    
    await nextTick()
    
    const templateEl = exportTemplateRef.value?.templateRef
    if (!templateEl) {
      throw new Error('Template ref not found')
    }
    
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(templateEl, {
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
  } finally {
    isExporting.value = false
  }
}

const exportToPdf = async () => {
  if (!net.value || isExporting.value) return
  
  isExporting.value = true
  try {
    const sortedAttendees = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=ASC`)
    exportAttendees.value = sortedAttendees
    
    await nextTick()
    
    const templateEl = exportTemplateRef.value?.templateRef
    if (!templateEl) {
      throw new Error('Template ref not found')
    }
    
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(templateEl, {
      backgroundColor: '#ffffff',
      scale: 2
    })
    
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF('p', 'mm', 'a4')
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`)
    toast.success(t('netReport.exportSuccess'))
  } catch (error) {
    toast.error(t('error.serverError'))
  } finally {
    isExporting.value = false
  }
}

onMounted(() => {
  Promise.all([fetchNet(), fetchAttendees()])
})
</script>

<template>
  <AppLayout :title="net?.name || t('common.loading')">
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
        v-model:add-operator-as-attendee="addOperatorAsAttendee"
        @start="startNet"
        @end="endNet"
        @restart="restartNet"
        @edit="openEditNet"
        @view-report="viewReport"
        @export-csv="exportToCsv"
        @export-pdf="exportToPdf"
        @export-png="exportToPng"
      />

      <div class="border-t border-border/50 pt-6">
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
          @attendee-added="handleAttendeeAdded"
        />

        <div
          v-else-if="netStatus === 'pending'"
          class="mb-6 p-4 rounded-lg border border-blue-500/30 bg-blue-500/5 text-center"
        >
          <AlertCircle class="h-5 w-5 text-blue-500 mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('netDetail.startToAdd') }}</p>
        </div>

        <div
          v-else-if="netStatus === 'completed'"
          class="mb-6 p-4 rounded-lg border border-border/50 bg-muted/20 text-center"
        >
          <Check class="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('netDetail.netCompleted') }}</p>
        </div>

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
      :net="net"
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
    />
  </AppLayout>
</template>
