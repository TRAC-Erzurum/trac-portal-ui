<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import VChart from 'vue-echarts'
import StatCard from '../StatCard.vue'
import { useThemeStore } from '@/stores/theme'
import { api } from '@/lib/api'

interface MonthlyPoint {
  year: number
  monthIndex: number
  participated: number
  managed: number
}

interface Data {
  thisMonthParticipated: number
  lastMonthParticipated: number
  thisMonthManaged: number
  lastMonthManaged: number
  monthlySeries: MonthlyPoint[]
}

const props = defineProps<{ branchId?: string | null }>()
const { t, locale } = useI18n()
const themeStore = useThemeStore()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const url = props.branchId
      ? `/dashboard/personal/trend?branchId=${props.branchId}`
      : '/dashboard/personal/trend'
    data.value = await api.get<Data>(url)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(() => props.branchId, fetchData)

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

const chartOption = computed(() => {
  const series = data.value?.monthlySeries ?? []
  const labels = series.map((p) => {
    const d = new Date(p.year, p.monthIndex, 1)
    return d.toLocaleDateString(locale.value === 'tr' ? 'tr-TR' : 'en-US', {
      month: 'short',
      year: 'numeric',
    })
  })
  const participated = series.map((p) => p.participated)
  const managed = series.map((p) => p.managed)

  const primary = isDark.value ? '#a5b4fc' : '#0c0563'
  const secondary = isDark.value ? '#94a3b8' : '#64748b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const fg = isDark.value ? '#e4e4e7' : '#18181b'

  return {
    animationDuration: 400,
    grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      confine: true,
    },
    legend: {
      data: [t('dashboard.stats.participated'), t('dashboard.managed')],
      top: 0,
      textStyle: { color: fg, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: fg, fontSize: 10, rotate: labels.length > 8 ? 35 : 0 },
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
        name: t('dashboard.stats.participated'),
        type: 'line',
        smooth: true,
        showSymbol: series.length <= 14,
        data: participated,
        itemStyle: { color: primary },
        lineStyle: { color: primary, width: 2 },
        areaStyle: {
          color: primary,
          opacity: 0.12,
        },
      },
      {
        name: t('dashboard.managed'),
        type: 'line',
        smooth: true,
        showSymbol: series.length <= 14,
        data: managed,
        itemStyle: { color: secondary },
        lineStyle: { color: secondary, width: 2 },
        areaStyle: {
          color: secondary,
          opacity: 0.1,
        },
      },
    ],
  }
})

const hasSeries = computed(() => (data.value?.monthlySeries?.length ?? 0) > 0)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.personalTrend')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data && hasSeries">
      <div class="w-full min-h-[200px] h-[220px] sm:h-[240px]">
        <VChart
          class="h-full w-full"
          :option="chartOption"
          autoresize
        />
      </div>
    </template>
    <p v-else-if="data && !hasSeries" class="text-sm text-muted-foreground py-6 text-center">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
