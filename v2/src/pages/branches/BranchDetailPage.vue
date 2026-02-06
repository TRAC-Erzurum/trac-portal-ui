<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { BookOpen, Check, Edit, Mail, MapPin, Plus, Power, PowerOff, Radio, RotateCcw, TowerControl, Trash2, Users, X } from 'lucide-vue-next'
import EditBranchSheet from '@/components/branches/EditBranchSheet.vue'
import AddMemberSheet from '@/components/branches/AddMemberSheet.vue'
import CreateCommChannelSheet from '@/components/infrastructure/CreateCommChannelSheet.vue'
import EditCommChannelSheet from '@/components/infrastructure/EditCommChannelSheet.vue'
import CreateNetSheet from '@/components/nets/CreateNetSheet.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { InfrastructureCard, InfrastructureCardSkeleton, MemberCard, NetCard, NetCardSkeleton, SearchInput } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useDateFormat, usePersistedFilters } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign } from '@/lib/formatters'

interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

interface Branch {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  city?: string
  address?: string
  phone?: string
  email?: string
  callSigns: BranchCallSign[]
  createdAt: string
}

type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs' | 'hf'

interface Infrastructure {
  id: string
  branchId: string
  type: InfrastructureType
  name: string
  description?: string
  isActive: boolean
  location?: string
  district?: string
  latitude?: number
  longitude?: number
  altitude?: number
  coverage?: string
  rxFrequency?: number
  txFrequency?: number
  offset?: string
  txCtcssTone?: number
  rxCtcssTone?: number
  txDcsCode?: string
  txDcsPolarity?: string
  rxDcsCode?: string
  rxDcsPolarity?: string
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number
  aprsIsIgate?: boolean
  aprsIsDigipeater?: boolean
  aprsIgateMode?: string
  aprsDigipeaterType?: string
  aprsPath?: string
  aprsServer?: string
  digipeater?: string
  hfFrequencyRange?: string
  hfMode?: string
}

interface BranchMember {
  id: string
  userId: string
  branchId: string
  role: string
  user: {
    id: string
    fullName?: string
    picture?: string
    globalRole?: string
    operator?: { 
      id?: string
      callSign?: string
      prefix?: string
      suffix?: string
      fullName?: string 
    }
  }
}

interface PendingMembership {
  id: string
  userId: string
  branchId: string
  user?: { id: string; fullName?: string; operator?: { callSign?: string } }
  createdAt: string
}

const { t } = useI18n()
const { formatDateSimple } = useDateFormat()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const branch = ref<Branch | null>(null)
const isLoading = ref(true)
const isEditSheetOpen = ref(false)
const showAddMemberSheet = ref(false)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const showRestoreDialog = ref(false)
const isRestoring = ref(false)

const infrastructure = ref<Infrastructure[]>([])
const infrastructureTotal = ref(0)
const infrastructurePage = ref(1)
const infrastructurePageSize = 12
const hasMoreInfrastructure = ref(true)
const isLoadingInfrastructure = ref(true)
const isLoadingMoreInfrastructure = ref(false)
const infrastructureSearch = ref('')
const infrastructureTypeFilter = ref<string>('all')
const isCreateInfrastructureSheetOpen = ref(false)
const isEditInfrastructureSheetOpen = ref(false)
const selectedInfrastructure = ref<Infrastructure | null>(null)
const showDeleteInfrastructureDialog = ref(false)
const isDeletingInfrastructure = ref(false)
const showTutorialDialog = ref(false)
const tutorialContent = ref({ title: '', content: '' })
const isLoadingTutorial = ref(false)
const members = ref<BranchMember[]>([])
const membersTotal = ref(0)
const membersPage = ref(1)
const membersPageSize = 12
const hasMoreMembers = ref(true)
const isLoadingMembers = ref(true)
const isLoadingMoreMembers = ref(false)
const membersSearch = ref('')
const membersRoleFilter = ref<string>('all')
const updatingRoleMembershipId = ref<string | null>(null)
const showRemoveMemberDialog = ref(false)
const memberToRemove = ref<BranchMember | null>(null)
const isRemovingMember = ref(false)
const isJoining = ref(false)
const userMembership = ref<{ status: string; role?: string; rejectionReason?: string | null } | null>(null)
const pendingMemberships = ref<PendingMembership[]>([])
const isLoadingPendingRequests = ref(false)
const processingMembershipId = ref<string | null>(null)
const approveRole = ref<Record<string, string>>({})
const rejectReason = ref<Record<string, string>>({})

const nets = ref<any[]>([])
const netsTotal = ref(0)
const netsPage = ref(1)
const netsPageSize = 12
const hasMoreNets = ref(true)
const isLoadingNets = ref(true)
const isLoadingMoreNets = ref(false)
const netsSearch = ref('')
const netsStatusFilter = ref<string>('all')
const isCreateNetSheetOpen = ref(false)
const showPendingRequestsSheet = ref(false)

const canManage = computed(() => {
  return authStore.isSuperAdmin
})

const hasPendingRequest = computed(() => {
  return userMembership.value?.status === 'pending'
})

const hasRejectedMembership = computed(() => {
  return userMembership.value?.status === 'rejected'
})

const canJoin = computed(() => {
  return !userMembership.value && authStore.isAuthenticated
})

const isBranchMember = computed(() => userMembership.value?.status === 'approved')

const canManageMembers = computed(() => {
  if (authStore.isSuperAdmin) return true
  
  if (!userMembership.value || userMembership.value.status !== 'approved') return false
  
  return userMembership.value?.role === 'admin' || userMembership.value?.role === 'president'
})

const canCreateNet = computed(() => {
  if (authStore.isSuperAdmin) return true
  if (!userMembership.value || userMembership.value.status !== 'approved') return false
  return userMembership.value?.role === 'member' || 
         userMembership.value?.role === 'admin' || 
         userMembership.value?.role === 'president' ||
         userMembership.value?.role === 'volunteer'
})

const canRemoveMember = (member: BranchMember) => {
  if (!canManageMembers.value) return false
  if (member.user?.globalRole === 'super_admin') return false
  if (branch.value?.isHeadquarters) return false
  if (member.userId === authStore.user?.id) return false
  return true
}

const canChangeRole = (member: BranchMember) => {
  if (!canManageMembers.value) return false
  if (member.user?.globalRole === 'super_admin') return false
  if (member.userId === authStore.user?.id) return false
  return true
}

const typeLabel = computed(() => {
  if (!branch.value) return ''
  return branch.value.type === 'branch' ? t('branches.typeBranch') : t('branches.typeRepresentative')
})

const branchCallSignsSorted = computed(() => {
  if (!branch.value?.callSigns?.length) return []
  const list = [...branch.value.callSigns]
  return list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
})

const renderMarkdown = (content: string) => {
  if (!content) return ''
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 leading-relaxed">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-1 space-y-0">$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 leading-relaxed">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, ' ')
}

const fetchBranch = async () => {
  try {
    const data = await api.get<Branch>(`/branches/${route.params.id}`)
    branch.value = data
  } catch (error) {
    router.push('/branches')
  } finally {
    isLoading.value = false
  }
}

const fetchMembers = async (append = false) => {
  if (!route.params.id) return
  if (!userMembership.value || userMembership.value.status !== 'approved') return
  if (append) {
    isLoadingMoreMembers.value = true
  } else {
    isLoadingMembers.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(membersPage.value))
    params.set('pageSize', String(membersPageSize))
    if (membersSearch.value) params.set('search', membersSearch.value)
    if (membersRoleFilter.value !== 'all') params.set('role', membersRoleFilter.value)

    const response = await api.get<{ data: BranchMember[]; total: number }>(`/branches/${route.params.id}/members?${params.toString()}`)
    
    if (append) {
      members.value = [...members.value, ...response.data]
    } else {
      members.value = response.data
    }
    
    membersTotal.value = response.total
    hasMoreMembers.value = members.value.length < response.total
  } catch {
    members.value = []
  } finally {
    isLoadingMembers.value = false
    isLoadingMoreMembers.value = false
  }
}

const loadMoreMembers = () => {
  membersPage.value++
  fetchMembers(true)
}

const checkMembership = async () => {
  if (!route.params.id || !authStore.isAuthenticated) return
  try {
    const memberships = await api.get<any[]>('/users/me/memberships')
    userMembership.value = memberships.find(m => m.branchId === route.params.id) || null
  } catch (error) {
    console.error('Failed to check membership:', error)
  }
}

const fetchPendingRequests = async () => {
  const branchId = route.params.id as string
  if (!branchId || !canManageMembers.value) return
  isLoadingPendingRequests.value = true
  try {
    pendingMemberships.value = await api.get<PendingMembership[]>(`/branches/${branchId}/pending-requests`)
  } catch {
    pendingMemberships.value = []
  } finally {
    isLoadingPendingRequests.value = false
  }
}

const getMemberLabel = (m: PendingMembership): string => {
  if (m.user?.operator?.callSign) return m.user.operator.callSign
  return m.user?.fullName || m.userId.slice(0, 8)
}

const approveMembership = async (userId: string, membershipId: string) => {
  const branchId = route.params.id as string
  if (!branchId) return
  processingMembershipId.value = membershipId
  try {
    const role = approveRole.value[membershipId] || 'member'
    await api.patch(`/branches/${branchId}/members/${userId}/approve`, { role })
    toast.success(t('admin.roleUpdated'))
    await fetchPendingRequests()
    await fetchMembers()
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

const rejectMembership = async (userId: string, membershipId: string) => {
  const branchId = route.params.id as string
  if (!branchId) return
  processingMembershipId.value = membershipId
  try {
    await api.patch(`/branches/${branchId}/members/${userId}/reject`, {
      rejectionReason: rejectReason.value[membershipId] || undefined,
    })
    toast.success(t('admin.reject'))
    await fetchPendingRequests()
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

const joinBranch = async () => {
  if (!route.params.id || isJoining.value) return
  isJoining.value = true
  try {
    await api.post(`/branches/${route.params.id}/members`)
    toast.success(t('memberships.requestSent'))
    await checkMembership()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isJoining.value = false
  }
}

const updateMemberRole = async (membershipId: string, role: string) => {
  if (!route.params.id) return
  updatingRoleMembershipId.value = membershipId
  try {
    await api.patch(`/branches/${route.params.id}/members/${membershipId}/role`, { role })
    toast.success(t('admin.roleUpdated'))
    await fetchMembers()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    updatingRoleMembershipId.value = null
  }
}

const openRemoveMemberDialog = (member: BranchMember) => {
  memberToRemove.value = member
  showRemoveMemberDialog.value = true
}

const confirmRemoveMember = async () => {
  if (!memberToRemove.value || !route.params.id || isRemovingMember.value) return
  isRemovingMember.value = true
  try {
    await api.delete(`/branches/${route.params.id}/members/${memberToRemove.value.userId}`)
    toast.success(t('branches.memberRemoved'))
    showRemoveMemberDialog.value = false
    memberToRemove.value = null
    await fetchMembers()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isRemovingMember.value = false
  }
}

const memberCallSign = (m: BranchMember) => {
  const op = m.user?.operator
  if (!op) return m.user?.fullName || '-'
  return formatCallSign({
    callSign: op.callSign ?? '',
    prefix: op.prefix,
    suffix: op.suffix
  })
}

const fetchInfrastructure = async (append = false) => {
  if (!route.params.id) return
  if (append) {
    isLoadingMoreInfrastructure.value = true
  } else {
    isLoadingInfrastructure.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(infrastructurePage.value))
    params.set('pageSize', String(infrastructurePageSize))
    if (canManage.value) params.set('includeInactive', 'true')
    if (infrastructureSearch.value) params.set('search', infrastructureSearch.value)
    if (infrastructureTypeFilter.value !== 'all') params.set('type', infrastructureTypeFilter.value)

    const response = await api.get<{ data: Infrastructure[]; total: number }>(`/branches/${route.params.id}/communication-channel?${params.toString()}`)
    
    if (append) {
      infrastructure.value = [...infrastructure.value, ...response.data]
    } else {
      infrastructure.value = response.data
    }
    
    infrastructureTotal.value = response.total
    hasMoreInfrastructure.value = infrastructure.value.length < response.total
  } catch (error) {
    console.error('Failed to fetch infrastructure:', error)
  } finally {
    isLoadingInfrastructure.value = false
    isLoadingMoreInfrastructure.value = false
  }
}

const loadMoreInfrastructure = () => {
  infrastructurePage.value++
  fetchInfrastructure(true)
}

const handleInfrastructureCreated = async () => {
  await fetchInfrastructure()
}

const handleInfrastructureUpdated = async () => {
  await fetchInfrastructure()
}

const openEditInfrastructure = (infra: Infrastructure) => {
  selectedInfrastructure.value = infra
  isEditInfrastructureSheetOpen.value = true
}

const activeNetsCount = ref(0)
const isLoadingActiveNets = ref(false)

const openDeleteInfrastructureDialog = async (infra: Infrastructure) => {
  selectedInfrastructure.value = infra
  showDeleteInfrastructureDialog.value = true
  
  // Check for active nets using this infrastructure
  isLoadingActiveNets.value = true
  try {
    const response = await api.get<{ count: number }>(`/communication-channel/${infra.id}/active-nets`)
    activeNetsCount.value = response.count || 0
  } catch (error) {
    console.error('Failed to check active nets:', error)
    activeNetsCount.value = 0
  } finally {
    isLoadingActiveNets.value = false
  }
}

const deleteInfrastructure = async () => {
  if (!selectedInfrastructure.value || isDeletingInfrastructure.value) return

  if (activeNetsCount.value > 0) {
    toast.error(t('communicationChannels.cannotDeleteWithActiveNets', { count: activeNetsCount.value }))
    return
  }

  isDeletingInfrastructure.value = true
  try {
    await api.delete(`/communication-channel/${selectedInfrastructure.value.id}`)
    await fetchInfrastructure()
    toast.success(t('communicationChannels.deleteSuccess'))
    showDeleteInfrastructureDialog.value = false
    activeNetsCount.value = 0
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeletingInfrastructure.value = false
  }
}

const showDeactivateInfrastructureDialog = ref(false)
const isDeactivatingInfrastructure = ref(false)

const openDeactivateInfrastructureDialog = async (infra: Infrastructure) => {
  selectedInfrastructure.value = infra
  showDeactivateInfrastructureDialog.value = true
  
  // Check for active nets using this infrastructure
  isLoadingActiveNets.value = true
  try {
    const response = await api.get<{ count: number }>(`/communication-channel/${infra.id}/active-nets`)
    activeNetsCount.value = response.count || 0
  } catch (error) {
    console.error('Failed to check active nets:', error)
    activeNetsCount.value = 0
  } finally {
    isLoadingActiveNets.value = false
  }
}

const confirmDeactivateInfrastructure = async () => {
  if (!selectedInfrastructure.value || isDeactivatingInfrastructure.value) return

  isDeactivatingInfrastructure.value = true
  try {
    await api.patch(`/communication-channel/${selectedInfrastructure.value.id}`, {
      isActive: false
    })
    await fetchInfrastructure()
    toast.success(t('communicationChannels.deactivated'))
    showDeactivateInfrastructureDialog.value = false
    activeNetsCount.value = 0
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeactivatingInfrastructure.value = false
  }
}

const toggleInfrastructureStatus = async (infra: Infrastructure) => {
  if (infra.isActive) {
    // For deactivation, show dialog with warning if active nets exist
    await openDeactivateInfrastructureDialog(infra)
  } else {
    // For activation, proceed directly
    try {
      await api.patch(`/communication-channel/${infra.id}`, {
        isActive: true
      })
      await fetchInfrastructure()
      toast.success(t('communicationChannels.activated'))
    } catch (error) {
      const err = error as ApiError
      toast.error(translateError(err.message))
    }
  }
}

const openTutorial = async (type: InfrastructureType) => {
  isLoadingTutorial.value = true
  showTutorialDialog.value = true
  try {
    const data = await api.get<{ title: string; content: string }>(`/communication-channel/tutorials/${type}`)
    tutorialContent.value = data
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
    showTutorialDialog.value = false
  } finally {
    isLoadingTutorial.value = false
  }
}

const openEdit = () => {
  isEditSheetOpen.value = true
}

const handleBranchUpdated = async () => {
  await fetchBranch()
}

const openDeleteDialog = () => {
  showDeleteDialog.value = true
}

const deleteBranch = async () => {
  if (!branch.value || isDeleting.value) return

  isDeleting.value = true
  try {
    await api.patch(`/branches/${branch.value.id}/status`, {
      isActive: false
    })
    await fetchBranch()
    toast.success(t('branches.deleteSuccess'))
    showDeleteDialog.value = false
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

const openRestoreDialog = () => {
  showRestoreDialog.value = true
}

const handleRestore = async () => {
  if (!branch.value || isRestoring.value) return

  isRestoring.value = true
  try {
    await api.patch(`/branches/${branch.value.id}/status`, {
      isActive: true
    })
    await fetchBranch()
    toast.success(t('branches.restored'))
    showRestoreDialog.value = false
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isRestoring.value = false
  }
}

let membersSearchTimeout: ReturnType<typeof setTimeout> | null = null
let infrastructureSearchTimeout: ReturnType<typeof setTimeout> | null = null

const handleMembersSearchChange = () => {
  if (membersSearchTimeout) clearTimeout(membersSearchTimeout)
  membersSearchTimeout = setTimeout(() => {
    membersPage.value = 1
    fetchMembers()
  }, 300)
}

const handleMembersFilterChange = () => {
  membersPage.value = 1
  fetchMembers()
}

const handleInfrastructureSearchChange = () => {
  if (infrastructureSearchTimeout) clearTimeout(infrastructureSearchTimeout)
  infrastructureSearchTimeout = setTimeout(() => {
    infrastructurePage.value = 1
    fetchInfrastructure()
  }, 300)
}

const handleInfrastructureFilterChange = () => {
  infrastructurePage.value = 1
  fetchInfrastructure()
}

const fetchNets = async (append = false) => {
  if (!route.params.id) return
  if (append) {
    isLoadingMoreNets.value = true
  } else {
    isLoadingNets.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(netsPage.value))
    params.set('pageSize', String(netsPageSize))
    if (netsSearch.value) params.set('search', netsSearch.value)
    if (netsStatusFilter.value !== 'all') params.set('status', netsStatusFilter.value)

    const response = await api.get<any[] | { data: any[]; total: number }>(`/branches/${route.params.id}/nets?${params.toString()}`)
    const data = Array.isArray(response) ? response : (response?.data ?? [])
    const total = Array.isArray(response) ? response.length : (response?.total ?? 0)

    if (append) {
      nets.value = [...nets.value, ...data]
    } else {
      nets.value = data
    }

    netsTotal.value = total
    hasMoreNets.value = nets.value.length < total
  } catch (error) {
    console.error('Failed to fetch nets:', error)
    nets.value = []
    hasMoreNets.value = false
    netsTotal.value = 0
  } finally {
    isLoadingNets.value = false
    isLoadingMoreNets.value = false
  }
}

const loadMoreNets = () => {
  netsPage.value++
  fetchNets(true)
}

const handleNetCreated = async () => {
  await fetchNets()
}

const getNetStatus = (net: any): 'active' | 'pending' | 'completed' => {
  if (net.endedAt) return 'completed'
  if (net.startedAt) return 'active'
  return 'pending'
}

const filteredNets = computed(() => {
  let list = nets.value
  const search = netsSearch.value.trim().toLowerCase()
  if (search) {
    list = list.filter((net) => {
      const name = (net.name ?? '').toLowerCase()
      const callSign = (net.operator?.callSign ?? '').toLowerCase()
      const branchCallSign = (net.branchCallSign?.callSign ?? '').toLowerCase()
      return name.includes(search) || callSign.includes(search) || branchCallSign.includes(search)
    })
  }
  const statusFilter = netsStatusFilter.value
  if (statusFilter !== 'all') {
    list = list.filter((net) => getNetStatus(net) === statusFilter)
  }
  return list
})

const branchId = computed(() => route.params.id as string)
const branchInfrastructureFilterKey = computed(() => `branch-detail-infrastructure-${branchId.value}`)
const branchMembersFilterKey = computed(() => `branch-detail-members-${branchId.value}`)
const branchNetsFilterKey = computed(() => `branch-detail-nets-${branchId.value}`)
usePersistedFilters(branchInfrastructureFilterKey, { infrastructureSearch, infrastructureTypeFilter })
usePersistedFilters(branchMembersFilterKey, { membersSearch, membersRoleFilter })
usePersistedFilters(branchNetsFilterKey, { netsSearch, netsStatusFilter })

watch(membersSearch, handleMembersSearchChange)
watch(membersRoleFilter, handleMembersFilterChange)
watch(infrastructureSearch, handleInfrastructureSearchChange)
watch(infrastructureTypeFilter, handleInfrastructureFilterChange)

watch(
  userMembership,
  (m) => {
    if (m?.status === 'approved') {
      fetchMembers()
      if (canManageMembers.value) fetchPendingRequests()
    } else {
      isLoadingMembers.value = false
      members.value = []
      pendingMemberships.value = []
    }
  },
  { immediate: true }
)

watch(showPendingRequestsSheet, (open) => {
  if (open && canManageMembers.value) fetchPendingRequests()
})

onMounted(() => {
  fetchBranch()
  checkMembership()
  fetchInfrastructure()
  fetchNets()
})
</script>

<template>
  <AppLayout
    :title="branch ? typeLabel : t('common.loading')"
    :breadcrumb-label="branch?.name"
  >
    <div v-if="isLoading" class="space-y-4">
      <div class="animate-pulse flex flex-col sm:flex-row gap-6">
        <div class="h-24 w-24 rounded-lg bg-muted flex-shrink-0 self-center sm:self-start" />
        <div class="flex-1 space-y-3">
          <div class="h-7 w-32 bg-muted rounded mx-auto sm:mx-0" />
          <div class="h-5 w-48 bg-muted rounded mx-auto sm:mx-0" />
        </div>
      </div>
    </div>

    <div v-else-if="branch" class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0 flex-1">
          <div class="flex justify-center sm:justify-start shrink-0">
            <div class="h-24 w-24 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              <img src="/logo-s.svg" alt="" class="h-14 w-14 object-contain" />
            </div>
          </div>
          <div class="min-w-0 flex-1 space-y-3">
            <div v-if="!branch.isHeadquarters && branchCallSignsSorted.length > 0" class="flex flex-wrap items-center gap-2 mb-1">
              <span
                v-for="cs in branchCallSignsSorted"
                :key="cs.id"
                class="font-mono text-sm"
                :class="cs.isDefault ? 'font-bold' : 'font-normal text-muted-foreground'"
              >
                {{ cs.callSign }}
              </span>
            </div>
            <h1 class="text-2xl font-bold min-w-0">{{ branch.name }}</h1>
            <div v-if="(!branch.isHeadquarters && branch.city) || branch.address || branch.phone || branch.email" class="flex min-w-0 flex-1 flex-col gap-y-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
              <span v-if="!branch.isHeadquarters && branch.city" class="flex items-center gap-1.5">
                {{ branch.city }}
              </span>
              <span v-if="branch.address" class="flex items-center gap-1.5">
                <MapPin class="h-4 w-4 shrink-0" />
                {{ branch.address }}
              </span>
              <span v-if="branch.phone" class="flex items-center gap-1.5">
                {{ branch.phone }}
              </span>
              <span v-if="branch.email" class="flex items-center gap-1.5">
                <Mail class="h-4 w-4 shrink-0" />
                {{ branch.email }}
              </span>
            </div>
            <span v-if="!branch.isActive" class="text-xs font-medium text-red-600 dark:text-red-400">
              {{ t('branches.deleted') }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0 sm:ml-4">
          <Button v-if="canJoin && branch.isActive" @click="joinBranch" :disabled="isJoining" variant="outline" size="sm">
            <Users class="h-4 w-4 mr-2" />
            {{ t('branches.joinBranch') }}
          </Button>
          <span v-if="hasPendingRequest" class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {{ t('memberships.pending') }}
          </span>
          <div v-if="hasRejectedMembership" class="flex flex-col gap-1">
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 w-fit">
              {{ t('memberships.rejected') }}
            </span>
            <p v-if="userMembership?.rejectionReason" class="text-xs text-muted-foreground max-w-md">
              {{ t('memberships.rejectedReasonDescription') }} {{ userMembership.rejectionReason }}
            </p>
          </div>
          <template v-if="canManage">
            <template v-if="branch.isActive">
              <Button variant="outline" size="icon-sm" @click="openEdit">
                <Edit class="h-4 w-4" />
              </Button>
              <Button
                v-if="!branch.isHeadquarters"
                variant="outline"
                size="icon-sm"
                class="text-red-600 hover:text-red-700"
                @click="openDeleteDialog"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </template>
            <template v-else>
              <Button variant="outline" size="icon-sm" class="text-green-600 hover:text-green-700 dark:text-green-500" @click="openRestoreDialog">
                <RotateCcw class="h-4 w-4" />
              </Button>
            </template>
          </template>
        </div>
      </div>

      <Separator class="my-8" />

      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <TowerControl class="h-4 w-4" />
          {{ t('communicationChannels.title') }}
        </h3>
        <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
          <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
            <SearchInput
              v-model="infrastructureSearch"
              :placeholder="t('communicationChannels.searchPlaceholder')"
            />
            <Select v-model="infrastructureTypeFilter" class="w-full min-w-0">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('communicationChannels.typeAll') }}</SelectItem>
                <SelectItem value="vhf_uhf_repeater">{{ t('communicationChannels.vhf_uhf_repeater') }}</SelectItem>
                <SelectItem value="echolink">{{ t('communicationChannels.echolink') }}</SelectItem>
                <SelectItem value="aprs">{{ t('communicationChannels.aprs') }}</SelectItem>
                <SelectItem value="hf">{{ t('communicationChannels.hf') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
            <Button
              v-if="canManage && branch.isActive"
              variant="outline"
              size="sm"
              @click="isCreateInfrastructureSheetOpen = true"
              class="gap-2"
            >
              <Plus class="h-4 w-4" />
              {{ t('communicationChannels.create') }}
            </Button>
          </div>
        </div>
        <div v-if="isLoadingInfrastructure" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <InfrastructureCardSkeleton v-for="i in 6" :key="i" class="h-full" />
        </div>
        <div v-else-if="infrastructure.length === 0" class="text-center py-8">
          <TowerControl class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p class="text-sm text-muted-foreground">{{ t('communicationChannels.noInfrastructure') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
          <div v-for="infra in infrastructure" :key="infra.id" class="flex">
            <InfrastructureCard
              class="w-full flex flex-col"
              :id="infra.id"
              :name="infra.name"
              :type="infra.type"
              :is-active="infra.isActive"
              :description="infra.description"
              :location="infra.location"
              :district="infra.district"
              :latitude="infra.latitude"
              :longitude="infra.longitude"
              :altitude="infra.altitude"
              :coverage="infra.coverage"
              :rx-frequency="infra.rxFrequency"
              :tx-frequency="infra.txFrequency"
              :offset="infra.offset"
              :tx-ctcss-tone="infra.txCtcssTone"
              :rx-ctcss-tone="infra.rxCtcssTone"
              :tx-dcs-code="infra.txDcsCode"
              :rx-dcs-code="infra.rxDcsCode"
              :echolink-node="infra.echolinkNode"
              :echolink-name="infra.echolinkName"
              :aprs-frequency="infra.aprsFrequency"
              :aprs-is-igate="infra.aprsIsIgate"
              :aprs-is-digipeater="infra.aprsIsDigipeater"
              :aprs-igate-mode="infra.aprsIgateMode"
              :aprs-digipeater-type="infra.aprsDigipeaterType"
              :aprs-path="infra.aprsPath"
              :aprs-server="infra.aprsServer"
              :digipeater="infra.digipeater"
              :hf-frequency-range="infra.hfFrequencyRange"
              :hf-mode="infra.hfMode"
            >
              <template v-if="infra.isActive" #top-right>
                <Button variant="ghost" size="icon" class="h-7 w-7 rounded-full" :title="t('communicationChannels.howToConnect')" @click.stop="openTutorial(infra.type)">
                  <BookOpen class="h-3.5 w-3.5" />
                </Button>
              </template>
              <template v-if="canManage" #actions>
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click.stop="openEditInfrastructure(infra)">
                    <Edit class="h-3.5 w-3.5 mr-1.5" />
                    {{ t('common.edit') }}
                  </Button>
                  <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click.stop="infra.isActive ? openDeactivateInfrastructureDialog(infra) : toggleInfrastructureStatus(infra)">
                    <Power v-if="infra.isActive" class="h-3.5 w-3.5 mr-1.5" />
                    <PowerOff v-else class="h-3.5 w-3.5 mr-1.5" />
                    {{ infra.isActive ? t('communicationChannels.deactivate') : t('communicationChannels.activate') }}
                  </Button>
                  <Button variant="ghost" size="sm" class="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" @click.stop="openDeleteInfrastructureDialog(infra)">
                    <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                    {{ t('common.delete') }}
                  </Button>
                </div>
              </template>
            </InfrastructureCard>
          </div>
        </div>
        <div v-if="!isLoadingInfrastructure" class="flex flex-wrap items-center justify-between gap-2 pt-4">
          <p class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ infrastructure.length }}/{{ infrastructureTotal }} {{ t('communicationChannels.name') }}
          </p>
          <div v-if="hasMoreInfrastructure" class="order-1 lg:order-2 w-full lg:w-auto">
            <Button variant="outline" class="w-full lg:w-auto lg:px-8" :disabled="isLoadingMoreInfrastructure" @click="loadMoreInfrastructure">
              {{ isLoadingMoreInfrastructure ? t('common.loading') : t('communicationChannels.loadMore') }}
            </Button>
          </div>
        </div>
      </section>

      <Separator class="my-8" />

      <template v-if="isBranchMember">
        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Users class="h-4 w-4" />
            {{ t('branches.members') }}
          </h3>
          <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
            <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
              <div class="relative min-w-0">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="membersSearch"
                  :placeholder="t('operators.searchPlaceholder')"
                  class="pl-9 w-full"
                />
              </div>
              <Select v-model="membersRoleFilter" class="w-full min-w-0">
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
              <Button
                v-if="canManageMembers && pendingMemberships.length > 0"
                variant="outline"
                size="sm"
                class="border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-2"
                @click="showPendingRequestsSheet = true"
              >
                <Users class="h-4 w-4" />
                {{ t('admin.membershipRequests') }} ({{ pendingMemberships.length }})
              </Button>
              <Button
                v-if="canManageMembers && !branch.isHeadquarters"
                variant="outline"
                size="sm"
                @click="showAddMemberSheet = true"
                class="gap-2"
              >
                <Plus class="h-4 w-4" />
                {{ t('branches.addMember') }}
              </Button>
            </div>
          </div>

          <div v-if="isLoadingMembers" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="h-20 bg-muted rounded-lg animate-pulse" />
          </div>
          <div v-else-if="members.length === 0" class="text-center py-8">
            <Users class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p class="text-sm text-muted-foreground">{{ t('branches.noMembers') }}</p>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <MemberCard
              v-for="m in members"
              :key="m.id"
              :id="m.id"
              :user-id="m.userId"
              :operator-id="m.user.operator?.id"
              :role="m.role"
              :user="m.user"
              :can-manage="canManageMembers"
              :can-change-role="canChangeRole(m)"
              :can-remove="canRemoveMember(m)"
              @role-change="updateMemberRole"
              @remove="openRemoveMemberDialog(m)"
            />
          </div>

          <div v-if="!isLoadingMembers" class="flex flex-wrap items-center justify-between gap-2 pt-4">
            <p class="text-sm text-muted-foreground order-2 lg:order-1">
              {{ members.length }}/{{ membersTotal }} {{ t('branches.members') }}
            </p>
            <div v-if="hasMoreMembers" class="order-1 lg:order-2 w-full lg:w-auto">
              <Button
                variant="outline"
                class="w-full lg:w-auto lg:px-8"
                :disabled="isLoadingMoreMembers"
                @click="loadMoreMembers"
              >
                {{ isLoadingMoreMembers ? t('common.loading') : t('branches.loadMore') }}
              </Button>
            </div>
          </div>
        </section>
      </template>

      <Separator class="my-8" />

      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Radio class="h-4 w-4" />
          {{ t('nets.nets') }}
        </h3>
        <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
          <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
            <SearchInput
              v-model="netsSearch"
              :placeholder="t('nets.searchPlaceholder')"
            />
            <Select v-model="netsStatusFilter" class="w-full min-w-0">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('nets.filterAll') }}</SelectItem>
                <SelectItem value="active">{{ t('nets.filterActive') }}</SelectItem>
                <SelectItem value="pending">{{ t('nets.filterPending') }}</SelectItem>
                <SelectItem value="completed">{{ t('nets.filterCompleted') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
            <Button
              v-if="canCreateNet && branch.isActive"
              variant="outline"
              size="sm"
              @click="isCreateNetSheetOpen = true"
              class="gap-2"
            >
              <Plus class="h-4 w-4" />
              {{ t('nets.createNet') }}
            </Button>
          </div>
        </div>

        <div v-if="isLoadingNets" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <NetCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else-if="filteredNets.length === 0" class="text-center py-8">
          <Radio class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p class="text-sm text-muted-foreground">
            {{ nets.length === 0 ? t('nets.noNetsInBranch') : t('nets.noResults') }}
          </p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <NetCard
            v-for="net in filteredNets"
            :key="net.id"
            :id="net.id"
            :name="net.name"
            :operator-call-sign="net.operator?.callSign ?? ''"
            :frequency="net.frequency"
            :mode="net.mode"
            :status="getNetStatus(net)"
            :attendee-count="net.attendeeCount"
            :started-at="net.startedAt"
            :ended-at="net.endedAt"
          />
        </div>

        <div v-if="!isLoadingNets" class="flex flex-wrap items-center justify-between gap-2 pt-4">
          <p class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ filteredNets.length }}/{{ netsTotal }} {{ t('nets.name') }}
          </p>
          <div v-if="hasMoreNets && filteredNets.length > 0" class="order-1 lg:order-2 w-full lg:w-auto">
            <Button
              variant="outline"
              class="w-full lg:w-auto lg:px-8"
              :disabled="isLoadingMoreNets"
              @click="loadMoreNets"
            >
              {{ isLoadingMoreNets ? t('common.loading') : t('nets.loadMore') }}
            </Button>
          </div>
        </div>
      </section>
    </div>

    <EditBranchSheet
      v-if="branch"
      :open="isEditSheetOpen"
      :branch="branch"
      @update:open="isEditSheetOpen = $event"
      @updated="handleBranchUpdated"
    />

    <AddMemberSheet
      v-if="branch"
      :open="showAddMemberSheet"
      :branch-id="branch.id"
      @update:open="showAddMemberSheet = $event"
      @added="fetchMembers"
    />

    <Sheet :open="showPendingRequestsSheet" @update:open="showPendingRequestsSheet = $event">
      <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>{{ t('admin.membershipRequests') }}</SheetTitle>
          <SheetDescription>{{ t('admin.pendingRequestsDescription') }}</SheetDescription>
        </SheetHeader>
        <div class="py-6">
          <div v-if="isLoadingPendingRequests" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-14 bg-muted rounded-lg animate-pulse" />
          </div>
          <p v-else-if="pendingMemberships.length === 0" class="text-sm text-muted-foreground py-2">
            {{ t('admin.noMembershipRequests') }}
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="m in pendingMemberships"
              :key="m.id"
              class="py-3 border-b border-border/50 last:border-0 space-y-3"
            >
              <div class="min-w-0">
                <p class="font-medium">{{ getMemberLabel(m) }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDateSimple(m.createdAt) }}</p>
              </div>
              <div class="space-y-3">
                <div class="flex flex-col gap-2">
                  <label class="text-xs text-muted-foreground font-medium">{{ t('memberships.role') }}:</label>
                  <Select
                    :model-value="approveRole[m.id] || 'member'"
                    @update:model-value="(v) => (approveRole[m.id] = String(v ?? 'member'))"
                  >
                    <SelectTrigger class="w-28 h-8">
                      <SelectValue :placeholder="t('admin.approveWithRole')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volunteer">{{ t('roles.volunteer') }}</SelectItem>
                      <SelectItem value="member">{{ t('roles.member') }}</SelectItem>
                      <SelectItem value="admin">{{ t('roles.admin') }}</SelectItem>
                      <SelectItem value="president">{{ t('roles.president') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="processingMembershipId === m.id"
                    class="text-green-600 hover:text-green-700"
                    @click="approveMembership(m.userId, m.id)"
                  >
                    <Check class="h-4 w-4 mr-1" />
                    {{ t('admin.approve') }}
                  </Button>
                </div>
                <Separator class="my-3" />
                <div class="flex flex-col gap-2">
                  <label class="text-xs text-muted-foreground font-medium">{{ t('memberships.rejectionReason') }}</label>
                  <Input
                    v-model="rejectReason[m.id]"
                    class="h-8 text-xs"
                    :placeholder="t('admin.rejectionReasonOptional')"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="processingMembershipId === m.id"
                  class="text-red-600 hover:text-red-700 w-fit"
                  @click="rejectMembership(m.userId, m.id)"
                >
                  <X class="h-4 w-4 mr-1" />
                  {{ t('admin.reject') }}
                </Button>
              </div>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ t('branches.deleteConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            {{ t('branches.deleteConfirmDescription') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="deleteBranch"
            :disabled="isDeleting"
            class="text-red-600 hover:text-red-700"
          >
            {{ isDeleting ? t('common.loading') : t('branches.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showRestoreDialog" @update:open="showRestoreDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ t('branches.restoreConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            {{ t('branches.restoreConfirmDescription') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRestoreDialog = false" :disabled="isRestoring">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="handleRestore"
            :disabled="isRestoring"
            class="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-600"
          >
            {{ isRestoring ? t('common.loading') : t('branches.restore') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CreateCommChannelSheet
      v-if="branch"
      :open="isCreateInfrastructureSheetOpen"
      :branch-id="branch.id"
      :branch-city="branch.city"
      @update:open="isCreateInfrastructureSheetOpen = $event"
      @created="handleInfrastructureCreated"
    />

    <CreateNetSheet
      v-if="branch"
      :open="isCreateNetSheetOpen"
      :default-branch-id="branch.id"
      @update:open="isCreateNetSheetOpen = $event"
      @created="handleNetCreated"
    />

    <EditCommChannelSheet
      v-if="selectedInfrastructure"
      :open="isEditInfrastructureSheetOpen"
      :infrastructure="selectedInfrastructure"
      :branch-city="branch?.city"
      @update:open="isEditInfrastructureSheetOpen = $event"
      @updated="handleInfrastructureUpdated"
    />

    <Dialog :open="showDeleteInfrastructureDialog" @update:open="showDeleteInfrastructureDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ t('communicationChannels.deleteConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            <div v-if="isLoadingActiveNets" class="py-2">
              {{ t('common.loading') }}
            </div>
            <div v-else>
              <p>{{ t('communicationChannels.deleteConfirmDescription') }}</p>
              <p v-if="activeNetsCount > 0" class="mt-2 text-amber-600 dark:text-amber-500 font-medium">
                {{ t('communicationChannels.cannotDeleteWithActiveNets', { count: activeNetsCount }) }}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteInfrastructureDialog = false" :disabled="isDeletingInfrastructure">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="deleteInfrastructure"
            :disabled="isDeletingInfrastructure || activeNetsCount > 0"
            class="text-red-600 hover:text-red-700"
          >
            {{ isDeletingInfrastructure ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeactivateInfrastructureDialog" @update:open="showDeactivateInfrastructureDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ t('communicationChannels.deactivateConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            <div v-if="isLoadingActiveNets" class="py-2">
              {{ t('common.loading') }}
            </div>
            <div v-else>
              <p>{{ t('communicationChannels.deactivateConfirmDescription') }}</p>
              <p v-if="activeNetsCount > 0" class="mt-2 text-amber-600 dark:text-amber-500 font-medium">
                {{ t('communicationChannels.activeNetsWarning', { count: activeNetsCount }) }}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeactivateInfrastructureDialog = false" :disabled="isDeactivatingInfrastructure">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="confirmDeactivateInfrastructure"
            :disabled="isDeactivatingInfrastructure"
            class="text-amber-600 hover:text-amber-700"
          >
            {{ isDeactivatingInfrastructure ? t('common.loading') : t('communicationChannels.deactivate') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ tutorialContent.title || t('communicationChannels.tutorial') }}
          </DialogTitle>
        </DialogHeader>
        <div v-if="isLoadingTutorial" class="py-8 text-center">
          <p class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
        </div>
        <div v-else class="tutorial-content text-sm" v-html="renderMarkdown(tutorialContent.content)" />
        <DialogFooter>
          <Button variant="outline" @click="showTutorialDialog = false">
            {{ t('common.close') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showRemoveMemberDialog" @update:open="showRemoveMemberDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('branches.removeMemberConfirmTitle') }}</DialogTitle>
          <DialogDescription>
            {{ t('branches.removeMemberConfirmDescription') }}
            <span v-if="memberToRemove" class="block mt-2 font-medium">
              {{ memberCallSign(memberToRemove) }}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRemoveMemberDialog = false" :disabled="isRemovingMember">
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="confirmRemoveMember"
            :disabled="isRemovingMember"
            class="text-red-600 hover:text-red-700"
          >
            {{ isRemovingMember ? t('common.loading') : t('branches.removeMember') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
