<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Clock } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import StatCard from '../StatCard.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'
import { utcCellToBrowserLocal, type UtcBusiestCell } from '@/lib/busiest-time'

interface Cell extends UtcBusiestCell {}

interface BusiestData {
  byDay: { dayOfWeek: number; count: number }[]
  byHour: { hour: number; count: number }[]
  cells: Cell[]
}

const { t } = useI18n()
const themeStore = useThemeStore()
const busiestData = ref<BusiestData | null>(null)
const loading = ref(true)
const error = ref(false)

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

onMounted(async () => {
  try {
    loading.value = true
    error.value = false
    busiestData.value = await api.get<BusiestData>('/dashboard/stats/busiest-time')
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) console.error('[BusiestHeatmapCard]', e)
  } finally {
    loading.value = false
  }
})

const bubbleData = computed(() => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const rawCell of busiestData.value?.cells ?? []) {
    const c = utcCellToBrowserLocal(rawCell)
    if (!c) continue
    if (c.dayOfWeek >= 0 && c.dayOfWeek < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.dayOfWeek]![c.hour] += c.count
    }
  }
  const out: [number, number, number][] = []
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = grid[d]![h]!
      if (v > 0) out.push([h, d, v])
    }
  }
  const total = out.reduce((sum, [, , v]) => sum + v, 0)
  return { seriesData: out, total }
})

const maxVal = computed(() => {
  let m = 0
  for (const [, , v] of bubbleData.value.seriesData) m = Math.max(m, v)
  return m || 1
})

function bubbleColor(value: number, dark: boolean): string {
  const ratio = Math.min(1, Math.max(0, value / maxVal.value))
  if (dark) {
    const r = Math.round(70 + ratio * 140)
    const g = Math.round(90 + ratio * 90)
    const b = Math.round(170 + ratio * 70)
    return `rgba(${r}, ${g}, ${b}, ${0.35 + ratio * 0.6})`
  }
  const r = Math.round(180 - ratio * 150)
  const g = Math.round(200 - ratio * 180)
  const b = Math.round(255 - ratio * 170)
  return `rgba(${r}, ${g}, ${b}, ${0.35 + ratio * 0.55})`
}

const chartOption = computed(() => {
  const fg = isDark.value ? '#e4e4e7' : '#18181b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  // Monday-first display order for readability.
  const displayDayOrder = [1, 2, 3, 4, 5, 6, 0]
  const dayLabels = displayDayOrder.map((d) =>
    t(`dashboard.stats.days.${d}`)
  )
  const dayIndexMap = new Map<number, number>(displayDayOrder.map((day, idx) => [day, idx]))
  const seriesData = bubbleData.value.seriesData.map(([hour, day, value]) => [
    hour,
    dayIndexMap.get(day) ?? 0,
    value,
  ] as [number, number, number])
  const hourLabels = Array.from({ length: 24 }, (_, h) => `${h}:00`)

  return {
    animationDuration: 400,
    grid: { left: 72, right: 20, top: 12, bottom: 44, containLabel: false },
    tooltip: {
      confine: true,
      formatter: (p: { data: [number, number, number] }) => {
        const [hour, displayDay, val] = p.data
        return `${dayLabels[displayDay] ?? ''} ${hour}:00 — ${val}`
      },
    },
    xAxis: {
      type: 'category',
      data: hourLabels,
      boundaryGap: true,
      splitLine: { show: true, lineStyle: { color: muted } },
      axisTick: { show: false },
      axisLabel: { color: fg, fontSize: 9, interval: 2, hideOverlap: true },
    },
    yAxis: {
      type: 'category',
      data: dayLabels,
      inverse: true,
      splitLine: { show: true, lineStyle: { color: muted } },
      axisTick: { show: false },
      axisLabel: { color: fg, fontSize: 10 },
    },
    series: [
      {
        type: 'scatter',
        data: seriesData,
        symbolSize: (data: number[]) => {
          const c = data[2] ?? 0
          return 10 + (c / maxVal.value) * 26
        },
        itemStyle: {
          opacity: 0.9,
          color: (params: { data: [number, number, number] }) =>
            bubbleColor(params.data[2] ?? 0, isDark.value),
        },
        emphasis: { scale: 1.15 },
      },
    ],
  }
})

const hasData = computed(() => bubbleData.value.total > 0)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.busiestHeatmapTitle')"
    :loading="loading"
    :error="error"
    :icon="Clock"
  >
    <div v-if="hasData" class="w-full min-h-[280px] h-[300px] sm:h-[320px]">
      <VChart class="h-full w-full" :option="chartOption" autoresize />
    </div>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
