<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

interface Data {
  countries: { country: string; count: number }[]
  cities: { city: string; count: number }[]
  districts: { city: string; district: string; count: number }[]
}

const DashboardGeographyMap = defineAsyncComponent(
  () => import('./DashboardGeographyMap.vue')
)

const { t } = useI18n()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)
const activeTab = ref<'countries' | 'cities' | 'districts'>('cities')

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    data.value = await api.get<Data>('/dashboard/stats/geography')
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const maxCountryCount = () =>
  data.value?.countries?.length ? Math.max(...data.value.countries.map((c) => c.count)) : 1
const maxCityCount = () =>
  data.value?.cities?.length ? Math.max(...data.value.cities.map((c) => c.count)) : 1
const maxDistrictCount = () =>
  data.value?.districts?.length ? Math.max(...data.value.districts.map((d) => d.count)) : 1

onMounted(fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.geography')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Sol: grafik (ülke/il/ilçe sekmeleri + çubuklar) -->
        <div class="flex-1 min-w-0 lg:max-w-[50%]">
          <div class="flex flex-wrap gap-1 mb-3">
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border transition-colors"
              :class="activeTab === 'countries' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
              @click="activeTab = 'countries'"
            >
              {{ t('dashboard.stats.countries') }}
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border transition-colors"
              :class="activeTab === 'cities' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
              @click="activeTab = 'cities'"
            >
              {{ t('dashboard.stats.cities') }}
            </button>
            <button
              type="button"
              class="px-2 py-1 text-xs rounded border transition-colors"
              :class="activeTab === 'districts' ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
              @click="activeTab = 'districts'"
            >
              {{ t('dashboard.stats.districts') }}
            </button>
          </div>
          <div v-if="activeTab === 'countries'" class="space-y-1.5 max-h-64 overflow-y-auto">
            <div
              v-for="(c, i) in (data.countries || []).slice(0, 20)"
              :key="c.country"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between gap-2">
                  <span class="font-medium truncate">{{ c.country }}</span>
                  <span class="text-sm text-muted-foreground shrink-0">{{ c.count }}</span>
                </div>
                <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary/30"
                    :style="{ width: `${(c.count / maxCountryCount()) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="activeTab === 'cities'" class="space-y-1.5 max-h-64 overflow-y-auto">
            <div
              v-for="(c, i) in data.cities.slice(0, 20)"
              :key="c.city"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between gap-2">
                  <span class="font-medium truncate">{{ c.city }}</span>
                  <span class="text-sm text-muted-foreground shrink-0">{{ c.count }}</span>
                </div>
                <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary/30"
                    :style="{ width: `${(c.count / maxCityCount()) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="space-y-1.5 max-h-64 overflow-y-auto">
            <div
              v-for="(d, i) in data.districts.slice(0, 20)"
              :key="d.city + '-' + d.district"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-muted-foreground w-5">{{ i + 1 }}.</span>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between gap-2">
                  <span class="truncate text-sm">{{ d.city }} / {{ d.district }}</span>
                  <span class="text-sm text-muted-foreground shrink-0">{{ d.count }}</span>
                </div>
                <div class="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary/30"
                    :style="{ width: `${(d.count / maxDistrictCount()) * 100}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <p v-if="(data.countries?.length ?? 0) === 0 && (data.cities?.length ?? 0) === 0 && (data.districts?.length ?? 0) === 0" class="text-sm text-muted-foreground">
            {{ t('dashboard.noStats') }}
          </p>
        </div>
        <!-- Sağ: harita (async yüklenir) -->
        <div class="flex-1 min-h-[200px] lg:min-h-[240px] flex flex-col">
          <Suspense>
            <DashboardGeographyMap :data="data" />
            <template #fallback>
              <div class="rounded-lg border border-border/50 flex-1 min-h-[200px] lg:min-h-[240px] flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                {{ t('netDetail.mapLoading') }}
              </div>
            </template>
          </Suspense>
        </div>
      </div>
    </template>
  </StatCard>
</template>
