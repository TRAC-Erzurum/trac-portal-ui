<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { TrendingUp } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import StatCard from '../StatCard.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'
import { buildStatsQuery, defaultStatsScope, type StatsScope } from '@/composables/useStatsScope'

interface Entry {
  endedAt: string
  attendeeCount: number
  netName: string
}

const props = withDefaults(defineProps<{
  scope?: StatsScope;
  branchId?: string | null
}>(), {
  scope: defaultStatsScope,
  branchId: null,
})

const { t } = useI18n()
const themeStore = useThemeStore()
const data = ref<Entry[]>([])
const loading = ref(true)
const error = ref(false)

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const query = buildStatsQuery(props.scope, props.branchId, { limit: 30 })
    const url = `/insights/stats/nets-attendees-trend?${query}`
    data.value = await api.get<Entry[]>(url)
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) {
      console.error('[NetsAttendeesTrendWidget]', e)
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch([() => props.scope, () => props.branchId], fetchData)

const chartOption = computed(() => {
  const rows = [...data.value].sort(
    (a, b) => new Date(a.endedAt).getTime() - new Date(b.endedAt).getTime()
  )
  const times = rows.map((e) => new Date(e.endedAt).getTime())
  const counts = rows.map((e) => e.attendeeCount)
  const names = rows.map((e) => e.netName)

  const fg = isDark.value ? '#e4e4e7' : '#18181b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const line = isDark.value ? '#a5b4fc' : '#0c0563'

  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params: unknown) => {
        const arr = params as { dataIndex: number; value: [number, number] }[]
        const it = arr[0]
        if (!it) return ''
        const name = names[it.dataIndex] ?? ''
        const cnt = it.value[1]
        return `${name}<br/>${cnt} ${t('dashboard.stats.uniqueParticipants')}`
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: { color: fg, fontSize: 10 },
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
        type: 'line',
        smooth: true,
        showSymbol: rows.length <= 16,
        data: times.map((tms, i) => [tms, counts[i]]),
        itemStyle: { color: line },
        lineStyle: { color: line, width: 2 },
        areaStyle: { color: line, opacity: 0.14 },
      },
    ],
  }
})
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.netsAttendeesTrend')"
    :loading="loading"
    :error="error"
    :icon="TrendingUp"
  >
    <div v-if="data.length" class="w-full min-h-[200px] h-[220px] sm:h-[240px]">
      <VChart class="h-full w-full" :option="chartOption" autoresize />
    </div>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
