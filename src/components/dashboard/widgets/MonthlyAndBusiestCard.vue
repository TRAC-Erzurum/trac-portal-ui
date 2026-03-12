<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

const CHART_HEIGHT = 88

interface MonthlyEntry {
  month: string
  year: number
  monthIndex: number
  completedNets: number
  uniqueParticipants: number
}

interface BusiestData {
  byDay: { dayOfWeek: number; count: number }[]
  byHour: { hour: number; count: number }[]
}

function utcByHourToLocal(byHour: { hour: number; count: number }[]): { hour: number; count: number }[] {
  const offsetMinutes = new Date().getTimezoneOffset()
  const offsetHours = -offsetMinutes / 60
  const buckets = new Array(24).fill(0)
  for (const { hour, count } of byHour ?? []) {
    const localHour = (hour + offsetHours + 24) % 24
    buckets[localHour] += count
  }
  return buckets.map((count, hour) => ({ hour, count }))
}

const { t } = useI18n()
const monthlyData = ref<MonthlyEntry[]>([])
const busiestData = ref<BusiestData | null>(null)
const loading = ref(true)
const error = ref(false)

const byHourLocal = computed(() =>
  busiestData.value?.byHour ? utcByHourToLocal(busiestData.value.byHour) : []
)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const [monthlyRes, busiestRes] = await Promise.all([
      api.get<MonthlyEntry[] | { data?: MonthlyEntry[] }>('/dashboard/stats/monthly-trend?months=12'),
      api.get<BusiestData>('/dashboard/stats/busiest-time'),
    ])
    monthlyData.value = Array.isArray(monthlyRes) ? monthlyRes : (monthlyRes?.data ?? [])
    busiestData.value = busiestRes
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) {
      console.error('[MonthlyAndBusiestCard]', e)
    }
  } finally {
    loading.value = false
  }
}

const maxMonthlyValue = computed(() => {
  if (!monthlyData.value.length) return 1
  const maxN = Math.max(...monthlyData.value.map((e) => e.completedNets))
  const maxP = Math.max(...monthlyData.value.map((e) => e.uniqueParticipants))
  return Math.max(maxN, maxP, 1)
})

const monthShort = (e: MonthlyEntry) => t(`dashboard.months.${e.month}`).slice(0, 3)
const monthLabel = (e: MonthlyEntry) => monthShort(e) + ' ' + e.year
const barHeight = (value: number) =>
  Math.max(2, (value / maxMonthlyValue.value) * CHART_HEIGHT)
const monthlyTooltip = (e: MonthlyEntry) =>
  `${monthLabel(e)}: ${e.completedNets} ${t('dashboard.stats.completedNets')}, ${e.uniqueParticipants} ${t('dashboard.stats.uniqueParticipants')}`

const maxDay = () =>
  busiestData.value?.byDay?.length
    ? Math.max(...busiestData.value.byDay.map((d) => d.count), 1)
    : 1
const maxHour = () =>
  byHourLocal.value.length
    ? Math.max(...byHourLocal.value.map((h) => h.count), 1)
    : 1
const hasBusiestData = () => {
  if (!busiestData.value) return false
  const dayTotal = busiestData.value.byDay?.reduce((s, d) => s + d.count, 0) ?? 0
  const hourTotal = byHourLocal.value.reduce((s, h) => s + h.count, 0)
  return dayTotal > 0 || hourTotal > 0
}

onMounted(fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.monthlyAndBusiest')"
    :loading="loading"
    :error="error"
  >
    <template v-if="monthlyData.length || busiestData">
      <div class="space-y-6">
        <!-- Aylık grafik (üst) -->
        <div v-if="monthlyData.length" class="space-y-3">
          <p class="text-xs font-medium text-muted-foreground">
            {{ t('dashboard.stats.monthlyTrend') }}
          </p>
          <div class="flex gap-2 overflow-x-auto pb-1">
            <div
              class="flex-shrink-0 flex flex-col justify-between text-[10px] text-muted-foreground py-0.5"
              style="width: 1.25rem"
            >
              <span>{{ maxMonthlyValue }}</span>
              <span>0</span>
            </div>
            <div class="flex gap-1.5 items-end flex-1 min-w-0" :style="{ height: CHART_HEIGHT + 'px' }">
              <div
                v-for="e in monthlyData"
                :key="e.year + '-' + e.monthIndex"
                class="flex-shrink-0 flex flex-col items-center gap-0.5 w-9"
                :title="monthlyTooltip(e)"
              >
                <div class="flex gap-1 items-end flex-1 w-full justify-center">
                  <div class="flex flex-col items-center flex-1 min-w-0">
                    <span
                      v-if="e.completedNets > 0"
                      class="text-[10px] font-medium text-muted-foreground leading-none mb-0.5"
                    >
                      {{ e.completedNets }}
                    </span>
                    <div
                      class="w-full max-w-[14px] rounded-t bg-primary/50 transition-all"
                      :style="{ height: barHeight(e.completedNets) + 'px', minHeight: e.completedNets > 0 ? '4px' : '0' }"
                    />
                  </div>
                  <div class="flex flex-col items-center flex-1 min-w-0">
                    <span
                      v-if="e.uniqueParticipants > 0"
                      class="text-[10px] font-medium text-muted-foreground leading-none mb-0.5"
                    >
                      {{ e.uniqueParticipants }}
                    </span>
                    <div
                      class="w-full max-w-[14px] rounded-t bg-primary/25 transition-all"
                      :style="{ height: barHeight(e.uniqueParticipants) + 'px', minHeight: e.uniqueParticipants > 0 ? '4px' : '0' }"
                    />
                  </div>
                </div>
                <span class="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                  {{ monthShort(e) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-4 text-xs text-muted-foreground pl-7">
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-sm bg-primary/50" />
              {{ t('dashboard.stats.completedNets') }}
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-sm bg-primary/25" />
              {{ t('dashboard.stats.uniqueParticipants') }}
            </span>
          </div>
        </div>

        <!-- Yoğun saatler (alt): geniş ekranda gün ve saat aynı satırda -->
        <div v-if="busiestData" class="space-y-4">
          <p v-if="!hasBusiestData() && !loading" class="text-sm text-muted-foreground">
            {{ t('dashboard.noStats') }}
          </p>
          <div v-else class="flex flex-col lg:flex-row lg:gap-6 lg:items-start">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-muted-foreground mb-2">{{ t('dashboard.stats.byDay') }}</p>
              <div class="flex gap-0.5 items-end h-12">
                <div
                  v-for="d in busiestData.byDay"
                  :key="d.dayOfWeek"
                  class="flex-1 flex flex-col justify-end items-center gap-0.5 h-12 min-h-0"
                  :title="`${t('dashboard.stats.days.' + d.dayOfWeek)}: ${d.count}`"
                >
                  <div
                    class="w-full rounded-t bg-primary/30 min-h-[4px] transition-all flex-shrink-0"
                    :style="{ height: `${(d.count / maxDay()) * 100}%`, maxHeight: '100%' }"
                  />
                </div>
              </div>
              <div class="flex gap-0.5 mt-1">
                <span
                  v-for="d in busiestData.byDay"
                  :key="'l' + d.dayOfWeek"
                  class="flex-1 text-[10px] text-center text-muted-foreground truncate"
                >
                  {{ t('dashboard.stats.days.' + d.dayOfWeek) }}
                </span>
              </div>
            </div>
            <div class="flex-1 min-w-0 lg:flex-shrink-0">
              <p class="text-xs font-medium text-muted-foreground mb-2">{{ t('dashboard.stats.byHour') }}</p>
              <div class="flex gap-0.5 items-end h-12 overflow-x-auto">
                <div
                  v-for="h in byHourLocal"
                  :key="h.hour"
                  class="flex-shrink-0 w-3 flex flex-col justify-end items-center h-12 min-h-0"
                  :title="`${h.hour}:00 – ${h.count}`"
                >
                  <div
                    class="w-full rounded-t bg-primary/30 min-h-[4px] transition-all flex-shrink-0"
                    :style="{ height: `${(h.count / maxHour()) * 100}%`, maxHeight: '100%' }"
                  />
                </div>
              </div>
              <p class="text-[10px] text-muted-foreground mt-1">0h – 23h</p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
