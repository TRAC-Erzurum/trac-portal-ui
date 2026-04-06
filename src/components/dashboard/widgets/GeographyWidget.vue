<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import StatCard from '../StatCard.vue'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type GeographyCountMode = 'total' | 'unique'

interface Data {
  countries: { country: string; count: number; iso2?: string }[]
  cities: { city: string; count: number; lat?: number; lng?: number }[]
  districts: { city: string; district: string; count: number }[]
}

const DashboardGeographyMap = defineAsyncComponent(
  () => import('./DashboardGeographyMap.vue')
)

const { t } = useI18n()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)
const countMode = ref<GeographyCountMode>('unique')

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const params = new URLSearchParams()
    params.set('mode', countMode.value)
    data.value = await api.get<Data>(
      `/dashboard/stats/geography?${params.toString()}`,
    )
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(countMode, fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.geography')"
    :loading="loading"
    :error="error"
  >
    <template #actions>
      <div class="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="countMode === 'unique' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="countMode === 'unique'"
          @click="countMode = 'unique'"
        >
          {{ t('dashboard.stats.geographyUniqueParticipation') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="countMode === 'total' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="countMode === 'total'"
          @click="countMode = 'total'"
        >
          {{ t('dashboard.stats.geographyTotalParticipation') }}
        </Button>
      </div>
    </template>
    <template v-if="data">
      <p
        v-if="(data.countries?.length ?? 0) === 0 && (data.cities?.length ?? 0) === 0 && (data.districts?.length ?? 0) === 0"
        class="text-sm text-muted-foreground mb-4"
      >
        {{ t('dashboard.noStats') }}
      </p>

      <Suspense>
        <DashboardGeographyMap :data="data" :mode="countMode" />
        <template #fallback>
          <div
            class="rounded-lg border border-border/50 w-full min-h-[360px] flex items-center justify-center bg-muted/30 text-sm text-muted-foreground"
          >
            {{ t('netDetail.mapLoading') }}
          </div>
        </template>
      </Suspense>
    </template>
  </StatCard>
</template>
