<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { TrendingUp } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

interface Entry {
  endedAt: string
  attendeeCount: number
  netName: string
}

const CHART_HEIGHT = 88

const props = withDefaults(
  defineProps<{
    /** Şube detay sayfasında branchId verilir */
    branchId?: string | null
  }>(),
  { branchId: null }
)

const { t } = useI18n()
const data = ref<Entry[]>([])
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const params = new URLSearchParams()
    params.set('limit', '30')
    if (props.branchId) params.set('branchId', props.branchId)
    const url = `/dashboard/stats/nets-attendees-trend?${params.toString()}`
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
watch(() => props.branchId, fetchData)

const maxCount = computed(() => {
  if (!data.value.length) return 1
  return Math.max(...data.value.map((e) => e.attendeeCount), 1)
})

const barHeight = (value: number) =>
  Math.max(2, (value / maxCount.value) * CHART_HEIGHT)

const tooltip = (e: Entry) =>
  `${e.netName}: ${e.attendeeCount} ${t('dashboard.stats.uniqueParticipants')}`
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.netsAttendeesTrend')"
    :loading="loading"
    :error="error"
    :icon="TrendingUp"
  >
    <template v-if="data.length">
      <div class="w-full">
        <div class="flex gap-2 overflow-x-auto pb-1 w-full">
          <div
            class="flex-shrink-0 flex flex-col justify-between text-[10px] text-muted-foreground py-0.5"
            style="width: 1.25rem"
          >
            <span>{{ maxCount }}</span>
            <span>0</span>
          </div>
          <div class="flex gap-1 items-end flex-1 min-w-0 w-full" :style="{ height: CHART_HEIGHT + 'px' }">
            <div
              v-for="(e, i) in data"
              :key="e.endedAt + String(i)"
              class="flex-1 min-w-0 flex flex-col items-center"
              :style="{ height: CHART_HEIGHT + 'px' }"
              :title="tooltip(e)"
            >
              <div class="flex-1 min-h-0 flex flex-col justify-end items-center gap-0.5">
                <span
                  v-if="e.attendeeCount > 0"
                  class="text-[10px] font-medium text-muted-foreground leading-none"
                >
                  {{ e.attendeeCount }}
                </span>
                <div
                  class="w-full max-w-[12px] rounded-t bg-primary/50 transition-all"
                  :style="{ height: barHeight(e.attendeeCount) + 'px', minHeight: e.attendeeCount > 0 ? '4px' : '0' }"
                />
              </div>
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
