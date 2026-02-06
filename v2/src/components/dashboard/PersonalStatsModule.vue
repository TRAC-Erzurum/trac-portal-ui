<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users, Radio, TrendingUp } from 'lucide-vue-next'

interface PersonalStats {
  attendedNets: number
  managedNets: number
  streak: number
  averageReadability: number
  averageSignal: number
}

interface PersonalNetStatsBranchAware {
  branch: {
    participatedNets: number
    managedNets: number
    currentStreak: number
  }
  global: {
    totalParticipatedNets: number
    totalManagedNets: number
    longestStreak: number
  }
}

interface Props {
  stats: PersonalStats | PersonalNetStatsBranchAware | null
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const { t } = useI18n()

const isBranchAware = computed(() => props.stats != null && 'branch' in props.stats)

const hasStats = computed(() => {
  if (!props.stats) return false
  if (isBranchAware.value) {
    const s = props.stats as PersonalNetStatsBranchAware
    return (
      s.branch.participatedNets > 0 ||
      s.branch.managedNets > 0 ||
      s.branch.currentStreak > 0 ||
      s.global.totalParticipatedNets > 0 ||
      s.global.totalManagedNets > 0 ||
      s.global.longestStreak > 0
    )
  }
  const s = props.stats as PersonalStats
  return s.attendedNets > 0 || s.managedNets > 0 || s.streak > 0
})
</script>

<template>
  <section>
    <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
      <TrendingUp class="h-4 w-4" />
      {{ isBranchAware ? t('dashboard.personalStatsBranch') : t('dashboard.yourStats') }}
    </h3>

    <div v-if="isLoading" class="grid grid-cols-3 gap-3">
      <div v-for="i in 3" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
        <div class="h-8 w-12 bg-muted animate-pulse rounded mx-auto" />
        <div class="h-4 w-16 bg-muted animate-pulse rounded mx-auto" />
      </div>
    </div>

    <template v-else-if="hasStats">
      <div v-if="isBranchAware" class="space-y-6">
        <div>
          <p class="text-xs text-muted-foreground mb-2">{{ t('dashboard.branchStats') }}</p>
          <div class="grid grid-cols-3 gap-3">
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).branch.participatedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attended') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Radio class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).branch.managedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managed') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).branch.currentStreak }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.streak') }}</p>
            </div>
          </div>
        </div>
        <div>
          <p class="text-xs text-muted-foreground mb-2">{{ t('dashboard.globalStats') }}</p>
          <div class="grid grid-cols-3 gap-3">
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).global.totalParticipatedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attended') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Radio class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).global.totalManagedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managed') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp class="h-5 w-5 text-muted-foreground" />
                {{ (stats as PersonalNetStatsBranchAware).global.longestStreak }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.streak') }}</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="grid grid-cols-3 gap-3">
        <div class="p-4 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-2xl font-bold">
            <Users class="h-5 w-5 text-muted-foreground" />
            {{ (stats as PersonalStats).attendedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attended') }}</p>
        </div>
        <div class="p-4 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-2xl font-bold">
            <Radio class="h-5 w-5 text-muted-foreground" />
            {{ (stats as PersonalStats).managedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managed') }}</p>
        </div>
        <div class="p-4 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1 text-2xl font-bold">
            <TrendingUp class="h-5 w-5 text-muted-foreground" />
            {{ (stats as PersonalStats).streak }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.streak') }}</p>
        </div>
      </div>
    </template>

    <div v-else class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noStats') }}
    </div>
  </section>
</template>
