<script setup lang="ts">
import { ref, computed, onMounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Award, Building2, Calendar, ChevronRight, Download, Ear, Key, Mail, Pencil, Radio, Signal, Trash2, TrendingUp, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import BranchMembershipCard from '@/components/shared/BranchMembershipCard.vue'
import { LocatorMapPreview, MobileFab, SearchInput } from '@/components/shared'
import type { MobileFabAction } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import ResetPasswordSheet from '@/components/admin/ResetPasswordSheet.vue'
import EditOperatorAdminSheet from '@/components/operators/EditOperatorAdminSheet.vue'
import { useDateFormat } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { UserAvatar } from '@/components/ui/user-avatar'
import CertificateFilledPreview from '@/components/certificates/CertificateFilledPreview.vue'
import type { CertificateTemplateElement } from '@/components/certificates/certificate-template-defaults'
import { api } from '@/lib/api'
import { formatCallSign } from '@/lib/formatters'
import { translateError } from '@/i18n'
import { matchesTurkishSearch } from '@/lib/turkish-search'

const API_BASE = import.meta.env.VITE_API_URL

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
  userId: string
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

interface CertificatePreviewData {
  imagePath: string
  elements: CertificateTemplateElement[]
  placeholders: Record<string, string>
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
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const showResetPasswordSheet = ref(false)
const membershipSearch = ref('')
const membershipRoleFilter = ref('all')
const netsSearch = ref('')
const netsRoleFilter = ref('all')
const netsBranchFilter = ref('all')
const netsPageSize = 12
const hasMoreNets = ref(true)
const certificates = ref<OperatorCertificateItem[]>([])
const isLoadingCertificates = ref(false)
const certificatePreviews = ref<Record<string, CertificatePreviewData | null>>({})
const loadingPreviewAttendeeIds = ref<Set<string>>(new Set())
const certificatePreviewDialogCert = ref<OperatorCertificateItem | null>(null)

const operatorId = computed(() => route.params.id as string)

const isProfileOwner = computed(() =>
  !!authStore.user?.id && authStore.user.id === operator.value?.user?.id
)

const canEdit = computed(() => authStore.isAdmin || authStore.isSuperAdmin)

const mobileFabActions = computed<MobileFabAction[]>(() => {
  const actions: MobileFabAction[] = []
  
  if (canEdit.value) {
    actions.push({ key: 'edit', label: t('profile.editOperatorAction'), icon: Pencil as Component })
    
    if (!hasUserAccount.value && (stats.value?.attendedNets === 0) && (stats.value?.managedNets === 0)) {
       actions.push({ key: 'delete', label: t('operators.deleteOperator'), icon: Trash2 as Component, variant: 'destructive' })
    }
  }
  if (authStore.hasRole('admin') && operator.value?.user?.id) {
    actions.push({ key: 'resetPassword', label: t('admin.resetPassword'), icon: Key as Component })
  }
  
  return actions
})

const handleFabAction = (key: string) => {
  switch (key) {
    case 'edit': showEditSheet.value = true; break
    case 'delete': showDeleteDialog.value = true; break
    case 'resetPassword': showResetPasswordSheet.value = true; break
  }
}

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
  if (!operator.value?.user?.id) return
  
  isLoadingMemberships.value = true
  try {
    memberships.value = await api.get<UserBranchMembership[]>(`/users/${operator.value.user.id}/memberships`)
  } catch (error) {
    console.error('Failed to fetch memberships:', error)
  } finally {
    isLoadingMemberships.value = false
  }
}

const fetchCertificates = async () => {
  isLoadingCertificates.value = true
  certificatePreviews.value = {}
  try {
    certificates.value = await api.get<OperatorCertificateItem[]>(
      `/operator/${operatorId.value}/certificates`
    )
    fetchCertificatePreviews()
  } catch {
    certificates.value = []
  } finally {
    isLoadingCertificates.value = false
  }
}

const fetchCertificatePreviews = async () => {
  const list = certificates.value
  loadingPreviewAttendeeIds.value = new Set(list.map((c) => c.attendeeId))
  const results = await Promise.allSettled(
    list.map((cert) =>
      api.get<CertificatePreviewData | null>(
        `/net/${cert.netId}/certificate/${cert.attendeeId}/preview-data`
      )
    )
  )
  const next: Record<string, CertificatePreviewData | null> = {}
  list.forEach((cert, i) => {
    const r = results[i]
    if (r?.status === 'fulfilled' && r.value != null) {
      next[cert.attendeeId] = r.value
    } else {
      next[cert.attendeeId] = null
    }
  })
  certificatePreviews.value = next
  loadingPreviewAttendeeIds.value = new Set()
}

const downloadCertificateFromProfile = async (item: OperatorCertificateItem) => {
  try {
    const res = await fetch(
      `${API_BASE}/net/${item.netId}/certificate/${item.attendeeId}`,
      { credentials: 'include' }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'error.serverError')
    }
    const blob = await res.blob()
    const name = (item.netName || 'certificate').replace(/[/\\?%*:|"<>]/g, '-')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${name}-certificate.pdf`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(t('certificates.downloadSuccess'))
  } catch (e: unknown) {
    const msg = (e instanceof Error ? e.message : null) || 'error.serverError'
    toast.error(translateError(msg))
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

onMounted(async () => {
  await fetchOperator()
  fetchStats()
  fetchCertificates()
  if (operator.value?.user?.id) {
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
  } else {
    fetchRecentNets()
  }
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
                    class="hidden lg:inline-flex shrink-0 min-w-[10rem] text-destructive hover:text-destructive-foreground hover:bg-destructive"
                    :disabled="isDeleting"
                    @click="handleDeleteClick"
                  >
                    <Trash2 class="h-4 w-4 mr-2" />
                    {{ t('common.delete') }}
                  </Button>
                  <Button
                    v-if="canEdit"
                    variant="outline"
                    size="sm"
                    class="hidden lg:inline-flex shrink-0 min-w-[10rem]"
                    @click="handleEditClick"
                  >
                    <Pencil class="h-4 w-4 mr-2" />
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
                  class="hidden lg:inline-flex shrink-0 min-w-[10rem] text-foreground"
                  @click="showResetPasswordSheet = true"
                >
                  <Key class="h-4 w-4 mr-2" />
                  {{ t('admin.resetPassword') }}
                </Button>
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
                class="hidden lg:inline-flex min-w-[10rem] shrink-0"
                @click="showEditSheet = true"
              >
                <Pencil class="h-4 w-4 mr-2" />
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
            <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
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
                class="w-full lg:w-auto lg:px-8"
                :disabled="isLoadingMoreNets"
                @click="loadMoreNets"
              >
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
                @click="certificatePreviews[cert.attendeeId] && (certificatePreviewDialogCert = cert)"
              >
                <div v-if="loadingPreviewAttendeeIds.has(cert.attendeeId)" class="py-8 px-4">
                  <span class="text-xs text-muted-foreground">{{ t('common.loading') }}</span>
                </div>
                <CertificateFilledPreview
                  v-else-if="certificatePreviews[cert.attendeeId]"
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
                  <Button
                    v-if="isProfileOwner"
                    variant="outline"
                    size="sm"
                    class="gap-2"
                    @click="downloadCertificateFromProfile(cert)"
                  >
                    <Download class="h-4 w-4" />
                    {{ t('certificates.download') }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator class="my-8" />

        <section v-if="hasUserAccount">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Building2 class="h-4 w-4" />
            {{ t('memberships.myBranches') }}
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
            <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
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

      <MobileFab :actions="mobileFabActions" @action="handleFabAction" />

      <EditOperatorAdminSheet
        v-if="operator"
        v-model:open="showEditSheet"
        :operator="operator"
        @updated="handleOperatorUpdated"
      />

      <ResetPasswordSheet
        v-if="operator?.user?.id"
        v-model:open="showResetPasswordSheet"
        :user-id="operator.user.id"
        :call-sign="formattedCallSign"
      />

      <Dialog v-model:open="showDeleteDialog">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('operators.deleteOperator') }}</DialogTitle>
            <DialogDescription>
              {{ t('operators.deleteOperatorConfirm') }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter class="gap-2 sm:gap-0">
            <Button variant="ghost" @click="showDeleteDialog = false" :disabled="isDeleting">
              {{ t('common.cancel') }}
            </Button>
            <Button variant="destructive" @click="confirmDelete" :disabled="isDeleting">
              <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
              {{ isDeleting ? t('common.loading') : t('common.delete') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog :open="!!certificatePreviewDialogCert" @update:open="(v) => !v && (certificatePreviewDialogCert = null)">
        <DialogContent class="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{{ certificatePreviewDialogCert?.netName ?? t('certificates.previewFull') }}</DialogTitle>
          </DialogHeader>
          <div v-if="certificatePreviewDialogCert && certificatePreviews[certificatePreviewDialogCert.attendeeId]" class="mt-4">
            <CertificateFilledPreview
              :image-path="certificatePreviews[certificatePreviewDialogCert.attendeeId]!.imagePath"
              :elements="certificatePreviews[certificatePreviewDialogCert.attendeeId]!.elements"
              :placeholders="certificatePreviews[certificatePreviewDialogCert.attendeeId]!.placeholders"
            />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  </AppLayout>
</template>
