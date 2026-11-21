<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarChart3, Radio, TrendingUp, Users } from 'lucide-vue-next'
import DashboardWidget from './DashboardWidget.vue'
import { api } from '@/lib/api'

interface PersonalStats {
  attendedNets: number
  managedNets: number
  streak: number
}

interface PersonalStatsBranchAware {
  branch: PersonalStats
  global: PersonalStats
}

const { t } = useI18n()

const isLoading = ref(true)
const stats = ref<PersonalStats>({ attendedNets: 0, managedNets: 0, streak: 0 })

async function fetchStats() {
  isLoading.value = true
  try {
    const data = await api.get<PersonalStats | PersonalStatsBranchAware>('/dashboard/nets/personal')
    stats.value = 'global' in data ? data.global : data
  } catch (e) {
    console.error('Failed to fetch personal stats:', e)
    stats.value = { attendedNets: 0, managedNets: 0, streak: 0 }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void fetchStats()
})
</script>

<template>
  <DashboardWidget :icon="BarChart3" :title="t('dashboard.yourStats')"
    :action="{ to: '/insights', text: t('dashboard.statisticsButton') }">
    <div class="h-full flex items-center p-3">
      <div v-if="isLoading" class="w-full grid grid-cols-3 gap-2 sm:gap-3">
        <div v-for="i in 3" :key="i" class="p-3 rounded-lg border border-border/50 bg-background space-y-2">
          <div class="h-7 w-10 bg-muted animate-pulse rounded mx-auto" />
          <div class="h-3 w-14 bg-muted animate-pulse rounded mx-auto" />
        </div>
      </div>
      <div v-else class="w-full grid grid-cols-3 gap-2 sm:gap-3">
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <Users class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            {{ stats.attendedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attendedNetsLabel') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <Radio class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            {{ stats.managedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managedNetsLabel') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <TrendingUp class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            {{ stats.streak }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.streak') }}</p>
        </div>
      </div>
    </div>
  </DashboardWidget>
</template>
