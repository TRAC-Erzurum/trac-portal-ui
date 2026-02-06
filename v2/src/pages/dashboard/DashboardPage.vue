<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import CommunityModule from '@/components/dashboard/CommunityModule.vue'
import NetsModule from '@/components/dashboard/NetsModule.vue'
import PersonalStatsModule from '@/components/dashboard/PersonalStatsModule.vue'
import PersonalLastNetsWidget from '@/components/dashboard/widgets/PersonalLastNetsWidget.vue'
import PersonalTrendWidget from '@/components/dashboard/widgets/PersonalTrendWidget.vue'
import ActivitySummaryWidget from '@/components/dashboard/widgets/ActivitySummaryWidget.vue'
import BusiestTimeWidget from '@/components/dashboard/widgets/BusiestTimeWidget.vue'
import GeographyWidget from '@/components/dashboard/widgets/GeographyWidget.vue'
import MonthlyTrendWidget from '@/components/dashboard/widgets/MonthlyTrendWidget.vue'
import NetsAttendeesTrendWidget from '@/components/dashboard/widgets/NetsAttendeesTrendWidget.vue'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { api } from '@/lib/api'

interface ActiveNet {
  id: string
  name: string
  operatorCallSign: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
}

interface PendingNet {
  id: string
  name: string
  operatorCallSign: string
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

interface Activity {
  id: string
  type: string
  entityType: string
  entityId: string | null
  actorCallSign: string | null
  targetCallSign: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

const { t } = useI18n()
const authStore = useAuthStore()
const branchStore = useBranchStore()

const currentBranchId = computed(() => branchStore.currentBranch?.id ?? authStore.user?.currentBranchId ?? null)

const isLoadingActivity = ref(true)
const isLoadingMoreActivity = ref(false)
const isLoadingNets = ref(true)
const isLoadingCommunity = ref(true)
const isLoadingPersonal = ref(true)
const personalStats = ref<PersonalStats | PersonalNetStatsBranchAware | null>(null)
const communityStats = ref<CommunityStats | null>(null)

const activities = ref<Activity[]>([])
const hasMoreActivity = ref(true)
const activeNets = ref<ActiveNet[]>([])
const pendingNets = ref<PendingNet[]>([])
const recentNets = ref<ActiveNet[]>([])

const fetchActivity = async (append = false) => {
  if (append) isLoadingMoreActivity.value = true
  try {
    const limit = 3
    const offset = append ? activities.value.length : 0
    const data = await api.get<Activity[]>(`/v2/dashboard/activity?limit=${limit}&offset=${offset}`)
    if (append) activities.value = [...activities.value, ...data]
    else activities.value = data
    hasMoreActivity.value = data.length === limit
  } catch (e) {
    console.error('Failed to fetch activity:', e)
  } finally {
    isLoadingActivity.value = false
    isLoadingMoreActivity.value = false
  }
}

const loadMoreActivity = () => fetchActivity(true)

const fetchNets = async () => {
  try {
    isLoadingNets.value = true
    const [active, pending, recent] = await Promise.all([
      api.get<ActiveNet[]>('/v2/dashboard/nets/active'),
      api.get<PendingNet[]>('/v2/dashboard/nets/pending'),
      api.get<ActiveNet[]>('/v2/dashboard/nets/recent?limit=6'),
    ])
    activeNets.value = active
    pendingNets.value = pending
    recentNets.value = recent
  } catch (e) {
    console.error('Failed to fetch nets:', e)
  } finally {
    isLoadingNets.value = false
  }
}

const fetchPersonalStats = async () => {
  try {
    isLoadingPersonal.value = true
    const url = currentBranchId.value
      ? `/v2/dashboard/nets/personal?branchId=${currentBranchId.value}`
      : '/v2/dashboard/nets/personal'
    personalStats.value = await api.get<PersonalStats | PersonalNetStatsBranchAware>(url)
  } catch (e) {
    console.error('Failed to fetch personal stats:', e)
  } finally {
    isLoadingPersonal.value = false
  }
}

const communityPeriod = ref<'all' | '7d' | '30d'>('all')

const fetchCommunity = async () => {
  try {
    isLoadingCommunity.value = true
    communityStats.value = await api.get<CommunityStats>(
      `/v2/dashboard/community?period=${communityPeriod.value}`
    )
  } catch (e) {
    console.error('Failed to fetch community:', e)
  } finally {
    isLoadingCommunity.value = false
  }
}

watch(communityPeriod, () => {
  fetchCommunity()
})

watch(currentBranchId, () => {
  fetchPersonalStats()
})

onMounted(() => {
  fetchActivity()
  fetchNets()
  fetchPersonalStats()
  fetchCommunity()
})
</script>

<template>
  <AppLayout :title="t('nav.dashboard')">
    <!-- Top: Nets + Activity (unchanged) -->
    <div class="hidden xl:flex items-stretch gap-6">
      <div class="flex-1">
        <NetsModule
          :active-nets="activeNets"
          :pending-nets="pendingNets"
          :recent-nets="recentNets"
          :is-loading="isLoadingNets"
          :max-nets="6"
        />
      </div>
      <div class="w-px bg-zinc-200 dark:bg-zinc-800" />
      <div class="w-80 shrink-0">
        <ActivityFeed
          :activities="activities"
          :is-loading="isLoadingActivity"
          :has-more="hasMoreActivity"
          :is-loading-more="isLoadingMoreActivity"
          @load-more="loadMoreActivity"
        />
      </div>
    </div>

    <div class="xl:hidden">
      <NetsModule
        :active-nets="activeNets"
        :pending-nets="pendingNets"
        :recent-nets="recentNets"
        :is-loading="isLoadingNets"
        :max-nets="3"
      />
      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />
      <ActivityFeed
        :activities="activities"
        :is-loading="isLoadingActivity"
        :has-more="hasMoreActivity"
        :is-loading-more="isLoadingMoreActivity"
        @load-more="loadMoreActivity"
      />
    </div>

    <Separator class="my-8" />

    <!-- Benim & şubem: sayılar + son çevrimler + trend, şube seri liderleri -->
    <section class="mb-8" aria-labelledby="dashboard-section-me">
      <h2 id="dashboard-section-me" class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        {{ t('dashboard.sections.me') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PersonalStatsModule
          :stats="personalStats"
          :is-loading="isLoadingPersonal"
          :branch-name="branchStore.currentBranch?.name ?? null"
        />
        <PersonalLastNetsWidget />
        <PersonalTrendWidget :branch-id="currentBranchId" />
      </div>
    </section>

    <Separator class="my-8" />

    <!-- Topluluk: çevrim istatistikleri (zaman filtresi) → grafikler → il/ilçe → liderler -->
    <section class="mb-8" aria-labelledby="dashboard-section-community">
      <h2 id="dashboard-section-community" class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        {{ t('dashboard.sections.community') }}
      </h2>
      <div class="mb-6">
        <CommunityModule
          v-model:period="communityPeriod"
          :stats="communityStats"
          :is-loading="isLoadingCommunity"
          show-period-filter
        />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BusiestTimeWidget />
        <MonthlyTrendWidget />
      </div>
      <div class="mb-6">
        <NetsAttendeesTrendWidget />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <GeographyWidget />
        <ActivitySummaryWidget />
      </div>
    </section>
  </AppLayout>
</template>
