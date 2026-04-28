<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

interface Entry {
  month: string
  year: number
  monthIndex: number
  completedNets: number
  uniqueParticipants: number
}

const CHART_HEIGHT = 88

const { t } = useI18n()
const data = ref<Entry[]>([])
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const res = await api.get<Entry[] | { data?: Entry[] }>(
      '/insights/stats/monthly-trend?months=12'
    )
    data.value = Array.isArray(res) ? res : (res?.data ?? [])
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) {
      console.error('[MonthlyTrendWidget]', e)
    }
  } finally {
    loading.value = false
  }
}

const maxValue = computed(() => {
  if (!data.value.length) return 1
  const maxN = Math.max(...data.value.map((e) => e.completedNets))
  const maxP = Math.max(...data.value.map((e) => e.uniqueParticipants))
  return Math.max(maxN, maxP, 1)
})

const monthShort = (e: Entry) => t(`dashboard.months.${e.month}`).slice(0, 3)
const monthLabel = (e: Entry) => monthShort(e) + ' ' + e.year
const barHeight = (value: number) =>
  Math.max(2, (value / maxValue.value) * CHART_HEIGHT)
const tooltip = (e: Entry) =>
  `${monthLabel(e)}: ${e.completedNets} ${t('dashboard.stats.completedNets')}, ${e.uniqueParticipants} ${t('dashboard.stats.uniqueParticipants')}`

onMounted(fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.monthlyTrend')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data.length">
      <div class="space-y-3">
        <!-- Y-axis hint -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <div
            class="flex-shrink-0 flex flex-col justify-between text-[10px] text-muted-foreground py-0.5"
            style="width: 1.25rem"
          >
            <span>{{ maxValue }}</span>
            <span>0</span>
          </div>
          <!-- Chart -->
          <div class="flex gap-1.5 items-end flex-1 min-w-0" :style="{ height: CHART_HEIGHT + 'px' }">
            <div
              v-for="e in data"
              :key="e.year + '-' + e.monthIndex"
              class="flex-shrink-0 flex flex-col items-center gap-0.5 w-9"
              :title="tooltip(e)"
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
    </template>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
