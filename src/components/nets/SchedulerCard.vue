<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  Award,
  Building2,
  Calendar,
  CalendarRange,
  Clock,
  Edit,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Square,
  Trash2,
  X,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useDateFormat } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import {
  getLastOccurrenceDate,
  getNextOccurrenceDate,
  resolveSchedulerName,
  type SchedulerForResolve,
} from '@/lib/scheduler-name'
import type { NetSchedulerStatus } from '@/types/net-scheduler'

interface UpcomingNet {
  date: string
  scheduledAt: string
  name: string
}

interface Scheduler extends SchedulerForResolve {
  id: string
  status?: NetSchedulerStatus
  branch?: { name?: string; isHeadquarters?: boolean } | null
  branchCallSign?: { callSign?: string } | null
  certificateTemplateId?: string | null
}

const props = defineProps<{
  scheduler: Scheduler
  showEditButton?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  updated: []
}>()

const { t, locale } = useI18n()
const { formatDateShort } = useDateFormat()

const status = computed<NetSchedulerStatus>(() => props.scheduler.status ?? 'active')
const isPaused = computed(() => status.value === 'paused')
const isEnded = computed(() => status.value === 'ended')

const statusBadgeLabel = computed(() => {
  if (isPaused.value) return t('scheduler.statusPaused')
  if (isEnded.value) return t('scheduler.statusEnded')
  return ''
})

type PendingAction = 'pause' | 'resume' | 'end' | 'delete'
const pendingAction = ref<PendingAction | null>(null)
const isActionBusy = ref(false)

const dialogTitle = computed(() =>
  pendingAction.value ? t(`scheduler.${pendingAction.value}ConfirmTitle`) : '',
)
const dialogDescription = computed(() =>
  pendingAction.value ? t(`scheduler.${pendingAction.value}ConfirmDescription`) : '',
)
const confirmLabel = computed(() =>
  pendingAction.value ? t(`scheduler.${pendingAction.value}`) : '',
)
const isDestructiveAction = computed(
  () => pendingAction.value === 'delete' || pendingAction.value === 'end',
)

const openAction = (action: PendingAction) => {
  pendingAction.value = action
}

const runAction = async () => {
  const action = pendingAction.value
  if (!action || isActionBusy.value) return
  isActionBusy.value = true
  const id = props.scheduler.id
  try {
    if (action === 'pause') {
      await api.patch(`/net-schedulers/${id}`, { isActive: false })
    } else if (action === 'resume') {
      await api.patch(`/net-schedulers/${id}`, { isActive: true })
    } else if (action === 'end') {
      await api.post(`/net-schedulers/${id}/end`)
    } else {
      await api.delete(`/net-schedulers/${id}`)
    }
    toast.success(t(`scheduler.${action}Success`))
    pendingAction.value = null
    emit('updated')
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
    // The plan state may have changed under us (e.g. already ended); refresh the lists.
    pendingAction.value = null
    emit('updated')
  } finally {
    isActionBusy.value = false
  }
}

const plannedSheetOpen = ref(false)
const upcomingNets = ref<UpcomingNet[]>([])
const isLoadingPlanned = ref(false)

const DISPLAY_LIMIT = 5
const FETCH_LIMIT = 6

async function loadUpcomingNets() {
  if (!props.scheduler?.id) return
  isLoadingPlanned.value = true
  try {
    const list = await api.get<UpcomingNet[]>(
      `/net-schedulers/${props.scheduler.id}/upcoming-nets?limit=${FETCH_LIMIT}`,
    )
    upcomingNets.value = list ?? []
  } catch {
    upcomingNets.value = []
  } finally {
    isLoadingPlanned.value = false
  }
}

watch(plannedSheetOpen, (open) => {
  if (open) loadUpcomingNets()
})

const displayedNets = computed(() =>
  upcomingNets.value.slice(0, DISPLAY_LIMIT),
)
const hasMoreThanFive = computed(() => upcomingNets.value.length >= FETCH_LIMIT)
const lastListedDateLabel = computed(() => {
  const last = displayedNets.value[displayedNets.value.length - 1]
  return last ? formatDateShort(last.date + 'T12:00:00') : ''
})

function formatScheduledAt(scheduledAt: string) {
  if (!scheduledAt) return '—'
  const d = new Date(scheduledAt)
  return d.toLocaleString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const nextDateStr = computed(() =>
  getNextOccurrenceDate(props.scheduler),
)

const resolvedName = computed(() =>
  resolveSchedulerName(
    props.scheduler,
    nextDateStr.value ?? getLastOccurrenceDate(props.scheduler),
    locale.value === 'tr' ? 'tr' : 'en',
  ),
)

const operatorCallsign = computed(
  () => props.scheduler.operator?.callSign ?? '',
)

const recurrenceLabel = computed(() => {
  const r = props.scheduler.recurrence
  const key = r === 'one_time' ? 'oneTime' : r
  return t(`scheduler.${key}`)
})

const scheduledLabel = computed(() => {
  const start = props.scheduler.startDate
  const time = props.scheduler.scheduledTime?.slice(0, 5) ?? '20:00'
  if (!start) return ''
  const d = new Date(start + 'T12:00:00')
  const datePart = d.toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${datePart} ${time}`
})

const endDateLabel = computed(() => {
  const end = props.scheduler.endDate
  if (!end) return ''
  return formatDateShort(end + 'T12:00:00')
})

const branchName = computed(() => props.scheduler.branch?.name ?? '')
const branchCallSign = computed(() => props.scheduler.branchCallSign?.callSign ?? '')
const branchIsHeadquarters = computed(() => props.scheduler.branch?.isHeadquarters ?? false)
</script>

<template>
  <div class="w-full text-left p-4 rounded-lg border border-border/50 bg-background transition-all flex flex-col relative">
    <Award
      v-if="scheduler.certificateTemplateId"
      class="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0"
      :title="t('certificates.template')"
      aria-hidden
    />
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="mt-0.5 flex-shrink-0">
        <Clock class="h-3 w-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <p class="font-semibold truncate">{{ resolvedName }}</p>
              <span
                v-if="statusBadgeLabel"
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="isPaused
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'"
              >
                {{ statusBadgeLabel }}
              </span>
            </div>
            <div v-if="branchName" class="flex items-center gap-2 mt-1 min-w-0">
              <Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="text-sm font-medium truncate">
                <template v-if="!branchIsHeadquarters && branchCallSign">
                  <span class="font-mono">{{ branchCallSign }}</span>
                  <span class="text-muted-foreground"> · </span>
                </template>
                <span>{{ branchName }}</span>
              </span>
            </div>
          </div>
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          {{ operatorCallsign }}
        </p>
        <div class="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
          <span class="flex items-center gap-1">
            <CalendarRange class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {{ scheduledLabel }}
            <template v-if="endDateLabel">
              – {{ endDateLabel }}
            </template>
          </span>
          <span class="flex items-center gap-1">
            <Repeat class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {{ recurrenceLabel }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="showEditButton" class="mt-auto pt-2 pb-0 border-t border-border/30">
      <div class="trac-mobile-action-row">
      <Button
        v-if="status === 'active'"
        variant="outline"
        size="sm"
        class="trac-page-action-btn"
        @click="plannedSheetOpen = true"
      >
        <Calendar class="h-3.5 w-3.5 mr-1.5" />
        {{ t('scheduler.plannedNets') }}
      </Button>
      <Button
        v-if="!isEnded"
        variant="outline"
        size="sm"
        class="trac-page-action-btn"
        @click="emit('edit', scheduler.id)"
      >
        <Edit class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.edit') }}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="outline"
            size="sm"
            class="trac-page-action-btn"
            :aria-label="t('common.moreActions')"
            :title="t('common.moreActions')"
          >
            <MoreHorizontal class="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem v-if="status === 'active'" class="gap-2 cursor-pointer" @select="openAction('pause')">
            <Pause class="h-4 w-4" />
            {{ t('scheduler.pause') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="isPaused" class="gap-2 cursor-pointer" @select="openAction('resume')">
            <Play class="h-4 w-4" />
            {{ t('scheduler.resume') }}
          </DropdownMenuItem>
          <DropdownMenuItem v-if="!isEnded" class="gap-2 cursor-pointer" @select="openAction('end')">
            <Square class="h-4 w-4" />
            {{ t('scheduler.end') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="!isEnded" />
          <DropdownMenuItem class="gap-2 cursor-pointer text-red-600 dark:text-red-400" @select="openAction('delete')">
            <Trash2 class="h-4 w-4" />
            {{ t('common.delete') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </div>
  </div>

  <Sheet :open="plannedSheetOpen" @update:open="plannedSheetOpen = $event">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('scheduler.plannedNets') }}</SheetTitle>
        <SheetDescription class="sr-only">{{ t('scheduler.plannedNets') }}</SheetDescription>
      </SheetHeader>
      <div class="mt-4 space-y-3 px-2 sm:px-4">
        <div v-if="isLoadingPlanned" class="py-6 text-sm text-muted-foreground">
          {{ t('common.loading') }}
        </div>
        <template v-else>
          <div v-if="displayedNets.length === 0" class="py-6 text-sm text-muted-foreground">
            {{ endDateLabel ? t('scheduler.endsOnNoMoreNets', { date: endDateLabel }) : t('common.noResults') }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="item in displayedNets"
              :key="item.date"
              class="w-full text-left p-4 rounded-lg border border-border/50 bg-background flex flex-col gap-1"
            >
              <p class="font-semibold truncate">{{ item.name }}</p>
              <p class="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarRange class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {{ formatScheduledAt(item.scheduledAt) }}
              </p>
            </div>
          </div>
          <div
            v-if="hasMoreThanFive"
            class="w-full rounded-lg border border-dashed border-border/70 bg-background flex items-center justify-center py-3 text-muted-foreground/60"
            :aria-label="t('scheduler.plannedNetsMoreHint')"
          >
            <span class="text-lg tracking-widest" aria-hidden="true">⋯</span>
          </div>
          <p v-if="endDateLabel && lastListedDateLabel && !hasMoreThanFive" class="text-sm text-muted-foreground">
            {{ t('scheduler.lastNetOn', { date: lastListedDateLabel }) }}
          </p>
        </template>
      </div>
    </SheetContent>
  </Sheet>

  <Dialog :open="pendingAction !== null" @update:open="(open) => { if (!open && !isActionBusy) pendingAction = null }">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" :disabled="isActionBusy" @click="pendingAction = null">
          <X class="h-4 w-4" />
          {{ t('common.cancel') }}
        </Button>
        <Button
          variant="outline"
          :disabled="isActionBusy"
          :class="{ 'trac-btn-destructive-outlined': isDestructiveAction }"
          @click="runAction"
        >
          {{ isActionBusy ? t('common.loading') : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
