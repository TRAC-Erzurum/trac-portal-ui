<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import NetsModule from '@/components/dashboard/NetsModule.vue'
import DashboardInventoryCarousel from '@/components/dashboard/widgets/DashboardInventoryCarousel.vue'
import GeographyWidget from '@/components/dashboard/widgets/GeographyWidget.vue'
import { api } from '@/lib/api'

const MapPreviewWidget = defineAsyncComponent(
  () => import('@/components/dashboard/widgets/MapPreviewWidget.vue')
)

interface ActiveNet {
  id: string
  name: string
  operatorCallSign: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
  certificateTemplateId?: string | null
}

interface PendingNet {
  id: string
  name: string
  operatorCallSign: string
  certificateTemplateId?: string | null
}

interface CancelledNet {
  id: string
  name: string
  operatorCallSign: string
  endedAt?: string
  certificateTemplateId?: string | null
  branch?: { id: string; name: string; isHeadquarters?: boolean }
  branchCallSign?: { id: string; callSign: string }
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

const isLoadingActivity = ref(true)
const isLoadingMoreActivity = ref(false)
const isLoadingNets = ref(true)

const activities = ref<Activity[]>([])
const hasMoreActivity = ref(true)
const activeNets = ref<ActiveNet[]>([])
const pendingNets = ref<PendingNet[]>([])
const recentNets = ref<ActiveNet[]>([])
const cancelledNets = ref<CancelledNet[]>([])

const fetchActivity = async (append = false) => {
  if (append) isLoadingMoreActivity.value = true
  try {
    const limit = 5
    const offset = append ? activities.value.length : 0
    const data = await api.get<Activity[]>(`/dashboard/activity?limit=${limit}&offset=${offset}`)
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
    const [active, pending, recent, cancelled] = await Promise.all([
      api.get<ActiveNet[]>('/dashboard/nets/active'),
      api.get<PendingNet[]>('/dashboard/nets/pending'),
      api.get<ActiveNet[]>('/dashboard/nets/recent?limit=6'),
      api.get<CancelledNet[]>('/dashboard/nets/cancelled?limit=6'),
    ])
    activeNets.value = active
    pendingNets.value = pending
    recentNets.value = recent
    cancelledNets.value = cancelled
  } catch (e) {
    console.error('Failed to fetch nets:', e)
  } finally {
    isLoadingNets.value = false
  }
}

onMounted(() => {
  fetchActivity()
  fetchNets()
})
</script>

<template>
  <AppLayout :title="t('nav.dashboard')">
    <!-- Top: Nets + Activity (unchanged) -->
    <div class="hidden xl:flex items-stretch gap-6 max-h-[70vh] min-h-0">
      <div class="flex-1">
        <NetsModule
          :active-nets="activeNets"
          :pending-nets="pendingNets"
          :recent-nets="recentNets"
          :cancelled-nets="cancelledNets"
          :is-loading="isLoadingNets"
          :max-nets="6"
        />
      </div>
      <div class="w-px bg-zinc-200 dark:bg-zinc-800" />
      <div class="w-80 shrink-0 flex flex-col min-h-0">
        <div class="flex-1 min-h-0 flex flex-col">
          <ActivityFeed
            :activities="activities"
            :is-loading="isLoadingActivity"
            :has-more="hasMoreActivity"
            :is-loading-more="isLoadingMoreActivity"
            @load-more="loadMoreActivity"
          />
        </div>
      </div>
    </div>

    <div class="xl:hidden">
      <NetsModule
        :active-nets="activeNets"
        :pending-nets="pendingNets"
        :recent-nets="recentNets"
        :cancelled-nets="cancelledNets"
        :is-loading="isLoadingNets"
        :max-nets="3"
      />
      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-6" />
      <div class="h-[310px] min-h-0 shrink-0 flex flex-col">
        <ActivityFeed
          :activities="activities"
          :is-loading="isLoadingActivity"
          :has-more="hasMoreActivity"
          :is-loading-more="isLoadingMoreActivity"
          @load-more="loadMoreActivity"
        />
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <DashboardInventoryCarousel class="min-h-0" />
      <Suspense>
        <MapPreviewWidget />
        <template #fallback>
          <div class="rounded-lg border border-border bg-background overflow-hidden min-h-[12rem] flex items-center justify-center text-sm text-muted-foreground">
            {{ t('common.loading') }}
          </div>
        </template>
      </Suspense>
    </div>
  </AppLayout>
</template>
