<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Radio, TrendingUp, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface PersonalStats {
  attendedNets: number
  managedNets: number
  streak: number
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
  branchName?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  branchName: null,
})

const { t } = useI18n()

const isBranchAware = computed(() => props.stats != null && 'branch' in props.stats)
const scopeBranchLabel = computed(() => {
  const name = props.branchName?.trim()
  return name?.length ? name : t('dashboard.statsScopeBranch')
})

/** 'branch' | 'all' — yalnızca branch-aware modda kullanılır */
const statsScope = ref<'branch' | 'all'>('branch')

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

const displayTriple = computed(() => {
  if (!props.stats) return { attended: 0, managed: 0, streak: 0 }
  if (isBranchAware.value) {
    const s = props.stats as PersonalNetStatsBranchAware
    if (statsScope.value === 'branch') {
      return {
        attended: s.branch.participatedNets,
        managed: s.branch.managedNets,
        streak: s.branch.currentStreak,
      }
    }
    return {
      attended: s.global.totalParticipatedNets,
      managed: s.global.totalManagedNets,
      streak: s.global.longestStreak,
    }
  }
  const s = props.stats as PersonalStats
  return { attended: s.attendedNets, managed: s.managedNets, streak: s.streak }
})
</script>

<template>
  <section class="rounded-lg border border-border/50 bg-background p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <TrendingUp class="h-4 w-4" />
        {{ t('dashboard.yourStats') }}
      </h3>
      <div
        v-if="isBranchAware && hasStats && !isLoading"
        class="flex items-center gap-1 shrink-0"
        role="group"
        :aria-label="t('dashboard.statsScopeGroup')"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="statsScope === 'branch' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="statsScope === 'branch'"
          @click="statsScope = 'branch'"
        >
          {{ scopeBranchLabel }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="statsScope === 'all' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="statsScope === 'all'"
          @click="statsScope = 'all'"
        >
          {{ t('dashboard.statsScopeAll') }}
        </Button>
      </div>
    </div>

    <div v-if="isLoading" class="grid grid-cols-3 gap-2 sm:gap-3">
      <div v-for="i in 3" :key="i" class="p-3 rounded-lg border border-border/50 bg-background space-y-2">
        <div class="h-7 w-10 bg-muted animate-pulse rounded mx-auto" />
        <div class="h-3 w-14 bg-muted animate-pulse rounded mx-auto" />
      </div>
    </div>

    <template v-else-if="hasStats">
      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <Users class="h-4 w-4 text-muted-foreground shrink-0" />
            {{ displayTriple.attended }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attended') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <Radio class="h-4 w-4 text-muted-foreground shrink-0" />
            {{ displayTriple.managed }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managed') }}</p>
        </div>
        <div class="p-3 rounded-lg border border-border/50 bg-background text-center">
          <div class="flex items-center justify-center gap-1 text-xl font-bold">
            <TrendingUp class="h-4 w-4 text-muted-foreground shrink-0" />
            {{ displayTriple.streak }}
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
