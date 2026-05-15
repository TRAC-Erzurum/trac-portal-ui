<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Award, Building2, Calendar, ChevronDown, ChevronRight, Ear, Edit, Key, Mail, Package, Radio, Signal, Trash2, TrendingUp, UserCircle, Users, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import EquipmentCard from '@/components/inventory/EquipmentCard.vue'
import EquipmentCardSkeleton from '@/components/inventory/EquipmentCardSkeleton.vue'
import EquipmentDetailSheet from '@/components/inventory/EquipmentDetailSheet.vue'
import EditEquipmentSheet from '@/components/inventory/EditEquipmentSheet.vue'
import BranchMembershipCard from '@/components/shared/BranchMembershipCard.vue'
import { LocatorMapPreview, SearchInput } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import ResetPasswordSheet from '@/components/admin/ResetPasswordSheet.vue'
import EditOperatorAdminSheet from '@/components/operators/EditOperatorAdminSheet.vue'
import UserDetailedInfoAdminSheet from '@/components/profile/UserDetailedInfoAdminSheet.vue'
import { useDateFormat } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { UserAvatar } from '@/components/ui/user-avatar'
import CertificateFilledPreview from '@/components/certificates/CertificateFilledPreview.vue'
import CertificatePreviewDialog from '@/components/certificates/CertificatePreviewDialog.vue'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign } from '@/lib/formatters'
import { translateError } from '@/i18n'
import { matchesTurkishSearch } from '@/lib/turkish-search'
import { useCertificateAssets } from '@/composables/useCertificateAssets'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  country?: string
  city?: string
  district?: string
  gridSquare?: string
  dmrId?: number | null
  user?: {
    id: string
    fullName?: string
    email?: string
    role?: string
    createdAt?: string
    picture?: string
    expertiseAreas?: string[]
    trainings?: { title: string; institution?: string; year?: number }[]
  }
}

interface OperatorStats {
  attendedNets: number
  managedNets: number
  streak: number
  averageReadability: number
  averageSignal: number
}

interface OperatorNetItem {
  id: string
  name: string
  date: string
  role: 'attended' | 'managed'
  attendeeCount?: number
}

interface UserBranchMembership {
  id: string
  operatorId: string
  branchId: string
  role: string
  status: string
  branch: {
    id: string
    name: string
    isHeadquarters: boolean
  }
}

interface OperatorCertificateItem {
  attendeeId: string
  netId: string
  netName: string
  netDate: string
  branchName: string
  certificateTemplateId: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { formatDateLong, formatNetDate } = useDateFormat()

const operator = ref<Operator | null>(null)
const stats = ref<OperatorStats | null>(null)
const recentNets = ref<OperatorNetItem[]>([])
const memberships = ref<UserBranchMembership[]>([])
const isLoading = ref(true)
const isLoadingStats = ref(true)
const isLoadingNets = ref(true)
const isLoadingMoreNets = ref(false)
const isLoadingMemberships = ref(true)
const showEditSheet = ref(false)
const showDetailedInfoSheet = ref(false)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const showResetPasswordSheet = ref(false)
const membershipSearch = ref('')
const membershipRoleFilter = ref('all')
const netsSearch = ref('')
const netsRoleFilter = ref('all')
const netsBranchFilter = ref('all')
const netsPageSize = 6
const hasMoreNets = ref(true)
const certificates = ref<OperatorCertificateItem[]>([])
const isLoadingCertificates = ref(false)
const certificatePreviewDialogCert = ref<OperatorCertificateItem | null>(null)

const {
  certificatePreviews,
  isLoadingCertificatePreviews,
  downloadingAttendeeId,
  loadCertificatePreviews,
  resetCertificatePreviews,
  downloadCertificate,
} = useCertificateAssets()

const downloadProfileCertificate = (item: OperatorCertificateItem) => {
  return downloadCertificate(item, {
    successMessage: t('certificates.downloadSuccess'),
    fallbackFilename: (cert) => `${(cert.netName || 'certificate').replace(/[/\\?%*:|"<>]/g, '-')}-certificate.pdf`,
  })
}

const equipmentItems = ref<any[]>([])
const equipmentTotal = ref(0)
const equipmentLoading = ref(false)
const detailEquipmentId = ref<string | null>(null)
const showDetailSheet = ref(false)
const editingEquipmentId = ref<string | null>(null)
const showEquipmentDeleteDialog = ref(false)
const deletingEquipment = ref<{ id: string; label?: string; category?: { name: string } } | null>(null)
const isDeletingEquipment = ref(false)

const operatorId = computed(() => route.params.id as string)
const isEquipmentOwner = computed(() => authStore.user?.operator?.id === operatorId.value)

const canEdit = computed(() => authStore.canManageRequestQueues)

const canViewSensitive = computed(() => {
  if (!operator.value?.user?.id) return false
  if (authStore.isSuperAdmin) return true
  if (authStore.user?.id === operator.value.user.id) return true
  
  // Check if current user is an admin of ANY branch that the viewed user is also a member of
  const viewedUserBranchIds = memberships.value.map(m => m.branchId)
  const currentUserBranchMemberships = authStore.user?.branchMemberships || []
  
  const isBranchAdmin = currentUserBranchMemberships.some(
    m =>
      (m.role === 'admin' || m.role === 'president') &&
      viewedUserBranchIds.includes(m.branchId),
  )

  return isBranchAdmin
})

const hasUserAccount = computed(() => !!operator.value?.user?.id)

const formatMemberSince = computed(() => {
  return formatDateLong(operator.value?.user?.createdAt)
})

const formattedCallSign = computed(() => {
  if (!operator.value) return ''
  return formatCallSign(operator.value)
})

const displayName = computed(() => {
  if (!operator.value) return ''
  return operator.value.user?.fullName || operator.value.fullName || ''
})

const gridSquareForMap = computed(() =>
  operator.value?.gridSquare?.trim() ?? null
)

function onLocatorMapClick() {
  if (gridSquareForMap.value) {
    router.push({ path: '/map', query: { locator: gridSquareForMap.value } })
  } else if (canEdit.value) {
    showEditSheet.value = true
  }
}

const fetchOperator = async () => {
  try {
    operator.value = await api.get<Operator>(`/operator/${operatorId.value}`)
  } catch (error) {
    console.error('Failed to fetch operator:', error)
    toast.error(t('error.serverError'))
    router.push('/operators')
  } finally {
    isLoading.value = false
  }
}

const fetchStats = async () => {
  try {
    stats.value = await api.get<OperatorStats>(`/operator/${operatorId.value}/stats`)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    isLoadingStats.value = false
  }
}

const fetchMemberships = async () => {
  isLoadingMemberships.value = true
  try {
    memberships.value = await api.get<UserBranchMembership[]>(
      `/operator/${operatorId.value}/memberships`
    )
  } catch (error) {
    console.error('Failed to fetch memberships:', error)
  } finally {
    isLoadingMemberships.value = false
  }
}

const fetchCertificates = async () => {
  isLoadingCertificates.value = true
  resetCertificatePreviews()
  try {
    certificates.value = await api.get<OperatorCertificateItem[]>(
      `/operator/${operatorId.value}/certificates`
    )
    await loadCertificatePreviews(certificates.value)
  } catch {
    certificates.value = []
    resetCertificatePreviews()
  } finally {
    isLoadingCertificates.value = false
  }
}

const fetchRecentNets = async (append = false) => {
  if (append) {
    isLoadingMoreNets.value = true
  } else {
    isLoadingNets.value = true
  }

  try {
    const offset = append ? recentNets.value.length : 0
    const params = new URLSearchParams()
    params.set('limit', String(netsPageSize))
    params.set('offset', String(offset))
    if (netsBranchFilter.value && netsBranchFilter.value !== 'all') {
      params.set('branchId', netsBranchFilter.value)
    }
    const newNets = await api.get<OperatorNetItem[]>(
      `/operator/${operatorId.value}/recent-nets?${params.toString()}`
    )

    if (append) {
      recentNets.value = [...recentNets.value, ...newNets]
    } else {
      recentNets.value = newNets
    }

    hasMoreNets.value = newNets.length === netsPageSize
  } catch (error) {
    console.error('Failed to fetch recent nets:', error)
  } finally {
    isLoadingNets.value = false
    isLoadingMoreNets.value = false
  }
}

const loadMoreNets = () => {
  fetchRecentNets(true)
}

watch(netsBranchFilter, () => {
  recentNets.value = []
  fetchRecentNets()
})


const goToNet = (netId: string) => {
  router.push(`/nets/${netId}`)
}

const handleEditClick = () => {
  showEditSheet.value = true
}

const handleDeleteClick = () => {
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!operator.value) return
  isDeleting.value = true
  try {
    await api.delete(`/operator/${operator.value.id}`)
    toast.success(t('operators.deleteOperatorSuccess'))
    router.push('/operators')
  } catch (error: any) {
    console.error('Failed to delete operator:', error)
    toast.error(translateError(error.message || 'error.serverError'))
  } finally {
    isDeleting.value = false
    showDeleteDialog.value = false
  }
}

const handleOperatorUpdated = () => {
  fetchOperator()
}

function handleEquipmentCardClick(id: string) {
  detailEquipmentId.value = id
  showDetailSheet.value = true
}

function handleEquipmentDetailEdit() {
  showDetailSheet.value = false
  if (detailEquipmentId.value) {
    editingEquipmentId.value = detailEquipmentId.value
    showEditSheet.value = true
  }
}

function handleEquipmentDetailDeleted() {
  showDetailSheet.value = false
  detailEquipmentId.value = null
  fetchEquipment()
}

function handleEquipmentEditClick(id: string) {
  editingEquipmentId.value = id
  showEditSheet.value = true
}

function handleEquipmentDeleteClick(id: string) {
  const eq = equipmentItems.value.find((e: any) => e.id === id)
  deletingEquipment.value = eq ? { id: eq.id, label: eq.label, category: eq.category } : null
  showEquipmentDeleteDialog.value = true
}

async function confirmEquipmentDelete() {
  if (!deletingEquipment.value || isDeletingEquipment.value) return
  isDeletingEquipment.value = true
  try {
    await api.delete(`/equipment/${deletingEquipment.value.id}`)
    toast.success(t('inventory.equipmentDeleted'))
    showEquipmentDeleteDialog.value = false
    deletingEquipment.value = null
    fetchEquipment()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeletingEquipment.value = false
  }
}

function handleEquipmentUpdated() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchEquipment()
}

function handleEquipmentDeleted() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchEquipment()
}

const approvedMembershipsCount = computed(() =>
  memberships.value.filter(m => m.status === 'approved').length
)

const filteredMemberships = computed(() => {
  let filtered = memberships.value.filter(m => m.status === 'approved')

  if (membershipSearch.value) {
    filtered = filtered.filter(m =>
      matchesTurkishSearch(m.branch.name, membershipSearch.value)
    )
  }

  if (membershipRoleFilter.value !== 'all') {
    filtered = filtered.filter(m => m.role === membershipRoleFilter.value)
  }

  return filtered
})

const approvedMemberships = computed(() => filteredMemberships.value)

const approvedBranches = computed(() =>
  memberships.value
    .filter(m => m.status === 'approved' && m.branch)
    .map(m => ({ id: m.branchId, name: m.branch!.name }))
)

const filteredNets = computed(() => {
  let filtered = recentNets.value

  if (netsSearch.value) {
    filtered = filtered.filter(n => 
      matchesTurkishSearch(n.name, netsSearch.value)
    )
  }

  if (netsRoleFilter.value !== 'all') {
    filtered = filtered.filter(n => n.role === netsRoleFilter.value)
  }

  return filtered
})

const profileNetsFilterKey = computed(() => `profile-nets-${operatorId.value}`)
const profileMembershipsFilterKey = computed(() => `profile-memberships-${operatorId.value}`)
usePersistedFilters(profileNetsFilterKey, { netsSearch, netsRoleFilter, netsBranchFilter })
usePersistedFilters(profileMembershipsFilterKey, { membershipSearch, membershipRoleFilter })

const getProfileNetsStorageKey = () => `trac-filters-profile-nets-${operatorId.value}`

function buildCategoryPath(category: any): string {
  if (!category) return ''
  const parts: string[] = []
  let current = category
  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }
  return parts.join(' > ')
}

const fetchEquipment = async () => {
  equipmentLoading.value = true
  try {
    const response = await api.get<{ data: any[]; total: number }>(
      `/equipment/operator/${operatorId.value}?pageSize=6`
    )
    equipmentItems.value = response.data
    equipmentTotal.value = response.total
  } catch {
    equipmentItems.value = []
    equipmentTotal.value = 0
  } finally {
    equipmentLoading.value = false
  }
}

onMounted(async () => {
  await fetchOperator()
  fetchStats()
  fetchCertificates()
  fetchEquipment()
  await fetchMemberships()
  const approved = memberships.value.filter(m => m.status === 'approved' && m.branch)
  if (approved.length > 0 && !sessionStorage.getItem(getProfileNetsStorageKey()) && netsBranchFilter.value === 'all') {
    const isOwn = authStore.user?.operator?.id === operator.value?.id
    const currentId = authStore.user?.currentBranchId
    if (isOwn && currentId && approved.some(m => m.branchId === currentId)) {
      netsBranchFilter.value = currentId
    } else {
      netsBranchFilter.value = approved[0]!.branchId
    }
  }
  fetchRecentNets()
})
</script>

<template>
  <AppLayout :title="t('operators.profile')" :breadcrumb-label="formattedCallSign || '...'">
    <div class="space-y-6">
      <template v-if="isLoading">
        <div class="animate-pulse flex flex-col sm:flex-row gap-6">
          <div class="h-24 w-24 rounded-full bg-muted flex-shrink-0 self-center sm:self-start" />
          <div class="flex-1 space-y-3">
            <div class="h-7 w-32 bg-muted rounded mx-auto sm:mx-0" />
            <div class="h-5 w-48 bg-muted rounded mx-auto sm:mx-0" />
            <div class="h-4 w-40 bg-muted rounded mx-auto sm:mx-0" />
          </div>
        </div>
      </template>

      <template v-else-if="operator">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div class="flex justify-center sm:justify-start shrink-0">
              <UserAvatar :picture="operator.user?.picture" class="h-24 w-24" />
            </div>
            <div class="min-w-0 flex-1 space-y-3">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h1 class="text-2xl font-bold">{{ formattedCallSign }}</h1>
                  <p class="text-lg text-muted-foreground">{{ displayName }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    v-if="canEdit && !hasUserAccount && (stats?.attendedNets === 0) && (stats?.managedNets === 0)"
                    variant="outline"
                    size="sm"
                    class="trac-card-action-btn trac-btn-destructive-outlined"
                    :disabled="isDeleting"
                    @click="handleDeleteClick"
                    :title="t('operators.deleteOperator')"
                    :aria-label="t('operators.deleteOperator')"
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    {{ t('common.delete') }}
                  </Button>
                  <Button
                    v-if="canEdit"
                    variant="outline"
                    size="sm"
                    class="trac-card-action-btn"
                    @click="handleEditClick"
                    :title="t('common.edit')"
                    :aria-label="t('common.edit')"
                  >
                    <Edit class="h-4 w-4 mr-2" />
                    {{ t('common.edit') }}
                  </Button>
                </div>
              </div>
              <div class="flex flex-wrap items-start justify-between gap-3 text-sm text-muted-foreground">
                <div class="flex min-w-0 flex-1 flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                  <span v-if="hasUserAccount && formatMemberSince" class="flex items-center gap-1.5">
                    <Calendar class="h-4 w-4 shrink-0" />
                    {{ formatMemberSince }}
                  </span>
                  <span v-if="operator.user?.email" class="flex items-center gap-1.5">
                    <Mail class="h-4 w-4 shrink-0" />
                    {{ operator.user.email }}
                  </span>
                </div>
                <Button
                  v-if="authStore.hasRole('admin') && operator.user?.id"
                  variant="outline"
                  size="sm"
                  class="trac-card-action-btn text-foreground"
                  @click="showResetPasswordSheet = true"
                  :title="t('admin.resetPassword')"
                  :aria-label="t('admin.resetPassword')"
                >
                  <Key class="h-4 w-4 mr-2" />
                  {{ t('admin.resetPassword') }}
                </Button>
              </div>

              <!-- Inline Expertise Areas -->
              <div v-if="operator.user?.expertiseAreas?.length" class="mt-3 space-y-1.5">
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{{ t('account.expertiseAreas') }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <div v-for="area in operator.user.expertiseAreas" :key="area"
                    class="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {{ area }}
                  </div>
                </div>
              </div>

              <!-- Inline Trainings -->
              <div v-if="operator.user?.trainings?.length" class="mt-4 space-y-1.5">
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{{ t('account.trainings') }}</p>
                <div class="flex flex-wrap gap-3">
                  <div v-for="(training, idx) in operator.user.trainings" :key="idx" 
                    class="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                    <Award class="h-3.5 w-3.5 text-primary/70" />
                    <span class="font-medium text-foreground/80">{{ training.title }}</span>
                    <span v-if="training.year" class="opacity-60">• {{ training.year }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center justify-end gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs text-muted-foreground">{{ t('profile.dmrId') }}</p>
                <p class="text-sm font-medium font-mono">{{ operator.dmrId || '-' }}</p>
              </div>
              <Button
                v-if="canEdit"
                variant="outline"
                size="sm"
                class="trac-card-action-btn"
                @click="showEditSheet = true"
                :title="t('common.edit')"
                :aria-label="t('common.edit')"
              >
                <Edit class="h-4 w-4 mr-2" />
                {{ t('common.edit') }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">{{ t('profile.qth') }}</p>
            <LocatorMapPreview
              :grid-square="gridSquareForMap"
              @click="onLocatorMapClick"
            />
          </div>
        </div>

        <Separator class="my-8" />

        <section v-if="canViewSensitive" class="space-y-4">
          <button
            type="button"
            class="w-full flex items-center gap-5 p-6 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 group"
            @click="showDetailedInfoSheet = true"
          >
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors"
            >
              <UserCircle class="h-8 w-8" />
            </div>
            <div class="min-w-0 flex-1 text-left">
              <h3 class="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {{ t('account.detailedInfo') }}
              </h3>
              <p class="text-sm text-muted-foreground mt-0.5">
                {{ t('account.detailedInfoProfileDesc') }}
              </p>
            </div>
            <ChevronRight
              class="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
            />
          </button>
        </section>

        <Separator v-if="canViewSensitive" class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <TrendingUp class="h-4 w-4" />
            {{ t('operators.netStatistics') }}
          </h3>
          
          <div v-if="isLoadingStats" class="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <div v-for="i in 5" :key="i" class="text-center">
              <div class="h-8 w-12 mx-auto bg-muted animate-pulse rounded" />
              <div class="h-4 w-16 mx-auto mt-1 bg-muted animate-pulse rounded" />
            </div>
          </div>

          <div v-else-if="stats" class="grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users class="h-5 w-5 text-muted-foreground" />
                {{ stats.attendedNets }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.attended') }}</p>
            </div>
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Radio class="h-5 w-5 text-muted-foreground" />
                {{ stats.managedNets }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.managed') }}</p>
            </div>
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp class="h-5 w-5 text-muted-foreground" />
                {{ stats.streak }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.streak') }}</p>
            </div>
            <div class="hidden sm:block">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Ear class="h-5 w-5 text-muted-foreground" />
                {{ stats.averageReadability || '—' }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.readability') }}</p>
            </div>
            <div class="hidden sm:block">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Signal class="h-5 w-5 text-muted-foreground" />
                {{ stats.averageSignal || '—' }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.signal') }}</p>
            </div>
          </div>
        </section>

        <Separator class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Radio class="h-4 w-4" />
            {{ t('operators.recentNets') }}
          </h3>

          <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
            <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-2 items-center">
              <SearchInput
                v-model="netsSearch"
                :placeholder="t('nets.searchPlaceholder')"
              />
              <Select v-model="netsBranchFilter" class="w-full min-w-0">
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="t('nets.branchFilter')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('nets.branchFilterAll') }}</SelectItem>
                  <SelectItem v-for="b in approvedBranches" :key="b.id" :value="b.id">
                    {{ b.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select v-model="netsRoleFilter" class="w-full min-w-0">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('nets.roleAll') }}</SelectItem>
                  <SelectItem value="managed">{{ t('operators.managed') }}</SelectItem>
                  <SelectItem value="attended">{{ t('operators.attended') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="trac-top-actions">
            </div>
          </div>

          <div v-if="isLoadingNets" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
              <div class="h-5 w-48 bg-muted animate-pulse rounded" />
              <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          <div v-else-if="filteredNets.length === 0" class="py-4 text-center">
            <p class="text-sm text-muted-foreground">{{ recentNets.length === 0 ? t('operators.noNets') : t('common.noResults') }}</p>
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <button
              v-for="net in filteredNets"
              :key="net.id"
              @click="goToNet(net.id)"
              class="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all group flex items-center gap-3"
            >
              <Radio
                v-if="net.role === 'managed'"
                class="h-4 w-4 text-primary flex-shrink-0"
                :title="t('operators.managed')"
              />
              <Users
                v-else
                class="h-4 w-4 text-muted-foreground flex-shrink-0"
                :title="t('operators.attended')"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ net.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatNetDate(net.date) }}</p>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          </div>

          <div v-if="!isLoadingNets" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
            <p v-if="recentNets.length > 0 || filteredNets.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
              {{ filteredNets.length }}{{ hasMoreNets && recentNets.length > 0 ? '+' : '' }}/{{ recentNets.length }} {{ t('nets.name') }}
            </p>
            <div v-if="hasMoreNets && filteredNets.length > 0" class="order-1 lg:order-2 w-full lg:w-auto">
              <Button
                variant="outline"
                class="trac-load-more-btn"
                :disabled="isLoadingMoreNets"
                @click="loadMoreNets"
              >
                <ChevronDown v-if="!isLoadingMoreNets" class="h-4 w-4 mr-2" />
                {{ isLoadingMoreNets ? t('common.loading') : t('common.loadMore') }}
              </Button>
            </div>
          </div>
        </section>

        <Separator class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Award class="h-4 w-4" />
            {{ t('profile.certificatesTitle') }}
          </h3>
          <div v-if="isLoadingCertificates" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 3" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
              <div class="h-5 w-48 bg-muted animate-pulse rounded" />
              <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div v-else-if="certificates.length === 0" class="py-4 text-center">
            <p class="text-sm text-muted-foreground">{{ t('profile.certificatesEmpty') }}</p>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="cert in certificates"
              :key="cert.attendeeId"
              class="flex flex-col rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all overflow-hidden"
            >
              <button
                type="button"
                class="min-h-[140px] flex items-center justify-center bg-muted/20 w-full cursor-pointer hover:bg-muted/30 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-t-lg"
                :aria-label="t('certificates.previewFull')"
                @click="certificatePreviewDialogCert = cert"
              >
                <CertificateFilledPreview
                    v-if="certificatePreviews[cert.attendeeId]"
                  :image-path="certificatePreviews[cert.attendeeId]!.imagePath"
                  :elements="certificatePreviews[cert.attendeeId]!.elements"
                  :placeholders="certificatePreviews[cert.attendeeId]!.placeholders"
                  :max-height="200"
                  class="w-full pointer-events-none"
                />
                <div v-else class="py-8 px-4 text-center">
                  <p class="text-xs text-muted-foreground">{{ t('certificates.template') }}</p>
                </div>
              </button>
              <div class="flex flex-col gap-3 p-4">
                <div class="min-w-0">
                  <p class="font-medium truncate">{{ cert.netName }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5">{{ formatNetDate(cert.netDate) }} · {{ cert.branchName }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-2"
                    @click="goToNet(cert.netId)"
                  >
                    <ChevronRight class="h-4 w-4" />
                    {{ t('profile.viewNet') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator class="my-8" />

        <template v-if="equipmentTotal > 0 || equipmentLoading">
          <Separator class="my-8" />

          <section>
            <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
              <Package class="h-4 w-4" />
              {{ t('inventory.title') }}
            </h3>

            <div v-if="equipmentLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <EquipmentCardSkeleton v-for="i in 3" :key="i" />
            </div>

            <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <EquipmentCard
                v-for="eq in equipmentItems"
                :key="eq.id"
                :id="eq.id"
                :label="eq.label"
                :category-name="eq.category?.name"
                :category-path="buildCategoryPath(eq.category)"
                :category-photo-path="eq.category?.photoPath"
                :status-name="eq.status?.name"
                :status-color="eq.status?.color"
                :quantity="eq.quantity"
                :is-visible="eq.isVisible"
                :properties="eq.propertyValues?.map((pv: any) => ({ name: pv.propertyDefinition?.name, value: pv.value, type: pv.propertyDefinition?.type }))"
                :photo-paths="eq.photos?.map((p: { filePath: string }) => p.filePath) ?? []"
                :thumbnail-path="eq.photos?.[0]?.filePath"
                :show-actions="isEquipmentOwner"
                @click="handleEquipmentCardClick"
                @edit="handleEquipmentEditClick"
                @delete="handleEquipmentDeleteClick"
              />
            </div>

            <div v-if="equipmentTotal > 6" class="mt-4">
              <router-link :to="`/operators/${route.params.id}/inventory`" class="text-sm text-primary hover:underline flex items-center gap-1">
                {{ t('inventory.viewAll') }} ({{ equipmentTotal }})
                <ChevronRight class="h-4 w-4" />
              </router-link>
            </div>
          </section>
        </template>

        <section v-if="operator">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Building2 class="h-4 w-4" />
            {{ t('memberships.operatorBranches') }}
          </h3>

          <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
            <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
              <SearchInput
                v-model="membershipSearch"
                :placeholder="t('memberships.searchPlaceholder')"
              />
              <Select v-model="membershipRoleFilter" class="w-full min-w-0">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('operators.roleAll') }}</SelectItem>
                  <SelectItem value="president">{{ t('roles.president') }}</SelectItem>
                  <SelectItem value="admin">{{ t('roles.admin') }}</SelectItem>
                  <SelectItem value="member">{{ t('roles.member') }}</SelectItem>
                  <SelectItem value="volunteer">{{ t('roles.volunteer') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="trac-top-actions">
            </div>
          </div>

          <div v-if="isLoadingMemberships" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div v-for="i in 2" :key="i" class="h-20 bg-muted rounded-lg animate-pulse" />
          </div>

          <div v-else-if="approvedMemberships.length === 0" class="text-center py-4">
            <Building2 class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p class="text-sm text-muted-foreground">{{ memberships.length === 0 ? t('memberships.noMemberships') : t('common.noResults') }}</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <BranchMembershipCard
              v-for="m in approvedMemberships"
              :key="m.id"
              :branch-id="m.branchId"
              :branch-name="m.branch.name"
              :role="m.role"
              :global-role="operator?.user?.role"
            />
          </div>
          <p v-if="!isLoadingMemberships && (approvedMembershipsCount > 0 || filteredMemberships.length > 0)" class="text-sm text-muted-foreground pt-4">
            {{ filteredMemberships.length }}/{{ approvedMembershipsCount }} {{ t('branches.nameEntity') }}
          </p>
        </section>
      </template>

      <EditOperatorAdminSheet
        v-if="operator"
        v-model:open="showEditSheet"
        :operator="operator"
        @updated="handleOperatorUpdated"
      />

      <UserDetailedInfoAdminSheet
        v-if="operator?.user?.id"
        v-model:open="showDetailedInfoSheet"
        :user-id="operator.user.id"
      />

      <ResetPasswordSheet
        v-if="operator?.user?.id"
        v-model:open="showResetPasswordSheet"
        :user-id="operator.user.id"
        :call-sign="formattedCallSign"
      />

      <EquipmentDetailSheet
        :open="showDetailSheet"
        :equipment-id="detailEquipmentId"
        :can-edit="isEquipmentOwner"
        @update:open="showDetailSheet = $event"
        @edit="handleEquipmentDetailEdit"
        @deleted="handleEquipmentDetailDeleted"
      />

      <EditEquipmentSheet
        :open="showEditSheet"
        :equipment-id="editingEquipmentId"
        @update:open="showEditSheet = $event"
        @updated="handleEquipmentUpdated"
        @deleted="handleEquipmentDeleted"
      />

      <Dialog :open="showEquipmentDeleteDialog" @update:open="showEquipmentDeleteDialog = $event">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('inventory.deleteEquipment') }}</DialogTitle>
            <DialogDescription>
              {{ deletingEquipment?.label || deletingEquipment?.category?.name }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showEquipmentDeleteDialog = false" :disabled="isDeletingEquipment">
              <X class="h-4 w-4 mr-2" />
              {{ t('common.cancel') }}
            </Button>
            <Button
              variant="outline"
              @click="confirmEquipmentDelete"
              :disabled="isDeletingEquipment"
              class="trac-btn-destructive-outlined"
            >
              <Trash2 v-if="!isDeletingEquipment" class="h-4 w-4 mr-2" />
              {{ isDeletingEquipment ? t('common.loading') : t('common.delete') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="showDeleteDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('operators.deleteOperator') }}</DialogTitle>
            <DialogDescription>
              {{ t('operators.deleteOperatorConfirm') }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2 sm:gap-0">
            <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
              {{ t('common.cancel') }}
            </Button>
            <Button variant="outline" class="trac-btn-destructive-outlined" @click="confirmDelete" :disabled="isDeleting">
              <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
              {{ isDeleting ? t('common.loading') : t('common.delete') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CertificatePreviewDialog
        :open="!!certificatePreviewDialogCert"
        :certificate="certificatePreviewDialogCert"
        :preview="certificatePreviewDialogCert ? certificatePreviews[certificatePreviewDialogCert.attendeeId] ?? null : null"
        :is-loading="isLoadingCertificatePreviews"
        :is-downloading="downloadingAttendeeId === certificatePreviewDialogCert?.attendeeId"
        @update:open="(v) => !v && (certificatePreviewDialogCert = null)"
        @download="certificatePreviewDialogCert && downloadProfileCertificate(certificatePreviewDialogCert)"
      />

    </div>
  </AppLayout>
</template>
