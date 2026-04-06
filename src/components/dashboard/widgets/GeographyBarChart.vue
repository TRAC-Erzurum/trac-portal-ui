<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VChart from 'vue-echarts'
import { useThemeStore } from '@/stores/theme'

type Tab = 'countries' | 'cities' | 'districts'

interface Props {
  activeTab: Tab
  countries: { country: string; count: number; iso2?: string }[]
  cities: { city: string; count: number }[]
  districts: { city: string; district: string; count: number }[]
}

const props = defineProps<Props>()
const { t } = useI18n()
const themeStore = useThemeStore()

const isDark = computed(() => themeStore.effectiveTheme === 'dark')

const TOP = 15

const chartOption = computed(() => {
  let categories: string[] = []
  let values: number[] = []

  if (props.activeTab === 'countries') {
    const rows = [...props.countries].sort((a, b) => b.count - a.count).slice(0, TOP)
    categories = rows.map((r) => r.country)
    values = rows.map((r) => r.count)
  } else if (props.activeTab === 'cities') {
    const rows = [...props.cities].sort((a, b) => b.count - a.count).slice(0, TOP)
    categories = rows.map((r) => r.city)
    values = rows.map((r) => r.count)
  } else {
    const rows = [...props.districts].sort((a, b) => b.count - a.count).slice(0, TOP)
    categories = rows.map((r) => `${r.city} / ${r.district}`)
    values = rows.map((r) => r.count)
  }

  const fg = isDark.value ? '#e4e4e7' : '#18181b'
  const muted = isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const bar = isDark.value ? '#a5b4fc' : '#0c0563'

  return {
    animationDuration: 400,
    grid: { left: 8, right: 48, top: 8, bottom: 8, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: muted } },
      axisLabel: { color: fg, fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: fg, fontSize: 10, width: 120, overflow: 'truncate' },
      axisLine: { lineStyle: { color: muted } },
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: { color: bar, borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          color: fg,
          fontSize: 10,
        },
      },
    ],
  }
})

const hasRows = computed(() => {
  if (props.activeTab === 'countries') return props.countries.length > 0
  if (props.activeTab === 'cities') return props.cities.length > 0
  return props.districts.length > 0
})
</script>

<template>
  <div v-if="hasRows" class="w-full min-h-[260px] h-[280px] sm:h-[300px]">
    <VChart class="h-full w-full" :option="chartOption" autoresize />
  </div>
  <p v-else class="text-sm text-muted-foreground py-6 text-center">
    {{ t('dashboard.noStats') }}
  </p>
</template>
