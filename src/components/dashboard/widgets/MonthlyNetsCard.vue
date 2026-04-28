<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarChart3 } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import StatCard from '../StatCard.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'
import { buildStatsQuery, defaultStatsScope, type StatsScope } from '@/composables/useStatsScope'

interface MonthlyEntry {
  month: string
  year: number
  monthIndex: number
  completedNets: number
  uniqueParticipants: number
}

const props = withDefaults(defineProps<{ scope?: StatsScope; branchId?: string | null }>(), {
  scope: defaultStatsScope,
  branchId: null,
})

const { t, locale } = useI18n()
const themeStore = useThemeStore()
const monthlyData = ref<MonthlyEntry[]>([])
const loading = ref(true)
const error = ref(false)

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const query = buildStatsQuery(props.scope, props.branchId, { months: 12 })
    const res = await api.get<MonthlyEntry[] | { data?: MonthlyEntry[] }>(`/insights/stats/monthly-trend?${query}`)
    monthlyData.value = Array.isArray(res) ? res : (res?.data ?? [])
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) console.error('[MonthlyNetsCard]', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch([() => props.scope, () => props.branchId], fetchData)

const chartOption = computed(() => {
  const rows = monthlyData.value
  const labels = rows.map((e) =>
    new Date(e.year, e.monthIndex, 1).toLocaleDateString(
      locale.value === 'tr' ? 'tr-TR' : 'en-US',
      { month: 'short', year: 'numeric' }
    )
  )
  const values = rows.map((e) => e.completedNets)
  const fg = isDark.value ? '#e4e4e7' : '#18181b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const bar = isDark.value ? '#a5b4fc' : '#0c0563'

  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', confine: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: fg, fontSize: 10, rotate: labels.length > 8 ? 30 : 0 },
      axisLine: { lineStyle: { color: muted } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: muted } },
      axisLabel: { color: fg, fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color: bar, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28,
      },
    ],
  }
})

const hasData = computed(() => monthlyData.value.length > 0)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.monthlyNetsTitle')"
    :loading="loading"
    :error="error"
    :icon="BarChart3"
  >
    <div v-if="hasData" class="w-full min-h-[200px] h-[220px] sm:h-[240px]">
      <VChart class="h-full w-full" :option="chartOption" autoresize />
    </div>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
