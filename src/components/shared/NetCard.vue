<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Building2, CheckCircle2, ChevronRight, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useDateFormat } from '@/composables'

type NetStatus = 'active' | 'pending' | 'completed' | 'cancelled'

interface Props {
  id: string
  name: string
  operatorCallSign: string
  status: NetStatus
  attendeeCount?: number
  durationMinutes?: number
  startedAt?: string | null
  endedAt?: string | null
  showChevron?: boolean
  showStatusBadge?: boolean
  compact?: boolean
  branchName?: string
  branchCallSign?: string
  branchIsHeadquarters?: boolean
  showBranch?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showChevron: true,
  showStatusBadge: false,
  compact: false,
  showBranch: false
})

const emit = defineEmits<{
  click: [id: string]
}>()

const { t } = useI18n()
const router = useRouter()

const goToDetail = () => {
  emit('click', props.id)
  router.push(`/nets/${props.id}`)
}
const { formatDateShort } = useDateFormat()

const statusBadgeClasses = computed(() => {
  switch (props.status) {
    case 'active':
      return 'bg-green-500/20 text-green-700 dark:text-green-400'
    case 'pending':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
    case 'completed':
      return 'bg-muted text-muted-foreground'
    case 'cancelled':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'active':
      return t('nets.filterActive')
    case 'pending':
      return t('nets.filterPending')
    case 'completed':
      return t('nets.filterCompleted')
    case 'cancelled':
      return t('nets.filterCancelled')
    default:
      return ''
  }
})

const calculatedDuration = computed(() => {
  if (props.durationMinutes) return props.durationMinutes
  if (!props.startedAt) return 0
  const start = new Date(props.startedAt)
  const end = props.endedAt ? new Date(props.endedAt) : new Date()
  return Math.round((end.getTime() - start.getTime()) / 60000)
})

const formatDuration = (minutes?: number) => {
  const mins = minutes ?? calculatedDuration.value
  if (!mins) return ''
  if (mins < 60) return `${mins} dk`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}s ${remainingMins}dk` : `${hours}s`
}

const secondaryInfo = computed(() => {
  return props.operatorCallSign
})

</script>

<template>
  <div class="w-full text-left p-4 rounded-lg border border-border/50 transition-all flex flex-col">
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="mt-0.5 flex-shrink-0" :class="{ 'mt-1': compact }">
        <span v-if="status === 'active'" class="relative flex" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span class="relative inline-flex rounded-full bg-green-500" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'"></span>
        </span>
        <span v-else-if="status === 'pending'" class="relative flex" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'">
          <span class="relative inline-flex rounded-full bg-blue-500" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'"></span>
        </span>
        <span v-else-if="status === 'cancelled'" class="relative flex" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'">
          <span class="relative inline-flex rounded-full bg-amber-500" :class="compact ? 'h-2.5 w-2.5' : 'h-3 w-3'"></span>
        </span>
        <template v-else>
          <span v-if="compact" class="relative flex h-2.5 w-2.5">
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/50"></span>
          </span>
          <CheckCircle2 v-else class="h-3 w-3 text-muted-foreground" />
        </template>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p :class="compact ? 'font-medium' : 'font-semibold'" class="truncate">{{ name }}</p>
            <div v-if="showBranch && branchName" class="flex items-center gap-2 mt-1 min-w-0">
              <Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="text-xs text-muted-foreground shrink-0">{{ t('nets.branch') }}:</span>
              <span class="text-sm font-medium truncate">
                <template v-if="!branchIsHeadquarters && branchCallSign">
                  <span class="font-mono">{{ branchCallSign }}</span>
                  <span class="text-muted-foreground"> · </span>
                </template>
                <span>{{ branchName }}</span>
              </span>
            </div>
          </div>
          <span 
            v-if="showStatusBadge"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
            :class="statusBadgeClasses"
          >
            {{ statusLabel }}
          </span>
        </div>
        <p class="text-sm text-muted-foreground" :class="compact ? 'mt-0.5' : 'mt-1'">
          {{ secondaryInfo }}
        </p>
        <div 
          class="flex items-center gap-3 mt-2 text-muted-foreground"
          :class="compact ? 'text-xs min-h-[1rem]' : 'text-sm'"
        >
          <template v-if="status !== 'pending' || !compact">
            <span v-if="attendeeCount !== undefined" class="flex items-center gap-1">
              <Users :class="compact ? 'h-3 w-3' : 'h-3.5 w-3.5'" />
              {{ attendeeCount }} {{ compact ? '' : t('nets.attendees') }}
            </span>
            <span v-if="status === 'active' && calculatedDuration">
              · {{ formatDuration() }}
            </span>
            <span v-else-if="status === 'completed' && endedAt">
              · {{ formatDateShort(endedAt) }}
            </span>
            <span v-else-if="status === 'cancelled' && endedAt">
              · {{ formatDateShort(endedAt) }}
            </span>
            <span v-else-if="status === 'pending' && !compact">
              · {{ t('nets.notStarted') }}
            </span>
          </template>
        </div>
      </div>
    </div>
    <div v-if="(showChevron && !compact) || $slots.actions" class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
      <Button
        v-if="showChevron && !compact"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs"
        @click="goToDetail"
      >
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
