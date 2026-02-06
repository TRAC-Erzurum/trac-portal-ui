<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Play, Square, UserPlus } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

type Period = 'all' | '7d' | '30d'

interface Data {
  period: Period
  netsStarted: number
  netsEnded: number
  attendeesAdded: number
}

const { t } = useI18n()
const period = ref<Period>('7d')
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const periodLabel = (p: Period) => {
  switch (p) {
    case 'all': return t('dashboard.stats.periodAll')
    case '7d': return t('dashboard.stats.period7d')
    case '30d': return t('dashboard.stats.period30d')
    default: return p
  }
}

const fetchData = async () => {
  const currentPeriod = period.value
  try {
    loading.value = true
    error.value = false
    data.value = null
    const res = await api.get<Data>(
      `/v2/dashboard/stats/activity-summary?period=${currentPeriod}`
    )
    if (period.value === currentPeriod) {
      data.value = res
    }
  } catch {
    if (period.value === currentPeriod) {
      error.value = true
    }
  } finally {
    if (period.value === currentPeriod) {
      loading.value = false
    }
  }
}

onMounted(fetchData)
watch(period, () => fetchData(), { flush: 'sync' })
</script>

<template>
  <StatCard
    :title="`${t('dashboard.stats.activitySummary')} · ${periodLabel(period)}`"
    :loading="loading"
    :error="error"
  >
    <template v-if="data">
      <div class="flex gap-1 mb-3">
        <button
          v-for="p in (['all', '30d', '7d'] as Period[])"
          :key="p"
          type="button"
          class="px-2 py-1 text-xs rounded border transition-colors"
          :class="period === p ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/30'"
          @click="period = p"
        >
          {{ periodLabel(p) }}
        </button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <Play class="h-4 w-4 text-muted-foreground" />
            {{ data.netsStarted }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.netsStarted') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <Square class="h-4 w-4 text-muted-foreground" />
            {{ data.netsEnded }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.netsEnded') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <UserPlus class="h-4 w-4 text-muted-foreground" />
            {{ data.attendeesAdded }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.attendeesAdded') }}</p>
        </div>
      </div>
    </template>
  </StatCard>
</template>
