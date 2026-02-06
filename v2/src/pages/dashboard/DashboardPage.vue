<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import CommunityModule from '@/components/dashboard/CommunityModule.vue'
import NetsModule from '@/components/dashboard/NetsModule.vue'
import PersonalStatsModule from '@/components/dashboard/PersonalStatsModule.vue'
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

const activities = ref<Activity[]>([])
const activityPage = ref(1)
const hasMoreActivity = ref(true)
const activeNets = ref<ActiveNet[]>([])
const pendingNets = ref<PendingNet[]>([])
const recentNets = ref<ActiveNet[]>([])
const personalStats = ref<PersonalStats | PersonalNetStatsBranchAware | null>(null)
const communityStats = ref<CommunityStats | CommunityStatsBranchAware | null>(null)

const fetchActivity = async (append = false) => {
  if (append) {
    isLoadingMoreActivity.value = true
  }
  try {
    const limit = 3
    const offset = append ? activities.value.length : 0
    const data = await api.get<Activity[]>(`/v2/dashboard/activity?limit=${limit}&offset=${offset}`)
    
    if (append) {
      activities.value = [...activities.value, ...data]
    } else {
      activities.value = data
    }
    
    hasMoreActivity.value = data.length === limit
  } catch (error) {
    console.error('Failed to fetch activity:', error)
  } finally {
    isLoadingActivity.value = false
    isLoadingMoreActivity.value = false
  }
}

const loadMoreActivity = () => {
  activityPage.value++
  fetchActivity(true)
}

const fetchNets = async () => {
  try {
    const personalUrl = currentBranchId.value
      ? `/v2/dashboard/nets/personal?branchId=${currentBranchId.value}`
      : '/v2/dashboard/nets/personal'
    const [active, pending, recent, personal] = await Promise.all([
      api.get<ActiveNet[]>('/v2/dashboard/nets/active'),
      api.get<PendingNet[]>('/v2/dashboard/nets/pending'),
      api.get<ActiveNet[]>('/v2/dashboard/nets/recent?limit=6'),
      api.get<PersonalStats | PersonalNetStatsBranchAware>(personalUrl),
    ])
    activeNets.value = active
    pendingNets.value = pending
    recentNets.value = recent
    personalStats.value = personal
  } catch (error) {
    console.error('Failed to fetch nets:', error)
  } finally {
    isLoadingNets.value = false
  }
}

const fetchCommunity = async () => {
  try {
    const communityUrl = currentBranchId.value
      ? `/v2/dashboard/community?branchId=${currentBranchId.value}`
      : '/v2/dashboard/community'
    communityStats.value = await api.get<CommunityStats | CommunityStatsBranchAware>(communityUrl)
  } catch (error) {
    console.error('Failed to fetch community stats:', error)
  } finally {
    isLoadingCommunity.value = false
  }
}

watch(currentBranchId, () => {
  fetchNets()
  fetchCommunity()
})

onMounted(() => {
  Promise.all([
    fetchActivity(),
    fetchNets(),
    fetchCommunity(),
  ])
})
</script>

<template>
  <AppLayout :title="t('nav.dashboard')">
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

    <div class="hidden xl:block h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

    <div class="hidden xl:block">
      <PersonalStatsModule
        :stats="personalStats"
        :is-loading="isLoadingNets"
      />
    </div>

    <div class="hidden xl:block h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

    <div class="hidden xl:block">
      <CommunityModule
        :stats="communityStats"
        :is-loading="isLoadingCommunity"
      />
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

      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

      <PersonalStatsModule
        :stats="personalStats"
        :is-loading="isLoadingNets"
      />

      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />

      <CommunityModule
        :stats="communityStats"
        :is-loading="isLoadingCommunity"
      />
    </div>
  </AppLayout>
</template>
