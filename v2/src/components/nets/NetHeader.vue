<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Square, RotateCcw, Users, Radio, Clock, Settings, Download, Printer, Image, FileSpreadsheet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Operator {
  id: string
  callSign: string
  fullName?: string
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
}>()

const { t } = useI18n()
const addOperatorAsAttendee = defineModel<boolean>('addOperatorAsAttendee', { default: true })

const netStatus = computed(() => {
  if (!props.net.startedAt) return 'pending'
  if (!props.net.endedAt) return 'active'
  return 'completed'
})

const formatDuration = (net: Net) => {
  const start = new Date(net.startedAt!)
  const end = net.endedAt ? new Date(net.endedAt) : new Date()
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000)
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
    <div class="space-y-2">
      <div class="flex items-center gap-3">
        <span v-if="netStatus === 'active'" class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span v-else-if="netStatus === 'pending'" class="relative flex h-3 w-3">
          <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        <span v-else class="relative flex h-3 w-3">
          <span class="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
        </span>
        <h1 class="text-2xl font-bold">{{ net.name }}</h1>
      </div>

      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <Radio class="h-4 w-4" />
            <span>{{ net.operator.callSign }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Users class="h-4 w-4" />
            <span>{{ net.attendeeCount }} {{ t('nets.attendees') }}</span>
          </div>
          <div v-if="net.startedAt" class="flex items-center gap-1.5">
            <Clock class="h-4 w-4" />
            <span>{{ formatDuration(net) }}</span>
          </div>
        </div>
        
        <div v-if="net.branch" class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">{{ t('nets.branch') }}:</span>
          <span class="font-medium">
            <span v-if="!net.branch.isHeadquarters && net.branchCallSign" class="font-mono text-primary">{{ net.branchCallSign.callSign }}</span>
            <span v-if="!net.branch.isHeadquarters && net.branchCallSign" class="mx-1.5 text-muted-foreground">·</span>
            <span>{{ net.branch.name }}</span>
          </span>
        </div>
        
        <div v-if="net.communicationChannels && net.communicationChannels.length > 0" class="flex items-start gap-2 text-sm">
          <span class="text-muted-foreground">{{ t('nets.infrastructure') }}:</span>
          <div class="flex flex-wrap gap-1.5">
            <span 
              v-for="channel in net.communicationChannels" 
              :key="channel.id"
              class="px-2 py-0.5 rounded-md text-xs font-medium"
              :class="channel.isSimplexAdHoc ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'"
            >
              <template v-if="channel.isSimplexAdHoc">
                Simpleks {{ channel.simplexFrequency }}
              </template>
              <template v-else>
                {{ channel.communicationChannel?.name }}
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="canManage || (netStatus !== 'pending' && attendeesCount > 0)" class="flex flex-col items-end gap-3">
      <div v-if="canManage && netStatus === 'pending'" class="flex items-center gap-2">
        <input 
          id="addOperatorAsAttendee" 
          type="checkbox"
          v-model="addOperatorAsAttendee"
          class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
        />
        <label for="addOperatorAsAttendee" class="text-sm cursor-pointer">
          {{ t('netDetail.addOperatorAsAttendee') }}
        </label>
      </div>
      
      <div class="flex items-center gap-2">
        <Button
          v-if="canManage && netStatus === 'pending'"
          variant="outline"
          @click="emit('edit')"
          class="gap-2"
        >
          <Settings class="h-4 w-4" />
          {{ t('common.edit') }}
        </Button>
        
        <Button
          v-if="canManage && netStatus === 'pending'"
          variant="outline"
          @click="emit('start', addOperatorAsAttendee)"
          class="gap-2"
        >
          <Play class="h-4 w-4" fill="currentColor" />
          {{ t('netDetail.start') }}
        </Button>
        
        <Button
          v-if="canManage && netStatus === 'active'"
          variant="outline"
          @click="emit('end')"
          class="gap-2"
        >
          <Square class="h-4 w-4" fill="currentColor" />
          {{ t('netDetail.end') }}
        </Button>
        
        <Button
          v-if="canManage && netStatus === 'completed' && isAdmin"
          variant="outline"
          @click="emit('restart')"
          class="gap-2"
        >
          <RotateCcw class="h-4 w-4" />
          {{ t('netDetail.restart') }}
        </Button>
        
        <DropdownMenu v-if="netStatus !== 'pending' && attendeesCount > 0">
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2" :disabled="isExporting">
              <Download class="h-4 w-4" />
              {{ t('netDetail.export') }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem @click="emit('exportCsv')" class="gap-2 cursor-pointer">
              <FileSpreadsheet class="h-4 w-4" />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('exportPdf')" class="gap-2 cursor-pointer" :disabled="isExporting">
              <Printer class="h-4 w-4" />
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('exportPng')" class="gap-2 cursor-pointer" :disabled="isExporting">
              <Image class="h-4 w-4" />
              PNG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
