<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Award, Building2, Package, Radio, TowerControl } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import DashboardActiveDisasters from '@/components/dashboard/DashboardActiveDisasters.vue'
import DashboardSection from '@/components/dashboard/DashboardSection.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'
import NoOperatorBanner from '@/components/dashboard/NoOperatorBanner.vue'
import ProfileCard from '@/components/dashboard/ProfileCard.vue'
import DashboardCarousel from '@/components/dashboard/widgets/DashboardCarousel.vue'
import DashboardStatsWidget from '@/components/dashboard/widgets/DashboardStatsWidget.vue'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { getUploadedFileUrl } from '@/composables'
import NetCard from '@/components/shared/NetCard.vue'
import NetCardSkeleton from '@/components/shared/NetCardSkeleton.vue'
import type { CommunicationChannel } from '@/types/communication-channel'
import CommunicationChannelCard from '@/components/shared/CommunicationChannelCard.vue'
import BranchCard from '@/components/shared/BranchCard.vue'
import CertificatePreviewDialog from '@/components/certificates/CertificatePreviewDialog.vue'
import { useCertificateAssets } from '@/composables/useCertificateAssets'
import { api, type ApiError } from '@/lib/api'

const MapPreviewWidget = defineAsyncComponent(
  () => import('@/components/dashboard/widgets/MapPreviewWidget.vue')
)

const ACTIVITY_PAGE_SIZE = 10

interface HomeNet {
  id: string
  name: string
  status: 'active' | 'pending' | 'completed'
  startedAt: string | null
  endedAt: string | null
  scheduledAt: string | null
  estimatedDurationMinutes: number | null
  durationMinutes: number | null
  attendeeCount: number
  certificateTemplateId: string | null
  branch: { id: string; name: string; isHeadquarters: boolean } | null
  branchCallSign: { id: string; callSign: string } | null
}

interface BranchCarouselItem extends Record<string, unknown> {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  callSigns: Array<{ id: string; callSign: string; isDefault: boolean }>
}

interface OperatorCertificateItem extends Record<string, unknown> {
  attendeeId: string
  netId: string
  netName: string
  netDate: string
  branchName: string
  imageUrl?: string | null
  certificateTemplateId: string
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
const router = useRouter()

const isLoadingNets = ref(true)
const isLoadingInventory = ref(true)
const isLoadingChannels = ref(true)
const isLoadingCertificates = ref(true)
const isCertificateEndpointUnavailable = ref(false)

const homeNets = ref<HomeNet[]>([])

const isLoadingActivity = ref(true)
const isLoadingMoreActivity = ref(false)
const activities = ref<Activity[]>([])
const hasMoreActivity = ref(true)

const resolveBranchLabel = (
  branch?: { name: string; isHeadquarters?: boolean } | null,
  branchCallSign?: { callSign: string } | null,
) => {
  if (!branch) return undefined
  if (!branch.isHeadquarters && branchCallSign?.callSign) {
    return `${branchCallSign.callSign} · ${branch.name}`
  }
  return branch.name
}

const homeNetItems = computed(() =>
  homeNets.value.map((net) => ({
    id: net.id,
    name: net.name,
    status: net.status,
    attendeeCount: net.status === 'pending' ? undefined : net.attendeeCount,
    durationMinutes: net.durationMinutes ?? undefined,
    startedAt: net.startedAt,
    endedAt: net.endedAt,
    scheduledAt: net.scheduledAt,
    estimatedDurationMinutes: net.estimatedDurationMinutes,
    hasCertificate: !!net.certificateTemplateId,
    branchLabel: resolveBranchLabel(net.branch, net.branchCallSign),
  })),
)

// Inventory
const authStore = useAuthStore()
const branchStore = useBranchStore()
const showNoOperatorBanner = computed(
  () => authStore.isAuthenticated && !authStore.hasOperator
)
const operatorId = computed(() => authStore.user?.operator?.id ?? null)
const inventoryLink = computed(() => (operatorId.value ? `/operators/${operatorId.value}/inventory` : ''))

const goToEquipmentDetail = (equipmentId: string) => {
  if (operatorId.value) {
    router.push(`/operators/${operatorId.value}/inventory?equipment=${equipmentId}`)
  }
}
const inventoryItems = ref<Array<{ equipmentId: string; imageUrl: string | null; alt: string }>>([])
const myCertificates = ref<OperatorCertificateItem[]>([])
const certificatePreviewDialogCert = ref<OperatorCertificateItem | null>(null)
const { certificatePreviews, loadCertificatePreviews, resetCertificatePreviews, downloadCertificate, downloadingAttendeeId } = useCertificateAssets()

const userBranchIds = computed(() => new Set(branchStore.userBranches.map((membership) => membership.branchId)))
const branchItems = computed<BranchCarouselItem[]>(() =>
  branchStore.userBranches
    .map((membership) => {
      const branch = membership.branch
      if (!branch) return null

      return {
        id: branch.id,
        name: branch.name,
        type: branch.type,
        isHeadquarters: branch.isHeadquarters,
        isActive: branch.isActive,
        callSigns: branch.callSigns ?? [],
      }
    })
    .filter((branch): branch is BranchCarouselItem => !!branch)
)
const visibleBranchItems = computed(() => branchItems.value.slice(0, 2))

const openCertificatePreview = (item: OperatorCertificateItem) => {
  certificatePreviewDialogCert.value = item
}

const closeCertificatePreview = () => {
  certificatePreviewDialogCert.value = null
}

async function fetchInventory() {
  const opId = operatorId.value
  if (!opId) {
    inventoryItems.value = []
    isLoadingInventory.value = false
    return
  }

  isLoadingInventory.value = true
  try {
    const response = await api.get<{ data: Array<any>; total: number }>(`/equipment/operator/${opId}?pageSize=200`)
    const visible = (response.data ?? []).filter((equipment) => equipment.isVisible !== false)
    const nextItems = visible.map((equipment) => {
      const sorted = [...(equipment.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
      const firstPhoto = sorted[0]
      const imageUrl = firstPhoto?.filePath ? getUploadedFileUrl(firstPhoto.filePath) : (equipment.category?.photoPath ? getUploadedFileUrl(equipment.category.photoPath) : null)
      return {
        equipmentId: equipment.id,
        imageUrl,
        alt: equipment.label || equipment.category?.name || t('inventory.equipment'),
      }
    })
    inventoryItems.value = nextItems
  } catch (e) {
    console.error('Failed to fetch inventory:', e)
    inventoryItems.value = []
  } finally {
    isLoadingInventory.value = false
  }
}

// Communication channels
const channels = ref<CommunicationChannel[]>([])
const channelsForMyBranches = computed(() => {
  if (userBranchIds.value.size === 0) return []
  return channels.value.filter((channel) => userBranchIds.value.has(channel.branchId))
})

async function fetchChannels() {
  isLoadingChannels.value = true
  try {
    const response = await api.get<{ data: CommunicationChannel[]; total: number }>(`/communication-channel?pageNumber=1&pageSize=100`)
    channels.value = response.data ?? []
  } catch (e) {
    console.error('Failed to fetch channels:', e)
    channels.value = []
  } finally {
    isLoadingChannels.value = false
  }
}

async function fetchMyCertificates() {
  const opId = operatorId.value
  if (!opId) {
    myCertificates.value = []
    resetCertificatePreviews()
    isLoadingCertificates.value = false
    isCertificateEndpointUnavailable.value = false
    return
  }

  isLoadingCertificates.value = true
  isCertificateEndpointUnavailable.value = false
  try {
    const items = await api.get<OperatorCertificateItem[]>(`/operator/${opId}/certificates`)
    await loadCertificatePreviews(items ?? [])
    myCertificates.value = (items ?? []).map((item) => ({
      ...item,
      imageUrl: certificatePreviews.value[item.attendeeId]?.imagePath
        ? getUploadedFileUrl(certificatePreviews.value[item.attendeeId]!.imagePath)
        : null,
    }))
  } catch (e) {
    const err = e as ApiError
    if (err.statusCode === 404) {
      isCertificateEndpointUnavailable.value = true
    }
    myCertificates.value = []
    resetCertificatePreviews()
  } finally {
    isLoadingCertificates.value = false
  }
}

const fetchNets = async () => {
  try {
    isLoadingNets.value = true
    homeNets.value = await api.get<HomeNet[]>('/dashboard/nets/home?limit=6')
  } catch (e) {
    console.error('Failed to fetch nets:', e)
    homeNets.value = []
  } finally {
    isLoadingNets.value = false
  }
}

// Activity
const fetchActivity = async (append = false) => {
  if (append) isLoadingMoreActivity.value = true
  try {
    const offset = append ? activities.value.length : 0
    const data = await api.get<Activity[]>(`/dashboard/activity?limit=${ACTIVITY_PAGE_SIZE}&offset=${offset}`)
    activities.value = append ? [...activities.value, ...data] : data
    hasMoreActivity.value = data.length === ACTIVITY_PAGE_SIZE
  } catch (e) {
    console.error('Failed to fetch activity:', e)
  } finally {
    isLoadingActivity.value = false
    isLoadingMoreActivity.value = false
  }
}

const loadMoreActivity = () => fetchActivity(true)

onMounted(async () => {
  fetchNets()
  void fetchActivity()
  await branchStore.fetchUserBranches()
  void fetchInventory()
  void fetchChannels()
  void fetchMyCertificates()
})
</script>

<template>
  <AppLayout :title="t('nav.dashboard')">
    <NoOperatorBanner v-if="showNoOperatorBanner" class="mb-4 lg:mb-6" />

    <DashboardActiveDisasters class="mb-4 lg:mb-6" />

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
      <div class="lg:col-span-3 min-w-0 space-y-6 lg:space-y-8">
        <DashboardSection :icon="Radio" :title="t('dashboard.nets')" :button-text="t('dashboard.allNets')" to="/nets">
          <div v-if="isLoadingNets" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <NetCardSkeleton v-for="i in 3" :key="i" />
          </div>
          <div v-else-if="homeNetItems.length === 0"
            class="flex flex-col items-center justify-center py-8 gap-3 rounded-lg border border-border/50">
            <Radio class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
            <p class="text-sm text-muted-foreground text-center">
              {{ t('dashboard.noNets') }}
            </p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <NetCard v-for="net in homeNetItems" :key="net.id" v-bind="net" compact />
          </div>
        </DashboardSection>

        <DashboardSection :icon="Building2" :title="t('dashboard.branchesImIn')"
          :button-text="t('dashboard.allBranches')" to="/branches">
          <div v-if="visibleBranchItems.length === 0"
            class="flex flex-col items-center justify-center py-8 gap-3 rounded-lg border border-border/50">
            <Building2 class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
            <p class="text-sm text-muted-foreground text-center">
              {{ t('dashboard.noBranchesYet') }}
            </p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <BranchCard v-for="branch in visibleBranchItems" :key="branch.id" v-bind="branch" />
          </div>
        </DashboardSection>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <DashboardCarousel :icon="Award" :title="t('dashboard.myCertificatesTitle')" :button-text="t('nav.certificates')"
            to="/certificates" :items="myCertificates" :is-loading="isLoadingCertificates" item-key="attendeeId">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-8 gap-3">
                <Award class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                <p class="text-sm text-muted-foreground text-center">
                  {{ isCertificateEndpointUnavailable ? t('dashboard.certificateEndpointUnavailable') :
                    t('certificates.noCertificates') }}
                </p>
              </div>
            </template>
            <template #default="{ item }">
              <button type="button" @click="openCertificatePreview(item)"
                class="w-[min(100%,200px)] aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-sm p-0 text-left transition-colors hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/60">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.netName" class="w-full h-full object-cover" />
                <div v-else
                  class="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <Award class="h-6 w-6 text-primary/60 shrink-0" aria-hidden="true" />
                  <p class="text-xs px-2 text-center font-semibold">{{ item.netName }}</p>
                </div>
              </button>
            </template>
          </DashboardCarousel>
          <DashboardCarousel :icon="Package" :title="t('dashboard.myInventoryTitle')"
            :button-text="t('inventory.viewInventory')" :to="inventoryLink" :is-loading="isLoadingInventory"
            :items="inventoryItems" item-key="equipmentId">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-8 gap-3">
                <Package class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                <p class="text-sm text-muted-foreground text-center">
                  {{ t('inventory.noEquipmentYet') }}
                </p>
              </div>
            </template>
            <template #default="{ item }">
              <div
                @click="goToEquipmentDetail(item.equipmentId)"
                class="w-[min(100%,200px)] aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-sm p-0 cursor-pointer hover:border-border transition-colors">
                <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.alt" class="w-full h-full object-cover" />
                <div v-else
                  class="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/30">
                  <span class="text-xs px-2 text-center">{{ item.alt }}</span>
                </div>
              </div>
            </template>
          </DashboardCarousel>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <DashboardStatsWidget />
          <DashboardCarousel :icon="TowerControl" :title="t('communicationChannels.title')"
            :button-text="t('inventory.viewAll')" to="/communication-channels" :items="channelsForMyBranches"
            :is-loading="isLoadingChannels" item-key="id">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-8 gap-3">
                <TowerControl class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
                <p class="text-sm text-muted-foreground text-center">
                  {{ t('communicationChannels.noInfrastructure') }}
                </p>
              </div>
            </template>
            <template #default="{ item }">
              <div class="w-[min(100%,280px)]">
                <CommunicationChannelCard :channel="item" :can-manage="false" />
              </div>
            </template>
          </DashboardCarousel>
        </div>

        <Suspense>
          <MapPreviewWidget />
          <template #fallback>
            <div
              class="rounded-lg border border-border bg-background overflow-hidden min-h-[420px] flex items-center justify-center text-sm text-muted-foreground">
              {{ t('common.loading') }}
            </div>
          </template>
        </Suspense>
      </div>

      <aside class="lg:col-span-1 min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div class="hidden lg:block">
          <ProfileCard />
        </div>
        <ActivityFeed
          :activities="activities"
          :is-loading="isLoadingActivity"
          :has-more="hasMoreActivity"
          :is-loading-more="isLoadingMoreActivity"
          @load-more="loadMoreActivity"
        />
      </aside>
    </div>

    <CertificatePreviewDialog
      :open="!!certificatePreviewDialogCert"
      :certificate="certificatePreviewDialogCert"
      :preview="certificatePreviewDialogCert ? certificatePreviews[certificatePreviewDialogCert.attendeeId] ?? null : null"
      :is-downloading="downloadingAttendeeId === certificatePreviewDialogCert?.attendeeId"
      @update:open="(open) => !open && closeCertificatePreview()"
      @download="certificatePreviewDialogCert && downloadCertificate(certificatePreviewDialogCert, { successMessage: t('certificates.downloadSuccess') })"
    />
  </AppLayout>
</template>
