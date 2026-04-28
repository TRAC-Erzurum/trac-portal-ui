<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'
import { utcCellToBrowserLocal, type UtcBusiestCell } from '@/lib/busiest-time'

interface Data {
  byDay: { dayOfWeek: number; count: number }[]
  byHour: { hour: number; count: number }[]
  cells: UtcBusiestCell[]
}

const { t } = useI18n()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const byHourLocal = computed(() => {
  const buckets = new Array(24).fill(0)
  for (const rawCell of data.value?.cells ?? []) {
    const c = utcCellToBrowserLocal(rawCell)
    if (!c) continue
    buckets[c.hour] += c.count
  }
  return buckets.map((count, hour) => ({ hour, count }))
})

const byDayLocal = computed(() => {
  const buckets = new Array(7).fill(0)
  for (const rawCell of data.value?.cells ?? []) {
    const c = utcCellToBrowserLocal(rawCell)
    if (!c) continue
    buckets[c.dayOfWeek] += c.count
  }
  return buckets.map((count, dayOfWeek) => ({ dayOfWeek, count }))
})

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    data.value = await api.get<Data>('/insights/stats/busiest-time')
  } catch (e) {
    error.value = true
    if (import.meta.env.DEV) {
      console.error('[BusiestTimeWidget]', e)
    }
  } finally {
    loading.value = false
  }
}

const maxDay = () =>
  byDayLocal.value.length
    ? Math.max(...byDayLocal.value.map((d) => d.count), 1)
    : 1
const maxHour = () =>
  byHourLocal.value.length
    ? Math.max(...byHourLocal.value.map((h) => h.count), 1)
    : 1
const hasData = () => {
  if (!data.value) return false
  const dayTotal = byDayLocal.value.reduce((s, d) => s + d.count, 0)
  const hourTotal = byHourLocal.value.reduce((s, h) => s + h.count, 0)
  return dayTotal > 0 || hourTotal > 0
}

onMounted(fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.busiestTime')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data">
      <p v-if="!hasData() && !loading" class="text-sm text-muted-foreground">
        {{ t('dashboard.noStats') }}
      </p>
      <div v-else class="space-y-4">
        <div>
          <p class="text-xs font-medium text-muted-foreground mb-2">{{ t('dashboard.stats.byDay') }}</p>
          <div class="flex gap-0.5 items-end h-12">
            <div
              v-for="d in byDayLocal"
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
              v-for="d in byDayLocal"
              :key="'l' + d.dayOfWeek"
              class="flex-1 text-[10px] text-center text-muted-foreground truncate"
            >
              {{ t('dashboard.stats.days.' + d.dayOfWeek) }}
            </span>
          </div>
        </div>
        <div>
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
        </div>
      </div>
    </template>
  </StatCard>
</template>
