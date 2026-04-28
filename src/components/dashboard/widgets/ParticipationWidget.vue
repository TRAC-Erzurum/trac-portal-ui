<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Radio, Users, TrendingUp } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'
import { buildStatsQuery, defaultStatsScope, type StatsScope } from '@/composables/useStatsScope'

type Period = 'all' | '7d' | '30d'

interface Data {
  period: Period
  completedNets: number
  uniqueParticipants: number
  avgUniqueParticipantsPerNet: number
}

const props = withDefaults(defineProps<{ scope?: StatsScope; branchId?: string | null }>(), {
  scope: defaultStatsScope,
  branchId: null,
})

const { t } = useI18n()
const period = ref<Period>('all')
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
  try {
    loading.value = true
    error.value = false
    const query = buildStatsQuery(props.scope, props.branchId, { period: period.value })
    data.value = await api.get<Data>(`/insights/stats/participation?${query}`)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(period, fetchData)
watch([() => props.scope, () => props.branchId], fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.participation')"
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
          :class="period === p ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
          @click="period = p"
        >
          {{ periodLabel(p) }}
        </button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <Radio class="h-4 w-4 text-muted-foreground" />
            {{ data.completedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.completedNets') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <Users class="h-4 w-4 text-muted-foreground" />
            {{ data.uniqueParticipants }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.uniqueParticipants') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-lg font-bold">
            <TrendingUp class="h-4 w-4 text-muted-foreground" />
            {{ data.avgUniqueParticipantsPerNet }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.stats.avgPerNetLabel') }}</p>
        </div>
      </div>
    </template>
  </StatCard>
</template>
