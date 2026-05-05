<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PersonalStatsModule from '@/components/dashboard/PersonalStatsModule.vue'
import CommunityModule from '@/components/dashboard/CommunityModule.vue'
import PersonalLastNetsWidget from '@/components/dashboard/widgets/PersonalLastNetsWidget.vue'
import PersonalTrendWidget from '@/components/dashboard/widgets/PersonalTrendWidget.vue'
import ParticipationWidget from '@/components/dashboard/widgets/ParticipationWidget.vue'
import MonthlyNetsCard from '@/components/dashboard/widgets/MonthlyNetsCard.vue'
import MonthlyParticipantsCard from '@/components/dashboard/widgets/MonthlyParticipantsCard.vue'
import NetsAttendeesTrendWidget from '@/components/dashboard/widgets/NetsAttendeesTrendWidget.vue'
import BusiestHeatmapCard from '@/components/dashboard/widgets/BusiestHeatmapCard.vue'
import GeographyWidget from '@/components/dashboard/widgets/GeographyWidget.vue'
import TopStreakWidget from '@/components/dashboard/widgets/TopStreakWidget.vue'
import { api } from '@/lib/api'
import { type StatsScope } from '@/composables/useStatsScope'

interface BranchOption {
  id: string
  name: string
}

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

interface LeaderboardEntry {
  rank: number
  callSign: string
  operatorId?: string
  netId?: string
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

type FilterValue = 'my-branches' | 'all' | `branch:${string}`

const { t } = useI18n()
const availableBranches = ref<BranchOption[]>([])
const isLoadingBranches = ref(true)
const filterValue = ref<FilterValue>('all')
const communityPeriod = ref<'all' | '7d' | '30d'>('all')
const personalStats = ref<PersonalStats | PersonalNetStatsBranchAware | null>(null)
const communityStats = ref<CommunityStats | CommunityStatsBranchAware | null>(null)
const isLoadingPersonal = ref(true)
const isLoadingCommunity = ref(true)

const currentScope = computed<StatsScope>(() => {
  if (filterValue.value === 'all') return 'all'
  if (filterValue.value === 'my-branches') return 'my-branches'
  return 'branch'
})

const currentBranchId = computed(() => {
  if (!filterValue.value.startsWith('branch:')) return null
  return filterValue.value.slice('branch:'.length) || null
})

const loadBranches = async () => {
  try {
    isLoadingBranches.value = true
    const response = await api.get<Array<{ branch: BranchOption }>>('/users/me/branches')
    availableBranches.value = response
      .map((item) => item.branch)
      .filter((branch): branch is BranchOption => !!branch?.id && !!branch?.name)
  } catch (error) {
    console.error('Failed to load branches:', error)
    availableBranches.value = []
  } finally {
    isLoadingBranches.value = false
  }
}

const branchOptions = computed(() => [
  { label: t('nets.branchFilterMyBranches'), value: 'my-branches' as const },
  { label: t('nets.branchFilterAll'), value: 'all' as const },
  ...availableBranches.value.map((branch) => ({
    label: branch.name,
    value: `branch:${branch.id}` as const,
  })),
])

const fetchPersonalStats = async () => {
  try {
    isLoadingPersonal.value = true
    const query = currentScope.value === 'branch'
      ? currentBranchId.value
        ? `branchId=${currentBranchId.value}`
        : 'branchFilter=my-branches'
      : `branchFilter=${currentScope.value}`
    personalStats.value = await api.get<PersonalStats | PersonalNetStatsBranchAware>(
      `/insights/nets/personal?${query}`,
    )
  } catch (error) {
    console.error('Failed to load personal stats:', error)
    personalStats.value = null
  } finally {
    isLoadingPersonal.value = false
  }
}

const fetchCommunityStats = async () => {
  try {
    isLoadingCommunity.value = true
    const query = new URLSearchParams()
    query.set('period', communityPeriod.value)
    if (currentScope.value === 'branch' && currentBranchId.value) {
      query.set('branchId', currentBranchId.value)
    } else {
      query.set('branchFilter', currentScope.value)
    }
    communityStats.value = await api.get<CommunityStats | CommunityStatsBranchAware>(
      `/insights/community?${query.toString()}`,
    )
  } catch (error) {
    console.error('Failed to load community stats:', error)
    communityStats.value = null
  } finally {
    isLoadingCommunity.value = false
  }
}

onMounted(async () => {
  await loadBranches()
  await Promise.all([fetchPersonalStats(), fetchCommunityStats()])
})

watch([currentScope, currentBranchId], () => {
  fetchPersonalStats()
  fetchCommunityStats()
})

watch(communityPeriod, fetchCommunityStats)
</script>

<template>
  <AppLayout :title="t('nav.insights')">
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div v-if="false" class="w-full sm:w-[20rem]">
          <Select v-model="filterValue" :disabled="isLoadingBranches">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('nets.branchFilter')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in branchOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <section aria-labelledby="insights-summary" class="space-y-4">
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PersonalStatsModule :stats="personalStats" :is-loading="isLoadingPersonal" />
          <PersonalLastNetsWidget :scope="currentScope" :branch-id="currentBranchId" />
          <PersonalTrendWidget :scope="currentScope" :branch-id="currentBranchId" />
        </div>
        <CommunityModule
          v-model:period="communityPeriod"
          :stats="communityStats"
          :is-loading="isLoadingCommunity"
          :show-monthly-stats="false"
          :show-totals="true"
          :show-leaderboards="true"
          :show-global-section="true"
          :show-period-filter="true"
          :flat="true"
        />
      </section>

      <section aria-labelledby="insights-charts" class="space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MonthlyNetsCard :scope="currentScope" :branch-id="currentBranchId" />
          <MonthlyParticipantsCard :scope="currentScope" :branch-id="currentBranchId" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ParticipationWidget :scope="currentScope" :branch-id="currentBranchId" />
          <TopStreakWidget :scope="currentScope" :branch-id="currentBranchId" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NetsAttendeesTrendWidget :scope="currentScope" :branch-id="currentBranchId" />
          <BusiestHeatmapCard :scope="currentScope" :branch-id="currentBranchId" />
        </div>
      </section>

      <section aria-labelledby="insights-map" class="space-y-4">
        <h3 id="insights-map" class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {{ t('dashboard.stats.geography') }}
        </h3>
        <GeographyWidget :scope="currentScope" :branch-id="currentBranchId" />
      </section>
    </div>
  </AppLayout>
</template>