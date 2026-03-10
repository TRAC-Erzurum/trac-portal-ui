<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { TrendingDown, TrendingUp } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

type Period = '7d' | '30d'

interface PeriodSnapshot {
  completedNets: number
  totalCheckIns: number
  uniqueParticipants: number
}

interface Data {
  period: string
  completedNets: number
  totalCheckIns: number
  uniqueParticipants: number
  previousPeriod?: PeriodSnapshot
}

const props = withDefaults(
  defineProps<{
    /** This card only supports 7d or 30d (trend vs previous period) */
    period?: Period
  }>(),
  { period: '7d' }
)

const { t } = useI18n()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const periodLabel = (p: Period) => {
  switch (p) {
    case '7d':
      return t('dashboard.stats.period7d')
    case '30d':
      return t('dashboard.stats.period30d')
    default:
      return p
  }
}

const fetchData = async () => {
  const currentPeriod = props.period
  try {
    loading.value = true
    error.value = false
    data.value = null
    const res = await api.get<Data>(
      `/dashboard/stats/activity-summary?period=${currentPeriod}`,
    )
    if (props.period === currentPeriod) {
      data.value = res
    }
  } catch {
    if (props.period === currentPeriod) {
      error.value = true
    }
  } finally {
    if (props.period === currentPeriod) {
      loading.value = false
    }
  }
}

/** Overall trend: up / down / same (no duplicate numbers, only comparison) */
const trend = computed(() => {
  const d = data.value
  const prev = d?.previousPeriod
  if (!d || !prev) return null
  const netDelta = prev.completedNets > 0
    ? ((d.completedNets - prev.completedNets) / prev.completedNets) * 100
    : (d.completedNets > 0 ? 100 : 0)
  const checkInDelta = prev.totalCheckIns > 0
    ? ((d.totalCheckIns - prev.totalCheckIns) / prev.totalCheckIns) * 100
    : (d.totalCheckIns > 0 ? 100 : 0)
  const participantDelta = prev.uniqueParticipants > 0
    ? ((d.uniqueParticipants - prev.uniqueParticipants) / prev.uniqueParticipants) * 100
    : (d.uniqueParticipants > 0 ? 100 : 0)
  const avgDelta = (netDelta + checkInDelta + participantDelta) / 3
  if (Math.abs(avgDelta) < 2) return 'same'
  return avgDelta > 0 ? 'up' : 'down'
})

/** Percentage deltas for tooltip/summary (no duplicate absolute numbers) */
const deltas = computed(() => {
  const d = data.value
  const prev = d?.previousPeriod
  if (!d || !prev) return null
  const netPct = prev.completedNets > 0
    ? Math.round(((d.completedNets - prev.completedNets) / prev.completedNets) * 100)
    : (d.completedNets > 0 ? 100 : 0)
  const checkInPct = prev.totalCheckIns > 0
    ? Math.round(((d.totalCheckIns - prev.totalCheckIns) / prev.totalCheckIns) * 100)
    : (d.totalCheckIns > 0 ? 100 : 0)
  const participantPct = prev.uniqueParticipants > 0
    ? Math.round(((d.uniqueParticipants - prev.uniqueParticipants) / prev.uniqueParticipants) * 100)
    : (d.uniqueParticipants > 0 ? 100 : 0)
  return { nets: netPct, checkIns: checkInPct, participants: participantPct }
})

const trendLabel = computed(() => {
  if (!data.value?.previousPeriod) return ''
  if (trend.value === 'up') return t('dashboard.stats.trendUp')
  if (trend.value === 'down') return t('dashboard.stats.trendDown')
  return t('dashboard.stats.noComparison')
})

const hasComparison = computed(() => data.value?.previousPeriod != null)

const emit = defineEmits<{
  'update:period': [value: Period]
}>()

const periods: Period[] = ['30d', '7d']

const setPeriod = (p: Period) => {
  emit('update:period', p)
}

onMounted(fetchData)
watch(() => props.period, fetchData, { flush: 'sync' })
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.communityPulse')"
    :loading="loading"
    :error="error"
  >
    <template #actions>
      <div class="flex gap-1">
        <button
          v-for="p in periods"
          :key="p"
          type="button"
          class="px-2 py-1 text-xs rounded-md border transition-colors"
          :class="period === p ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
          @click="setPeriod(p)"
        >
          {{ periodLabel(p) }}
        </button>
      </div>
    </template>
    <template v-if="data">
      <div v-if="hasComparison" class="space-y-3">
        <div
          class="flex items-center gap-2 py-2"
          role="status"
          :aria-label="trendLabel"
        >
          <TrendingUp
            v-if="trend === 'up'"
            class="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0"
            aria-hidden="true"
          />
          <TrendingDown
            v-else-if="trend === 'down'"
            class="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span
            v-if="trend && trend !== 'same'"
            :class="[
              'text-sm font-medium',
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            ]"
          >
            {{ trend === 'up' ? t('dashboard.stats.trendUp') : t('dashboard.stats.trendDown') }}
          </span>
          <span v-else class="text-sm text-muted-foreground">
            {{ t('dashboard.stats.noComparison') }}
          </span>
        </div>
        <p v-if="deltas" class="text-xs text-muted-foreground">
          {{ t('dashboard.stats.trendBreakdown', deltas) }}
        </p>
      </div>
      <p v-else class="text-sm text-muted-foreground py-2">
        {{ t('dashboard.stats.trendOnlyWithPeriod') }}
      </p>
    </template>
  </StatCard>
</template>
