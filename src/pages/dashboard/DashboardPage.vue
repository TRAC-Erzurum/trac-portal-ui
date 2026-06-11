<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Award, Building2, Package, Radio, TowerControl } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import DashboardActiveDisasters from '@/components/dashboard/DashboardActiveDisasters.vue'
import NoOperatorBanner from '@/components/dashboard/NoOperatorBanner.vue'
import DashboardCarousel from '@/components/dashboard/widgets/DashboardCarousel.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'
import { getUploadedFileUrl } from '@/composables'
import NetCard from '@/components/shared/NetCard.vue'
import type { CommunicationChannel } from '@/types/communication-channel'
import CommunicationChannelCard from '@/components/shared/CommunicationChannelCard.vue'
import BranchCard from '@/components/shared/BranchCard.vue'
import CertificatePreviewDialog from '@/components/certificates/CertificatePreviewDialog.vue'
import { useCertificateAssets } from '@/composables/useCertificateAssets'
import { api, type ApiError } from '@/lib/api'

const MapPreviewWidget = defineAsyncComponent(
  () => import('@/components/dashboard/widgets/MapPreviewWidget.vue')
)

interface ActiveNet {
  id: string
  name: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
  certificateTemplateId?: string | null
  branch?: { id: string; name: string; isHeadquarters?: boolean }
  branchCallSign?: { id: string; callSign: string }
}

interface PendingNet {
  id: string
  name: string
  scheduledAt?: string | null
  estimatedDurationMinutes?: number | null
  certificateTemplateId?: string | null
  branch?: { id: string; name: string; isHeadquarters?: boolean }
  branchCallSign?: { id: string; callSign: string }
}

interface CancelledNet {
  id: string
  name: string
  endedAt?: string
  certificateTemplateId?: string | null
  branch?: { id: string; name: string; isHeadquarters?: boolean }
  branchCallSign?: { id: string; callSign: string }
}

interface NetCarouselItem extends Record<string, unknown> {
  id: string
  name: string
  attendeeCount?: number
  durationMinutes?: number
  startedAt?: string
  endedAt?: string
  scheduledAt?: string | null
  estimatedDurationMinutes?: number | null
  hasCertificate?: boolean
  branchLabel?: string
  status: 'active' | 'pending' | 'completed' | 'cancelled'
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

const { t } = useI18n()
const router = useRouter()

const isLoadingNets = ref(true)
const isLoadingInventory = ref(true)
const isLoadingChannels = ref(true)
const isLoadingCertificates = ref(true)
const isCertificateEndpointUnavailable = ref(false)

const activeNets = ref<ActiveNet[]>([])
const pendingNets = ref<PendingNet[]>([])
const recentNets = ref<ActiveNet[]>([])
const cancelledNets = ref<CancelledNet[]>([])

const resolveBranchLabel = (
  branch?: { name: string; isHeadquarters?: boolean },
  branchCallSign?: { callSign: string },
) => {
  if (!branch) return undefined
  if (!branch.isHeadquarters && branchCallSign?.callSign) {
    return `${branchCallSign.callSign} · ${branch.name}`
  }
  return branch.name
}

const netCarouselItems = computed<NetCarouselItem[]>(() => {
  const active = activeNets.value.map<NetCarouselItem>((net) => ({
    id: net.id,
    name: net.name,
    attendeeCount: net.attendeeCount,
    durationMinutes: net.durationMinutes,
    startedAt: net.startedAt,
    hasCertificate: !!net.certificateTemplateId,
    branchLabel: resolveBranchLabel(net.branch, net.branchCallSign),
    status: 'active',
  }))

  const pending = pendingNets.value.map<NetCarouselItem>((net) => ({
    id: net.id,
    name: net.name,
    scheduledAt: net.scheduledAt,
    estimatedDurationMinutes: net.estimatedDurationMinutes,
    hasCertificate: !!net.certificateTemplateId,
    branchLabel: resolveBranchLabel(net.branch, net.branchCallSign),
    status: 'pending',
  }))

  const recent = recentNets.value.map<NetCarouselItem>((net) => ({
    id: net.id,
    name: net.name,
    attendeeCount: net.attendeeCount,
    durationMinutes: net.durationMinutes,
    startedAt: net.startedAt,
    hasCertificate: !!net.certificateTemplateId,
    branchLabel: resolveBranchLabel(net.branch, net.branchCallSign),
    status: 'completed',
  }))

  const cancelled = cancelledNets.value.map<NetCarouselItem>((net) => ({
    id: net.id,
    name: net.name,
    endedAt: net.endedAt,
    hasCertificate: !!net.certificateTemplateId,
    branchLabel: resolveBranchLabel(net.branch, net.branchCallSign),
    status: 'cancelled',
  }))

  return [...active, ...pending, ...recent, ...cancelled]
})

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
  (() => {
    const [firstBranch, ...restBranches] = branchStore.userBranches
    return [...restBranches, firstBranch]
  })()
    .filter(Boolean)
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

onMounted(async () => {
  fetchNets()
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

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <DashboardCarousel :icon="Radio" :title="t('dashboard.nets')" :button-text="t('dashboard.allNets')" to="/nets"
        :items="netCarouselItems" :is-loading="isLoadingNets" item-key="id">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 gap-3">
            <Radio class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
            <p class="text-sm text-muted-foreground text-center">
              {{ t('dashboard.noNets') }}
            </p>
          </div>
        </template>
        <template #default="{ item }">
          <div class="w-[min(100%,280px)]">
            <NetCard v-bind="item" />
          </div>
        </template>
      </DashboardCarousel>
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
      <DashboardCarousel :icon="Building2" :title="t('dashboard.branchesImIn')" :button-text="t('nav.branches')"
        to="/branches" :items="branchItems" item-key="id">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-8 gap-3">
            <Building2 class="h-16 w-16 text-muted-foreground/50 shrink-0" aria-hidden="true" />
            <p class="text-sm text-muted-foreground text-center">
              {{ t('dashboard.noBranchesYet') }}
            </p>
          </div>
        </template>
        <template #default="{ item }">
          <div class="w-[min(100%,280px)]">
            <BranchCard v-bind="item" />
          </div>
        </template>
      </DashboardCarousel>
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
