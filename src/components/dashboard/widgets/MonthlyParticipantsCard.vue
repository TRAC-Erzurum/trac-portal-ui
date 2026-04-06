<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users } from 'lucide-vue-next'
import VChart from 'vue-echarts'
import StatCard from '../StatCard.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'

interface MonthlyEntry {
  month: string
  year: number
  monthIndex: number
  completedNets: number
  uniqueParticipants: number
}

const { t, locale } = useI18n()
const themeStore = useThemeStore()
const monthlyData = ref<MonthlyEntry[]>([])
const loading = ref(true)
const error = ref(false)

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

onMounted(async () => {
  try {
    loading.value = true
    error.value = false
    const res = await api.get<MonthlyEntry[] | { data?: MonthlyEntry[] }>(
      '/dashboard/stats/monthly-trend?months=12'
    )
    monthlyData.value = Array.isArray(res) ? res : (res?.data ?? [])
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) console.error('[MonthlyParticipantsCard]', e)
  } finally {
    loading.value = false
  }
})

const chartOption = computed(() => {
  const rows = monthlyData.value
  const labels = rows.map((e) =>
    new Date(e.year, e.monthIndex, 1).toLocaleDateString(
      locale.value === 'tr' ? 'tr-TR' : 'en-US',
      { month: 'short', year: 'numeric' }
    )
  )
  const values = rows.map((e) => e.uniqueParticipants)
  const fg = isDark.value ? '#e4e4e7' : '#18181b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const line = isDark.value ? '#94a3b8' : '#64748b'

  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', confine: true },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
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
        type: 'line',
        smooth: true,
        showSymbol: rows.length <= 14,
        data: values,
        itemStyle: { color: line },
        lineStyle: { color: line, width: 2 },
        areaStyle: { color: line, opacity: 0.15 },
      },
    ],
  }
})

const hasData = computed(() => monthlyData.value.length > 0)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.monthlyParticipantsTitle')"
    :loading="loading"
    :error="error"
    :icon="Users"
  >
    <div v-if="hasData" class="w-full min-h-[200px] h-[220px] sm:h-[240px]">
      <VChart class="h-full w-full" :option="chartOption" autoresize />
    </div>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
