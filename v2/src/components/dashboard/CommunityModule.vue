<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users, Radio, TrendingUp, ChevronRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { UserAvatar } from '@/components/ui/user-avatar'

interface LeaderboardEntry {
  rank: number
  callSign: string
  operatorId?: string
  netId?: string
  picture?: string | null
  value: number
  label: string
}

interface MonthlyStats {
  month: string
  year: number
  monthIndex: number
  netsCount: number
  totalAttendees: number
  uniqueParticipants: number
}

interface CommunityStats {
  totalUniqueParticipants: number
  totalCompletedNets: number
  monthlyStats: MonthlyStats[]
  topParticipants: LeaderboardEntry[]
  topNetManagers: LeaderboardEntry[]
  topNets: LeaderboardEntry[]
}

interface CommunityStatsBranchAware {
  branch: {
    totalNets: number
    topOperators: LeaderboardEntry[]
    topNets: LeaderboardEntry[]
  }
  global: CommunityStats
}

interface Props {
  stats: CommunityStats | CommunityStatsBranchAware | null
  isLoading?: boolean
  showMonthlyStats?: boolean
  showLeaderboards?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  showMonthlyStats: true,
  showLeaderboards: true,
})

const { t } = useI18n()
const router = useRouter()

const isBranchAware = computed(() => props.stats != null && 'branch' in props.stats)
const displayStats = computed(() => {
  if (!props.stats) return null
  return isBranchAware.value ? (props.stats as CommunityStatsBranchAware).global : (props.stats as CommunityStats)
})
const branchStats = computed(() =>
  isBranchAware.value && props.stats && 'branch' in props.stats
    ? (props.stats as CommunityStatsBranchAware).branch
    : null
)

const getRankClass = (rank: number) => {
  switch (rank) {
    case 1:
      return 'text-amber-400'
    case 2:
      return 'text-slate-400'
    case 3:
      return 'text-amber-700 dark:text-amber-600'
    default:
      return 'text-muted-foreground'
  }
}

const getMonthName = (month: string) => {
  return t(`dashboard.months.${month}`)
}

const goToOperator = (operatorId?: string) => {
  if (operatorId) {
    router.push(`/operators/${operatorId}`)
  }
}

const goToNet = (netId?: string) => {
  if (netId) {
    router.push(`/nets/${netId}`)
  }
}

const goToOperators = () => {
  router.push('/operators')
}

const goToNets = () => {
  router.push('/nets')
}

</script>

<template>
  <section>
    <h3 v-if="showMonthlyStats || branchStats" class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
      <TrendingUp class="h-4 w-4" />
      {{ branchStats ? t('dashboard.branchStats') : t('dashboard.last3Months') }}
    </h3>

    <div v-if="isLoading && showMonthlyStats" class="grid grid-cols-3 gap-3">
      <div v-for="i in 3" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
        <div class="h-4 w-16 bg-muted animate-pulse rounded" />
        <div class="h-8 w-12 bg-muted animate-pulse rounded" />
        <div class="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
    </div>

    <template v-else-if="branchStats">
      <div class="mb-6">
        <div class="grid grid-cols-1 gap-3 mb-4">
          <button
            @click="goToNets"
            class="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-center group"
          >
            <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
              <Radio class="h-5 w-5 text-muted-foreground" />
              {{ branchStats.totalNets }}
            </div>
            <p class="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{{ t('dashboard.totalNets') }}</p>
          </button>
        </div>
        <div class="flex flex-col lg:flex-row gap-6">
          <div class="flex-1">
            <p class="text-sm font-medium text-muted-foreground mb-3">{{ t('dashboard.topNetManagers') }}</p>
            <div class="space-y-1">
              <button
                v-for="entry in branchStats.topOperators"
                :key="entry.rank"
                @click="goToOperator(entry.operatorId)"
                class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span class="w-5 font-bold flex-shrink-0" :class="getRankClass(entry.rank)">{{ entry.rank }}.</span>
                <UserAvatar :picture="entry.picture" class="h-6 w-6 flex-shrink-0" />
                <span class="flex-1 truncate font-medium text-left">{{ entry.callSign }}</span>
                <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
                <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium text-muted-foreground mb-3">{{ t('dashboard.topNets') }}</p>
            <div class="space-y-1">
              <button
                v-for="entry in branchStats.topNets"
                :key="entry.rank"
                @click="goToNet(entry.netId)"
                class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span class="w-5 font-bold" :class="getRankClass(entry.rank)">{{ entry.rank }}.</span>
                <span class="flex-1 truncate text-left">{{ entry.callSign }}</span>
                <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
                <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">{{ t('dashboard.globalStats') }}</h3>
    </template>

    <template v-if="displayStats">
      <div v-if="showMonthlyStats && displayStats.monthlyStats.length > 0" class="mb-6">
        <div class="grid grid-cols-3 gap-3">
          <div 
            v-for="month in displayStats.monthlyStats" 
            :key="`${month.year}-${month.monthIndex}`"
            class="p-4 rounded-lg border border-border/50 text-center"
          >
            <p class="text-xs text-muted-foreground mb-1">{{ getMonthName(month.month) }}</p>
            <p class="text-2xl font-bold">{{ month.netsCount }}</p>
            <p class="text-xs text-muted-foreground">{{ t('dashboard.netsLabel') }}</p>
            <p class="text-sm text-muted-foreground mt-1">
              {{ month.uniqueParticipants }} {{ t('dashboard.participantsLabel') }}
            </p>
          </div>
        </div>
      </div>

      <template v-if="showLeaderboards">
        <div v-if="showMonthlyStats" class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

        <div class="flex flex-col lg:flex-row gap-6 mb-6">
          <div class="flex-1">
            <p class="text-sm font-medium text-muted-foreground mb-3">
              {{ t('dashboard.topParticipants') }}
            </p>
            <div class="space-y-1">
              <button
                v-for="entry in displayStats.topParticipants"
                :key="entry.rank"
                @click="goToOperator(entry.operatorId)"
                class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span 
                  class="w-5 font-bold flex-shrink-0" 
                  :class="getRankClass(entry.rank)"
                >
                  {{ entry.rank }}.
                </span>
                <UserAvatar :picture="entry.picture" class="h-6 w-6 flex-shrink-0" />
                <span class="flex-1 truncate font-medium text-left">{{ entry.callSign }}</span>
                <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
                <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div class="hidden lg:block w-px bg-zinc-200 dark:bg-zinc-800" />
          <div class="lg:hidden h-px bg-zinc-200 dark:bg-zinc-800" />

          <div class="flex-1">
            <p class="text-sm font-medium text-muted-foreground mb-3">
              {{ t('dashboard.topNetManagers') }}
            </p>
            <div class="space-y-1">
              <button
                v-for="entry in displayStats.topNetManagers"
                :key="entry.rank"
                @click="goToOperator(entry.operatorId)"
                class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span 
                  class="w-5 font-bold flex-shrink-0" 
                  :class="getRankClass(entry.rank)"
                >
                  {{ entry.rank }}.
                </span>
                <UserAvatar :picture="entry.picture" class="h-6 w-6 flex-shrink-0" />
                <span class="flex-1 truncate font-medium text-left">{{ entry.callSign }}</span>
                <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
                <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div class="hidden lg:block w-px bg-zinc-200 dark:bg-zinc-800" />
          <div class="lg:hidden h-px bg-zinc-200 dark:bg-zinc-800" />

          <div class="flex-1">
            <p class="text-sm font-medium text-muted-foreground mb-3">
              {{ t('dashboard.topNets') }}
            </p>
            <div class="space-y-1">
              <button
                v-for="entry in displayStats.topNets"
                :key="entry.rank"
                @click="goToNet(entry.netId)"
                class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <span 
                  class="w-5 font-bold" 
                  :class="getRankClass(entry.rank)"
                >
                  {{ entry.rank }}.
                </span>
                <span class="flex-1 truncate text-left">{{ entry.callSign }}</span>
                <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
                <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>

        <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

        <div class="grid grid-cols-2 gap-3">
          <button
            @click="goToOperators"
            class="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-center group"
          >
            <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
              <Users class="h-5 w-5 text-muted-foreground" />
              {{ displayStats.totalUniqueParticipants }}
            </div>
            <p class="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{{ t('dashboard.totalParticipants') }}</p>
          </button>
          <button
            @click="goToNets"
            class="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-center group"
          >
            <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
              <Radio class="h-5 w-5 text-muted-foreground" />
              {{ displayStats.totalCompletedNets }}
            </div>
            <p class="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{{ t('dashboard.totalNets') }}</p>
          </button>
        </div>
      </template>
    </template>
  </section>
</template>
