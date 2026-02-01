<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import StatusBar from '@/components/dashboard/StatusBar.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import NetsModule from '@/components/dashboard/NetsModule.vue'
import CommunityModule from '@/components/dashboard/CommunityModule.vue'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'

interface StatusResponse {
  activeNetsCount: number
  hasActiveNets: boolean
}

interface ActiveNet {
  id: string
  name: string
  frequency: string
  mode: string
  operatorCallSign: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
}

interface PersonalStats {
  attendedNets: number
  managedNets: number
  streak: number
  averageReadability: number
  averageSignal: number
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

const isLoadingStatus = ref(true)
const isLoadingActivity = ref(true)
const isLoadingNets = ref(true)
const isLoadingCommunity = ref(true)

const status = ref<StatusResponse | null>(null)
const activities = ref<Activity[]>([])
const activeNets = ref<ActiveNet[]>([])
const recentNets = ref<ActiveNet[]>([])
const personalStats = ref<PersonalStats | null>(null)
const communityStats = ref<CommunityStats | null>(null)

const fetchStatus = async () => {
  try {
    status.value = await api.get<StatusResponse>('/v2/dashboard/status')
  } catch (error) {
    console.error('Failed to fetch status:', error)
  } finally {
    isLoadingStatus.value = false
  }
}

const fetchActivity = async () => {
  try {
    activities.value = await api.get<Activity[]>('/v2/dashboard/activity?limit=5')
  } catch (error) {
    console.error('Failed to fetch activity:', error)
  } finally {
    isLoadingActivity.value = false
  }
}

const fetchNets = async () => {
  try {
    const [active, recent, personal] = await Promise.all([
      api.get<ActiveNet[]>('/v2/dashboard/nets/active'),
      api.get<ActiveNet[]>('/v2/dashboard/nets/recent'),
      api.get<PersonalStats>('/v2/dashboard/nets/personal'),
    ])
    activeNets.value = active
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
    communityStats.value = await api.get<CommunityStats>('/v2/dashboard/community')
  } catch (error) {
    console.error('Failed to fetch community stats:', error)
  } finally {
    isLoadingCommunity.value = false
  }
}

onMounted(() => {
  fetchStatus()
  fetchActivity()
  fetchNets()
  fetchCommunity()
})
</script>

<template>
  <AppLayout :title="t('nav.dashboard')">
    <div class="space-y-6">
      <StatusBar 
        :active-nets-count="status?.activeNetsCount || 0" 
        :is-loading="isLoadingStatus" 
      />

      <Separator />

      <ActivityFeed 
        :activities="activities" 
        :is-loading="isLoadingActivity" 
      />

      <Separator />

      <NetsModule
        :active-nets="activeNets"
        :recent-nets="recentNets"
        :personal-stats="personalStats"
        :is-loading="isLoadingNets"
      />

      <Separator />

      <CommunityModule
        :stats="communityStats"
        :is-loading="isLoadingCommunity"
      />
    </div>
  </AppLayout>
</template>
