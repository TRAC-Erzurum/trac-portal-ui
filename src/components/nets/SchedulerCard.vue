<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Award, Building2, Calendar, CalendarRange, Clock, Edit, Repeat } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useDateFormat } from '@/composables'
import { api } from '@/lib/api'
import {
  getNextOccurrenceDate,
  resolveSchedulerName,
  type SchedulerForResolve,
} from '@/lib/scheduler-name'

interface UpcomingNet {
  date: string
  scheduledAt: string
  name: string
}

interface Scheduler extends SchedulerForResolve {
  id: string
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
}>()

const { t, locale } = useI18n()
const { formatDateShort } = useDateFormat()

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

const resolvedName = computed(() => {
  const dateStr = nextDateStr.value
  if (!dateStr) return props.scheduler.name
  return resolveSchedulerName(
    props.scheduler,
    dateStr,
    locale.value === 'tr' ? 'tr' : 'en',
  )
})

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
            <p class="font-semibold truncate">{{ resolvedName }}</p>
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
        variant="outline"
        size="sm"
        class="trac-page-action-btn"
        @click="plannedSheetOpen = true"
      >
        <Calendar class="h-3.5 w-3.5 mr-1.5" />
        {{ t('scheduler.plannedNets') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="trac-page-action-btn"
        @click="emit('edit', scheduler.id)"
      >
        <Edit class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.edit') }}
      </Button>
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
            {{ t('common.noResults') }}
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
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
