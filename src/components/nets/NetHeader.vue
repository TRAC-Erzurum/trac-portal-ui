<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Award, Building2, ChevronDown, Play, RotateCcw, Square, TowerControl, Users, XCircle, Radio, Clock, Settings, Printer, Image, FileSpreadsheet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MobileFab } from '@/components/shared'
import type { MobileFabAction } from '@/components/shared'
import { useDateFormat } from '@/composables'
import { formatCommunicationChannelLabel } from '@/lib/formatters'

interface Operator {
  id: string
  callSign: string
  fullName?: string
  user?: {
    id: string
  }
}

interface NetCommunicationChannel {
  id: string
  communicationChannelId?: string
  isSimplexAdHoc?: boolean
  simplexFrequency?: string
  communicationChannel?: {
    id: string
    type: string
    txFrequency?: number | null
    rxFrequency?: number | null
    echolinkNode?: string | null
    echolinkName?: string | null
  }
}

interface Net {
  id: string
  name: string
  startedAt?: string
  endedAt?: string
  attendeeCount: number
  totalDurationMinutes?: number
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
  certificateTemplate?: {
    id: string
    name: string
  } | null
  communicationChannels?: NetCommunicationChannel[]
}

interface Props {
  net: Net
  canManage: boolean
  isAdmin: boolean
  attendeesCount: number
  isExporting?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  start: [addOperatorAsAttendee: boolean]
  end: []
  restart: []
  edit: []
  exportCsv: []
  exportPdf: []
  exportPng: []
  exportCertificates: []
  shareReport: []
}>()

const { t } = useI18n()
const { formatDateTime, formatTime } = useDateFormat()

const netStatus = computed(() => {
  if (props.net.endedAt && !props.net.startedAt) return 'cancelled'
  if (props.net.endedAt) return 'completed'
  if (props.net.startedAt) return 'active'
  return 'pending'
})

const statusLabel = computed(() => {
  if (netStatus.value === 'pending') return t('netDetail.statusPending')
  if (netStatus.value === 'active') return t('netDetail.statusActive')
  if (netStatus.value === 'cancelled') return t('netDetail.statusCancelled')
  return t('netDetail.statusCompleted')
})


const dateTimeRange = computed(() => {
  const net = props.net
  if (!net.startedAt && net.endedAt) {
    return t('netDetail.cancelledAt', { date: formatDateTime(net.endedAt) })
  }
  if (!net.startedAt) return ''
  const startStr = formatDateTime(net.startedAt)
  if (!net.endedAt) return startStr
  const startDate = net.startedAt.split('T')[0]
  const endDate = net.endedAt.split('T')[0]
  if (startDate === endDate) {
    return `${startStr} – ${formatTime(net.endedAt)}`
  }
  return `${startStr} – ${formatDateTime(net.endedAt)}`
})

const formatDuration = (net: Net) => {
  const totalMinutes =
    net.totalDurationMinutes != null && net.totalDurationMinutes > 0
      ? net.totalDurationMinutes
      : net.startedAt
        ? Math.floor(
            ((net.endedAt ? new Date(net.endedAt) : new Date()).getTime() -
              new Date(net.startedAt).getTime()) /
              60000,
          )
        : 0
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const mobileFabActions = computed<MobileFabAction[]>(() => {
  const actions: MobileFabAction[] = []
  
  if (props.canManage && netStatus.value !== 'cancelled') {
    actions.push({ key: 'edit', label: t('common.edit'), icon: Settings as Component })
  }
  if (props.canManage && netStatus.value === 'pending') {
    actions.push({ key: 'startWith', label: t('netDetail.startWithOperator'), icon: Play as Component })
    actions.push({ key: 'startWithout', label: t('netDetail.startWithoutOperator'), icon: Play as Component })
    actions.push({ key: 'end', label: t('netDetail.cancel'), icon: XCircle as Component })
  }
  if (props.canManage && netStatus.value === 'active') {
    actions.push({ key: 'end', label: t('netDetail.end'), icon: Square as Component })
  }
  if (props.canManage && (netStatus.value === 'completed' || netStatus.value === 'cancelled') && props.isAdmin) {
    actions.push({
      key: 'restart',
      label: netStatus.value === 'cancelled' ? t('netDetail.undoCancellation') : t('netDetail.restart'),
      icon: RotateCcw as Component,
    })
  }
  if (netStatus.value !== 'pending' && netStatus.value !== 'cancelled' && props.attendeesCount > 0) {
    actions.push({ key: 'exportCsv', label: 'CSV', icon: FileSpreadsheet as Component })
    actions.push({ key: 'exportPdf', label: 'PDF', icon: Printer as Component })
    actions.push({ key: 'exportPng', label: 'PNG', icon: Image as Component })
    if (props.net.certificateTemplate && netStatus.value === 'completed') {
      actions.push({ key: 'exportCertificates', label: t('certificates.downloadAll'), icon: Award as Component })
    }
  }
  
  return actions
})

const handleFabAction = (key: string) => {
  switch (key) {
    case 'edit': emit('edit'); break
    case 'startWith': emit('start', true); break
    case 'startWithout': emit('start', false); break
    case 'end': emit('end'); break
    case 'restart': emit('restart'); break
    case 'shareReport': emit('shareReport'); break
    case 'exportCsv': emit('exportCsv'); break
    case 'exportPdf': emit('exportPdf'); break
    case 'exportPng': emit('exportPng'); break
    case 'exportCertificates': emit('exportCertificates'); break
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
    <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0 flex-1">
      <div class="flex justify-center sm:justify-start shrink-0">
        <div class="h-24 w-24 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
          <Radio class="h-12 w-12 text-muted-foreground" />
        </div>
      </div>
      <div class="min-w-0 flex-1 space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span v-if="netStatus === 'active'" class="relative flex h-3 w-3 shrink-0" :title="t('netDetail.statusActive')">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span v-else-if="netStatus === 'pending'" class="relative flex h-3 w-3 shrink-0 rounded-full bg-blue-500" :title="t('netDetail.statusPending')" />
          <span v-else-if="netStatus === 'cancelled'" class="relative flex h-3 w-3 shrink-0 rounded-full bg-amber-500" :title="t('netDetail.statusCancelled')" />
          <span v-else class="relative flex h-3 w-3 shrink-0 rounded-full bg-muted-foreground" :title="t('netDetail.statusCompleted')" />
          <h1 class="text-2xl font-bold min-w-0 truncate">{{ net.name }}</h1>
          <span class="text-lg text-muted-foreground shrink-0">· {{ statusLabel }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span v-if="dateTimeRange" class="flex items-center gap-2">
            <Clock class="h-4 w-4 shrink-0" />
            {{ dateTimeRange }}
          </span>
          <span class="flex items-center gap-2">
            <Radio class="h-4 w-4 shrink-0" />
            {{ net.operator.callSign }}
          </span>
          <span class="flex items-center gap-2">
            <Users class="h-4 w-4 shrink-0" />
            {{ net.attendeeCount }} {{ t('nets.attendees') }}
          </span>
          <span v-if="net.startedAt" class="flex items-center gap-2">
            <Clock class="h-4 w-4 shrink-0" />
            {{ formatDuration(net) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span v-if="net.branch" class="flex items-center gap-2">
            <Building2 class="h-4 w-4 shrink-0" />
            <span class="font-medium text-foreground">
              <span v-if="!net.branch.isHeadquarters && net.branchCallSign" class="font-mono text-primary">{{ net.branchCallSign.callSign }}</span>
              <span v-if="!net.branch.isHeadquarters && net.branchCallSign" class="mx-1.5 text-muted-foreground">·</span>
              <span>{{ net.branch.name }}</span>
            </span>
          </span>
          <span v-if="net.communicationChannels && net.communicationChannels.length > 0" class="flex items-center gap-2">
            <TowerControl class="h-4 w-4 shrink-0" />
            <span class="font-medium text-foreground">
              <template v-for="(channel, idx) in net.communicationChannels" :key="channel.id">
                <template v-if="idx > 0"> · </template>
                {{ formatCommunicationChannelLabel(channel) }}
              </template>
            </span>
          </span>
          <span v-if="net.certificateTemplate" class="flex items-center gap-2" :title="t('certificates.template')">
            <Award class="h-4 w-4 shrink-0" />
            <span class="font-medium text-foreground">{{ net.certificateTemplate.name }}</span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="$slots.certificate" class="hidden lg:block shrink-0 w-52 xl:w-60 min-w-0">
      <slot name="certificate" />
    </div>
    <div v-if="canManage || (netStatus !== 'pending' && attendeesCount > 0)" class="hidden lg:flex flex-col items-end gap-2 shrink-0 lg:ml-4">
      <Button
        v-if="canManage && netStatus !== 'cancelled'"
        variant="outline"
        size="sm"
        class="min-w-[10rem]"
        @click="emit('edit')"
      >
        <Settings class="h-4 w-4 mr-2" />
        {{ t('common.edit') }}
      </Button>
      <DropdownMenu v-if="canManage && netStatus === 'pending' && !net.endedAt">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="min-w-[10rem]">
            <Play class="h-4 w-4 mr-2" fill="currentColor" />
            {{ t('netDetail.start') }}
            <ChevronDown class="h-4 w-4 ml-2 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('start', true)">
            <Play class="h-4 w-4" fill="currentColor" />
            {{ t('netDetail.startWithOperator') }}
          </DropdownMenuItem>
          <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('start', false)">
            <Play class="h-4 w-4" fill="currentColor" />
            {{ t('netDetail.startWithoutOperator') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        v-if="canManage && (netStatus === 'pending' || netStatus === 'active') && !net.endedAt"
        variant="outline"
        size="sm"
        class="min-w-[10rem]"
        @click="emit('end')"
      >
        <XCircle v-if="netStatus === 'pending'" class="h-4 w-4 mr-2" />
        <Square v-else class="h-4 w-4 mr-2" fill="currentColor" />
        {{ netStatus === 'pending' ? t('netDetail.cancel') : t('netDetail.end') }}
      </Button>
      <Button
        v-if="canManage && (netStatus === 'completed' || netStatus === 'cancelled') && isAdmin"
        variant="outline"
        size="sm"
        class="min-w-[10rem]"
        @click="emit('restart')"
      >
        <RotateCcw class="h-4 w-4 mr-2" />
        {{ netStatus === 'cancelled' ? t('netDetail.undoCancellation') : t('netDetail.restart') }}
      </Button>
    </div>
    <MobileFab :actions="mobileFabActions" @action="handleFabAction" />
  </div>
</template>
