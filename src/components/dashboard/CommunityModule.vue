<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarChart3, ChevronRight, Mic2, Radio, Star, TrendingUp, Users } from 'lucide-vue-next'
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
  totalAttendees?: number
  monthlyStats: MonthlyStats[]
  topParticipants: LeaderboardEntry[]
  topNetManagers: LeaderboardEntry[]
  topNets: LeaderboardEntry[]
}

interface CommunityStatsBranchAware {
  branch: {
    totalNets: number
    totalAttendees?: number
    totalUniqueParticipants?: number
    topOperators: LeaderboardEntry[]
    topNets: LeaderboardEntry[]
    topParticipants: LeaderboardEntry[]
  }
  global: CommunityStats
}

type Period = 'all' | '7d' | '30d'

interface Props {
  stats: CommunityStats | CommunityStatsBranchAware | null
  /** Şube seçiliyken kart başlığı: "[Şube adı] İstatistikleri" */
  branchName?: string | null
  isLoading?: boolean
  /** Son 3 ay kartları (MonthlyTrendWidget ile tekrar etmesin diye dashboard'da false) */
  showMonthlyStats?: boolean
  /** Toplam katılımcı/çevrim butonları (ParticipationWidget ile tekrar etmesin diye dashboard'da false) */
  showTotals?: boolean
  showLeaderboards?: boolean
  /** Şube kartından sonra "Genel" bölümünü göster (şube detay sayfasında false) */
  showGlobalSection?: boolean
  /** Zaman filtresi (7 gün, 30 gün, tümü) göster */
  showPeriodFilter?: boolean
  /** Zaman filtresi değeri (v-model:period ile kullanılır) */
  period?: Period
}

const props = withDefaults(defineProps<Props & { flat?: boolean }>(), {
  isLoading: false,
  showMonthlyStats: false,
  showTotals: false,
  showLeaderboards: true,
  showGlobalSection: true,
  showPeriodFilter: false,
  flat: false,
  period: 'all',
})

const emit = defineEmits<{
  'update:period': [value: Period]
}>()

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

/** Tek widget: şube veya genel verisiyle aynı görünüm (başlık + 4 özet + 3 liste) */
const effectiveBlock = computed(() => {
  if (props.isLoading) return null
  if (branchStats.value) {
    const b = branchStats.value
    const completedNets = b.totalNets
    const totalAttendees = b.totalAttendees ?? 0
    const uniqueParticipants = b.totalUniqueParticipants ?? 0
    return {
      title: t('dashboard.netStatsTitle'),
      completedNets,
      totalAttendees,
      uniqueParticipants,
      avgPerNet: completedNets ? Math.round((totalAttendees / completedNets) * 10) / 10 : 0,
      topManagers: b.topOperators,
      topNets: b.topNets,
      topParticipants: b.topParticipants,
    }
  }
  if (displayStats.value && (props.showGlobalSection || !branchStats.value)) {
    const d = displayStats.value
    const completedNets = d.totalCompletedNets
    const totalAttendees = d.totalAttendees ?? 0
    const uniqueParticipants = d.totalUniqueParticipants
    return {
      title: t('dashboard.netStatsTitle'),
      completedNets,
      totalAttendees,
      uniqueParticipants,
      avgPerNet: completedNets ? Math.round((totalAttendees / completedNets) * 10) / 10 : 0,
      topManagers: d.topNetManagers,
      topNets: d.topNets,
      topParticipants: d.topParticipants,
    }
  }
  return null
})

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

const periodLabel = (p: Period) => {
  switch (p) {
    case 'all':
      return t('dashboard.stats.periodAll')
    case '7d':
      return t('dashboard.stats.period7d')
    case '30d':
      return t('dashboard.stats.period30d')
    default:
      return p
  }
}

const periods: Period[] = ['all', '30d', '7d']

const setPeriod = (p: Period) => {
  emit('update:period', p)
}

</script>

<template>
  <component :is="props.flat ? 'div' : 'section'" :class="props.flat ? '' : 'rounded-lg border border-border/50 bg-background p-4'">
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div v-for="i in 4" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
        <div class="h-4 w-16 bg-muted animate-pulse rounded" />
        <div class="h-8 w-12 bg-muted animate-pulse rounded" />
      </div>
    </div>

    <template v-else-if="effectiveBlock">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp class="h-4 w-4" />
          {{ effectiveBlock.title }}
        </h3>
        <div v-if="showPeriodFilter" class="flex gap-1">
          <button
            v-for="p in periods"
            :key="p"
            type="button"
            class="px-2 py-1 text-xs rounded-md border transition-colors"
            :class="period === p ? 'border-primary text-primary' : 'border-border hover:bg-muted/30'"
            @click="setPeriod(p)"
          >
            {{ periodLabel(p) }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button
          @click="goToNets"
          class="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-center group"
        >
          <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
            <Radio class="h-5 w-5 text-muted-foreground" />
            {{ effectiveBlock.completedNets }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{{ t('dashboard.totalNets') }}</p>
        </button>
        <button
          @click="goToOperators"
          class="p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-center group"
        >
          <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
            <Users class="h-5 w-5 text-muted-foreground" />
            {{ effectiveBlock.totalAttendees }}
          </div>
          <p class="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{{ t('dashboard.totalParticipants') }}</p>
        </button>
        <div class="p-4 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
            <Users class="h-5 w-5 text-muted-foreground" />
            {{ effectiveBlock.uniqueParticipants }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.uniqueParticipantsSummary') }}</p>
        </div>
        <div class="p-4 rounded-lg border border-border/50 text-center">
          <div class="flex items-center justify-center gap-1.5 text-2xl font-bold">
            <BarChart3 class="h-5 w-5 text-muted-foreground" />
            {{ effectiveBlock.avgPerNet }}
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.avgParticipantsPerNet') }}</p>
        </div>
      </div>

      <div v-if="showLeaderboards" class="flex flex-col lg:flex-row gap-6">
        <div class="flex-1">
          <p class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
            <Users class="h-4 w-4" />
            {{ t('dashboard.topParticipants') }}
          </p>
          <div class="space-y-1">
            <button
              v-for="entry in effectiveBlock.topParticipants"
              :key="entry.rank"
              @click="goToOperator(entry.operatorId)"
              class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group min-h-10"
            >
              <span class="w-5 font-bold flex-shrink-0" :class="getRankClass(entry.rank)">{{ entry.rank }}.</span>
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
          <p class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
            <Mic2 class="h-4 w-4" />
            {{ t('dashboard.topNetManagers') }}
          </p>
          <div class="space-y-1">
            <button
              v-for="entry in effectiveBlock.topManagers"
              :key="entry.rank"
              @click="goToOperator(entry.operatorId)"
              class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group min-h-10"
            >
              <span class="w-5 font-bold flex-shrink-0" :class="getRankClass(entry.rank)">{{ entry.rank }}.</span>
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
          <p class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
            <Star class="h-4 w-4" />
            {{ t('dashboard.topNets') }}
          </p>
          <div class="space-y-1">
            <button
              v-for="entry in effectiveBlock.topNets"
              :key="entry.rank"
              @click="goToNet(entry.netId)"
              class="w-full flex items-center gap-2 text-sm p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors group min-h-10"
            >
              <span class="w-5 font-bold" :class="getRankClass(entry.rank)">{{ entry.rank }}.</span>
              <span class="flex-1 truncate text-left">{{ entry.callSign }}</span>
              <span class="text-muted-foreground text-xs">{{ entry.value }}</span>
              <ChevronRight class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </template>
  </component>
</template>
