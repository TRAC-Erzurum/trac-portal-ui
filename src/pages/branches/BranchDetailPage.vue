<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Award, CalendarRange, Check, ChevronDown, ChevronRight, Edit, Mail, MapPin, Package, Phone, Plus, Radio, Search, TowerControl, Trash2, Users, X } from 'lucide-vue-next'
import EditBranchSheet from '@/components/branches/EditBranchSheet.vue'
import AddMemberSheet from '@/components/branches/AddMemberSheet.vue'
import EquipmentCard from '@/components/inventory/EquipmentCard.vue'
import EquipmentCardSkeleton from '@/components/inventory/EquipmentCardSkeleton.vue'
import CertificateTemplateCard from '@/components/certificates/CertificateTemplateCard.vue'
import CreateCertificateTemplateSheet from '@/components/certificates/CreateCertificateTemplateSheet.vue'
import EditCertificateTemplateSheet from '@/components/certificates/EditCertificateTemplateSheet.vue'
import type { CertificateTemplate } from '@/components/certificates/EditCertificateTemplateSheet.vue'
import CreateCommChannelSheet from '@/components/infrastructure/CreateCommChannelSheet.vue'
import EditCommChannelSheet from '@/components/infrastructure/EditCommChannelSheet.vue'
import CreateNetSheet from '@/components/nets/CreateNetSheet.vue'
import EditNetSchedulerSheet from '@/components/nets/EditNetSchedulerSheet.vue'
import SchedulerCard from '@/components/nets/SchedulerCard.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import CommunityModule from '@/components/dashboard/CommunityModule.vue'
import NetsAttendeesTrendWidget from '@/components/dashboard/widgets/NetsAttendeesTrendWidget.vue'
import { CommunicationChannelCard, CommunicationChannelCardSkeleton, MemberCard, NetCard, NetCardSkeleton, SearchInput } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAsyncStaleGuard, usePersistedFilters } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign, formatCommunicationChannelLabel } from '@/lib/formatters'
import { buildTutorialContent } from '@/lib/tutorial-content'
import type { CommunicationChannel } from '@/types/communication-channel'

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

interface BranchMember {
  id: string
  operatorId: string
  branchId: string
  role: string
  operator?: {
    id: string
    callSign?: string
    prefix?: string
    suffix?: string
    fullName?: string
    user?: {
      id: string
      fullName?: string
      picture?: string
      globalRole?: string
    } | null
  }
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const membersListGuard = useAsyncStaleGuard()
const branchChannelsListGuard = useAsyncStaleGuard()
const branchNetsListGuard = useAsyncStaleGuard()
const branchSchedulersListGuard = useAsyncStaleGuard()

const branch = ref<Branch | null>(null)
const isLoading = ref(true)
const isEditSheetOpen = ref(false)
const showAddMemberSheet = ref(false)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const deleteBranchNameConfirm = ref('')

const communityStats = ref<any>(null)
const isLoadingCommunity = ref(false)

const channels = ref<CommunicationChannel[]>([])
const channelsTotal = ref(0)
const channelPage = ref(1)
const channelPageSize = 6
const hasMoreChannels = ref(true)
const isLoadingChannels = ref(true)
const isLoadingMoreChannels = ref(false)
const channelSearch = ref('')
const channelTypeFilter = ref<string>('all')
const isCreateChannelSheetOpen = ref(false)
const isEditChannelSheetOpen = ref(false)
const selectedChannel = ref<CommunicationChannel | null>(null)
const showDeleteChannelDialog = ref(false)
const isDeletingChannel = ref(false)
const showTutorialDialog = ref(false)
const tutorialContent = ref({ title: '', content: '' })
const tutorialTitle = ref('')
const members = ref<BranchMember[]>([])
const membersTotal = ref(0)
const membersPage = ref(1)
const membersPageSize = 6
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

const nets = ref<any[]>([])
const netsTotal = ref(0)
const netsPage = ref(1)
const netsPageSize = 6
const hasMoreNets = ref(true)
const isLoadingNets = ref(true)
const isLoadingMoreNets = ref(false)
const netsSearch = ref('')
const netsStatusFilter = ref<string>('all')
const isCreateNetSheetOpen = ref(false)
const certificateTemplates = ref<CertificateTemplate[]>([])
const isLoadingCertificateTemplates = ref(false)
const isCreateCertificateTemplateSheetOpen = ref(false)
const isEditCertificateTemplateSheetOpen = ref(false)
const selectedCertificateTemplate = ref<CertificateTemplate | null>(null)
const showDeleteCertificateTemplateDialog = ref(false)
const isDeletingCertificateTemplate = ref(false)
const netsUsingCertificateTemplate = ref<{ id: string; name: string }[]>([])
const schedulers = ref<any[]>([])
const isLoadingSchedulers = ref(false)
const selectedSchedulerId = ref<string | null>(null)
const isEditSchedulerSheetOpen = ref(false)

const branchEquipment = ref<any[]>([])
const branchEquipmentTotal = ref(0)
const branchEquipmentLoading = ref(false)

const branchIdForAuth = computed(
  () => branch.value?.id ?? (route.params.id as string),
)

const canManage = computed(() =>
  authStore.canLeadBranch(branchIdForAuth.value),
)

/** Şube silme API yalnız süper admin */
const canDeleteBranch = computed(() => authStore.isSuperAdmin)

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

const canManageMembers = computed(() =>
  authStore.canLeadBranch(branchIdForAuth.value),
)

const canCreateNet = computed(() => {
  if (authStore.canLeadBranch(branchIdForAuth.value)) return true
  if (!userMembership.value || userMembership.value.status !== 'approved') return false
  return userMembership.value?.role === 'member' || 
         userMembership.value?.role === 'admin' || 
         userMembership.value?.role === 'president' ||
         userMembership.value?.role === 'volunteer'
})

const myOperatorId = computed(() => authStore.user?.operator?.id ?? null)

const canRemoveMember = (member: BranchMember) => {
  if (!canManageMembers.value) return false
  if (member.operator?.user?.globalRole === 'super_admin') return false
  if (branch.value?.isHeadquarters) return false
  if (member.operatorId === myOperatorId.value) return false
  return true
}

const canChangeRole = (member: BranchMember) => {
  if (!canManageMembers.value) return false
  if (member.operator?.user?.globalRole === 'super_admin') return false
  if (member.operatorId === myOperatorId.value) return false
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
    await fetchCommunityStats()
  } catch (error) {
    router.push('/branches')
  } finally {
    isLoading.value = false
  }
}

const communityPeriod = ref<'all' | '7d' | '30d'>('all')

const fetchCommunityStats = async () => {
  const branchId = route.params.id as string
  if (!branchId) return
  try {
    isLoadingCommunity.value = true
    communityStats.value = await api.get(
      `/insights/community?branchId=${branchId}&period=${communityPeriod.value}`
    )
  } catch {
    communityStats.value = null
  } finally {
    isLoadingCommunity.value = false
  }
}

watch(communityPeriod, () => {
  fetchCommunityStats()
})

const fetchMembers = async (append = false) => {
  if (!route.params.id) return
  if (!userMembership.value || userMembership.value.status !== 'approved') return
  const token = append ? membersListGuard.beginAppend() : membersListGuard.beginReplace()
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

    if (!membersListGuard.isCurrent(token)) {
      return
    }

    if (append) {
      members.value = [...members.value, ...response.data]
    } else {
      members.value = response.data
    }

    membersTotal.value = response.total
    hasMoreMembers.value = members.value.length < response.total
  } catch {
    if (!membersListGuard.isCurrent(token)) {
      return
    }
    members.value = []
  } finally {
    if (membersListGuard.isCurrent(token)) {
      isLoadingMembers.value = false
      isLoadingMoreMembers.value = false
    }
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
    await api.delete(`/branches/${route.params.id}/members/${memberToRemove.value.operatorId}`)
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
  const op = m.operator
  if (!op?.callSign) return op?.fullName || m.operator?.user?.fullName || '-'
  return formatCallSign({
    callSign: op.callSign ?? '',
    prefix: op.prefix,
    suffix: op.suffix
  })
}

function branchMemberCardUser(m: BranchMember): MemberCardUserPayload {
  const op = m.operator
  if (!op) {
    return {
      id: '',
      fullName: undefined,
      picture: undefined,
      globalRole: undefined,
      operator: undefined,
    }
  }
  const u = op.user
  return {
    id: u?.id ?? '',
    fullName: u?.fullName || op.fullName,
    picture: u?.picture,
    globalRole: u?.globalRole,
    operator: {
      id: op.id,
      callSign: op.callSign,
      prefix: op.prefix,
      suffix: op.suffix,
    },
  }
}

interface MemberCardUserPayload {
  id: string
  fullName?: string
  picture?: string
  globalRole?: string
  operator?: {
    id: string
    callSign?: string
    prefix?: string
    suffix?: string
  }
}

const fetchChannels = async (append = false) => {
  if (!route.params.id) return
  const token = append ? branchChannelsListGuard.beginAppend() : branchChannelsListGuard.beginReplace()
  if (append) {
    isLoadingMoreChannels.value = true
  } else {
    isLoadingChannels.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(channelPage.value))
    params.set('pageSize', String(channelPageSize))
    if (canManage.value) params.set('includeInactive', 'true')
    if (channelSearch.value) params.set('search', channelSearch.value)
    if (channelTypeFilter.value !== 'all') params.set('type', channelTypeFilter.value)

    const response = await api.get<{ data: CommunicationChannel[]; total: number }>(`/branches/${route.params.id}/communication-channel?${params.toString()}`)

    if (!branchChannelsListGuard.isCurrent(token)) {
      return
    }

    if (append) {
      channels.value = [...channels.value, ...response.data]
    } else {
      channels.value = response.data
    }

    channelsTotal.value = response.total
    hasMoreChannels.value = channels.value.length < response.total
  } catch (error) {
    if (!branchChannelsListGuard.isCurrent(token)) {
      return
    }
    console.error('Failed to fetch channels:', error)
  } finally {
    if (branchChannelsListGuard.isCurrent(token)) {
      isLoadingChannels.value = false
      isLoadingMoreChannels.value = false
    }
  }
}

const loadMoreChannels = () => {
  channelPage.value++
  fetchChannels(true)
}

const handleChannelCreated = async () => {
  await fetchChannels()
}

const handleChannelUpdated = async () => {
  await fetchChannels()
}

const openEditChannel = (channel: CommunicationChannel) => {
  selectedChannel.value = channel
  isEditChannelSheetOpen.value = true
}

const activeNetsCount = ref(0)
const isLoadingActiveNets = ref(false)

const openDeleteChannelDialog = async (channel: CommunicationChannel) => {
  selectedChannel.value = channel
  showDeleteChannelDialog.value = true
  
  // Check for active nets using this channels
  isLoadingActiveNets.value = true
  try {
    const response = await api.get<{ count: number }>(`/communication-channel/${channel.id}/active-nets`)
    activeNetsCount.value = response.count || 0
  } catch (error) {
    console.error('Failed to check active nets:', error)
    activeNetsCount.value = 0
  } finally {
    isLoadingActiveNets.value = false
  }
}

const deleteChannel = async () => {
  if (!selectedChannel.value || isDeletingChannel.value) return

  if (activeNetsCount.value > 0) {
    toast.error(t('communicationChannels.cannotDeleteWithActiveNets', { count: activeNetsCount.value }))
    return
  }

  isDeletingChannel.value = true
  try {
    await api.delete(`/communication-channel/${selectedChannel.value.id}`)
    await fetchChannels()
    toast.success(t('communicationChannels.deleteSuccess'))
    showDeleteChannelDialog.value = false
    activeNetsCount.value = 0
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeletingChannel.value = false
  }
}

const showDeactivateChannelDialog = ref(false)
const isDeactivatingChannel = ref(false)

const openDeactivateChannelDialog = async (channel: CommunicationChannel) => {
  selectedChannel.value = channel
  showDeactivateChannelDialog.value = true
  
  // Check for active nets using this channels
  isLoadingActiveNets.value = true
  try {
    const response = await api.get<{ count: number }>(`/communication-channel/${channel.id}/active-nets`)
    activeNetsCount.value = response.count || 0
  } catch (error) {
    console.error('Failed to check active nets:', error)
    activeNetsCount.value = 0
  } finally {
    isLoadingActiveNets.value = false
  }
}

const confirmDeactivateChannel = async () => {
  if (!selectedChannel.value || isDeactivatingChannel.value) return

  isDeactivatingChannel.value = true
  try {
    await api.patch(`/communication-channel/${selectedChannel.value.id}`, {
      isActive: false
    })
    await fetchChannels()
    toast.success(t('communicationChannels.deactivated'))
    showDeactivateChannelDialog.value = false
    activeNetsCount.value = 0
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeactivatingChannel.value = false
  }
}

const toggleChannelStatus = async (channel: CommunicationChannel) => {
  if (channel.isActive) {
    // For deactivation, show dialog with warning if active nets exist
    await openDeactivateChannelDialog(channel)
  } else {
    // For activation, proceed directly
    try {
      await api.patch(`/communication-channel/${channel.id}`, {
        isActive: true
      })
      await fetchChannels()
      toast.success(t('communicationChannels.activated'))
    } catch (error) {
      const err = error as ApiError
      toast.error(translateError(err.message))
    }
  }
}

const openTutorial = (channel: CommunicationChannel) => {
  const plain = JSON.parse(JSON.stringify(toRaw(channel))) as Record<string, unknown>
  tutorialContent.value = buildTutorialContent(plain, t)
  tutorialTitle.value = formatCommunicationChannelLabel({ communicationChannel: channel })
  showTutorialDialog.value = true
}

const openEdit = () => {
  isEditSheetOpen.value = true
}

const handleBranchUpdated = async () => {
  await fetchBranch()
}

const openDeleteDialog = () => {
  deleteBranchNameConfirm.value = ''
  showDeleteDialog.value = true
}

const deleteBranch = async () => {
  if (!branch.value || isDeleting.value) return
  if (deleteBranchNameConfirm.value.trim() !== branch.value.name.trim()) return

  isDeleting.value = true
  try {
    await api.delete(`/branches/${branch.value.id}`, {
      branchName: deleteBranchNameConfirm.value.trim()
    })
    showDeleteDialog.value = false
    toast.success(t('branches.deleteSuccess'))
    router.push('/branches')
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

let membersSearchTimeout: ReturnType<typeof setTimeout> | null = null
let channelSearchTimeout: ReturnType<typeof setTimeout> | null = null

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

const handleChannelSearchChange = () => {
  if (channelSearchTimeout) clearTimeout(channelSearchTimeout)
  channelSearchTimeout = setTimeout(() => {
    channelPage.value = 1
    fetchChannels()
  }, 300)
}

const handleChannelFilterChange = () => {
  channelPage.value = 1
  fetchChannels()
}

const fetchCertificateTemplates = async () => {
  if (!route.params.id) return
  isLoadingCertificateTemplates.value = true
  try {
    certificateTemplates.value = await api.get<CertificateTemplate[]>(
      `/branches/${route.params.id}/certificate-templates`
    )
  } catch {
    certificateTemplates.value = []
  } finally {
    isLoadingCertificateTemplates.value = false
  }
}

const handleCertificateTemplateCreated = async () => {
  await fetchCertificateTemplates()
}

const handleCertificateTemplateUpdated = async () => {
  await fetchCertificateTemplates()
}

const openEditCertificateTemplate = (template: CertificateTemplate) => {
  selectedCertificateTemplate.value = template
  isEditCertificateTemplateSheetOpen.value = true
}

const openDeleteCertificateTemplateDialog = async (template: CertificateTemplate) => {
  selectedCertificateTemplate.value = template
  showDeleteCertificateTemplateDialog.value = true
  try {
    netsUsingCertificateTemplate.value = await api.get<{ id: string; name: string }[]>(
      `/branches/${route.params.id}/certificate-templates/${template.id}/nets-using`
    )
  } catch {
    netsUsingCertificateTemplate.value = []
  }
}

const deleteCertificateTemplate = async () => {
  if (!selectedCertificateTemplate.value || isDeletingCertificateTemplate.value || !route.params.id) return
  isDeletingCertificateTemplate.value = true
  try {
    await api.delete(
      `/branches/${route.params.id}/certificate-templates/${selectedCertificateTemplate.value.id}?force=true`
    )
    toast.success(t('certificates.deleteSuccess'))
    showDeleteCertificateTemplateDialog.value = false
    selectedCertificateTemplate.value = null
    netsUsingCertificateTemplate.value = []
    await fetchCertificateTemplates()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeletingCertificateTemplate.value = false
  }
}

const fetchNets = async (append = false) => {
  if (!route.params.id) return
  const token = append ? branchNetsListGuard.beginAppend() : branchNetsListGuard.beginReplace()
  if (!append) {
    netsPage.value = 1
    isLoadingNets.value = true
  } else {
    isLoadingMoreNets.value = true
  }

  try {
    const offset = append ? (netsPage.value - 1) * netsPageSize : 0
    const params = new URLSearchParams()
    params.set('limit', String(netsPageSize))
    params.set('offset', String(offset))
    if (netsSearch.value?.trim()) params.set('search', netsSearch.value.trim())
    if (netsStatusFilter.value !== 'all') params.set('status', netsStatusFilter.value)

    const response = await api.get<any[] | { data: any[]; total: number; limit: number; offset: number }>(`/branches/${route.params.id}/nets?${params.toString()}`)

    if (!branchNetsListGuard.isCurrent(token)) {
      return
    }

    const isPaginated = typeof response === 'object' && response !== null && 'data' in response
    const data = isPaginated ? (response as { data: any[] }).data : (Array.isArray(response) ? response : [])
    const total = isPaginated ? (response as { total: number }).total : (Array.isArray(response) ? response.length : 0)

    if (append) {
      nets.value = [...nets.value, ...data]
    } else {
      nets.value = data
    }

    netsTotal.value = total
    hasMoreNets.value = nets.value.length < total
  } catch (error) {
    if (!branchNetsListGuard.isCurrent(token)) {
      return
    }
    console.error('Failed to fetch nets:', error)
    nets.value = []
    hasMoreNets.value = false
    netsTotal.value = 0
  } finally {
    if (branchNetsListGuard.isCurrent(token)) {
      isLoadingNets.value = false
      isLoadingMoreNets.value = false
    }
  }
}

const loadMoreNets = () => {
  netsPage.value += 1
  fetchNets(true)
}

const handleNetCreated = async () => {
  await fetchNets()
  await fetchSchedulers()
}

const fetchSchedulers = async () => {
  if (!route.params.id || !canCreateNet.value) return
  const token = branchSchedulersListGuard.beginReplace()
  isLoadingSchedulers.value = true
  try {
    const list = await api.get<any[]>(`/net-schedulers?branchId=${route.params.id}`)
    if (!branchSchedulersListGuard.isCurrent(token)) {
      return
    }
    schedulers.value = list
  } catch {
    if (!branchSchedulersListGuard.isCurrent(token)) {
      return
    }
    schedulers.value = []
  } finally {
    if (branchSchedulersListGuard.isCurrent(token)) {
      isLoadingSchedulers.value = false
    }
  }
}

const openEditScheduler = (id: string) => {
  selectedSchedulerId.value = id
  isEditSchedulerSheetOpen.value = true
}

const handleSchedulerUpdated = () => {
  fetchSchedulers()
}

const getNetStatus = (net: any): 'active' | 'pending' | 'completed' | 'cancelled' => {
  if (net.endedAt && !net.startedAt) return 'cancelled'
  if (net.endedAt) return 'completed'
  if (net.startedAt) return 'active'
  return 'pending'
}

const branchId = computed(() => route.params.id as string)
const branchChannelFilterKey = computed(() => `branch-detail-channels-${branchId.value}`)
const branchMembersFilterKey = computed(() => `branch-detail-members-${branchId.value}`)
const branchNetsFilterKey = computed(() => `branch-detail-nets-${branchId.value}`)
usePersistedFilters(branchChannelFilterKey, { channelSearch, channelTypeFilter })
usePersistedFilters(branchMembersFilterKey, { membersSearch, membersRoleFilter })
usePersistedFilters(branchNetsFilterKey, { netsSearch, netsStatusFilter })

let netsSearchTimeout: ReturnType<typeof setTimeout> | null = null
const handleNetsSearchChange = () => {
  if (netsSearchTimeout) clearTimeout(netsSearchTimeout)
  netsSearchTimeout = setTimeout(() => fetchNets(), 300)
}
const handleNetsFilterChange = () => fetchNets()

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

const fetchBranchEquipment = async () => {
  branchEquipmentLoading.value = true
  try {
    const response = await api.get<{ data: any[]; total: number }>(
      `/equipment/branch/${route.params.id}?pageSize=6`
    )
    branchEquipment.value = response.data
    branchEquipmentTotal.value = response.total
  } catch {
    branchEquipment.value = []
    branchEquipmentTotal.value = 0
  } finally {
    branchEquipmentLoading.value = false
  }
}

watch(membersSearch, handleMembersSearchChange)
watch(membersRoleFilter, handleMembersFilterChange)
watch(channelSearch, handleChannelSearchChange)
watch(channelTypeFilter, handleChannelFilterChange)
watch(netsSearch, handleNetsSearchChange)
watch(netsStatusFilter, handleNetsFilterChange)

watch(
  userMembership,
  (m) => {
    if (m?.status === 'approved') {
      fetchMembers()
    } else {
      isLoadingMembers.value = false
      members.value = []
    }
  },
  { immediate: true }
)

watch(
  canCreateNet,
  (ok) => {
    if (ok && route.params.id) fetchSchedulers()
  },
  { immediate: true }
)

onMounted(() => {
  fetchBranch()
  checkMembership()
  fetchChannels()
  fetchCertificateTemplates()
  fetchNets()
  fetchBranchEquipment()
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
      <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div class="flex justify-center sm:justify-start shrink-0">
          <div class="h-24 w-24 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            <img src="/logo-s.svg" alt="" class="h-14 w-14 object-contain" />
          </div>
        </div>
        <div class="flex-1 min-w-0 space-y-3">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
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
              <h1 class="text-2xl font-bold">{{ branch.name }}</h1>
            </div>
            <div class="hidden sm:flex items-center gap-2 shrink-0">
              <Button v-if="canJoin && branch.isActive" @click="joinBranch" :disabled="isJoining" variant="outline" size="sm" :title="t('branches.joinBranch')" :aria-label="t('branches.joinBranch')">
                <Users class="h-4 w-4 mr-2" />
                {{ t('branches.joinBranch') }}
              </Button>
              <span v-if="hasPendingRequest" class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                {{ t('memberships.pending') }}
              </span>
              <template v-if="canManage && branch.isActive">
                <Button variant="outline" size="sm" @click="openEdit" :title="t('branches.edit')" :aria-label="t('branches.edit')">
                  <Edit class="h-4 w-4 mr-2" />
                  {{ t('branches.edit') }}
                </Button>
              </template>
              <Button
                v-if="canDeleteBranch && branch.isActive && !branch.isHeadquarters"
                variant="outline"
                size="sm"
                class="trac-btn-destructive-outlined"
                @click="openDeleteDialog"
                :title="t('common.delete')"
                :aria-label="t('common.delete')"
              >
                <Trash2 class="h-4 w-4 mr-2" />
                {{ t('common.delete') }}
              </Button>
            </div>
          </div>
          <div v-if="branch.address || branch.phone || branch.email" class="flex flex-col gap-y-1.5 text-sm text-muted-foreground">
            <span v-if="branch.address" class="flex items-center gap-2">
              <MapPin class="h-4 w-4 shrink-0" />
              {{ branch.address }}
            </span>
            <span v-if="branch.phone" class="flex items-center gap-2">
              <Phone class="h-4 w-4 shrink-0" />
              {{ branch.phone }}
            </span>
            <span v-if="branch.email" class="flex items-center gap-2">
              <Mail class="h-4 w-4 shrink-0" />
              {{ branch.email }}
            </span>
          </div>
          <div v-if="hasRejectedMembership" class="flex flex-col gap-1">
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 w-fit">
              {{ t('memberships.rejected') }}
            </span>
            <p v-if="userMembership?.rejectionReason" class="text-xs text-muted-foreground max-w-md">
              {{ t('memberships.rejectedReasonDescription') }} {{ userMembership.rejectionReason }}
            </p>
          </div>
          <span v-if="!branch.isActive" class="text-xs font-medium text-red-600 dark:text-red-400">
            {{ t('branches.deleted') }}
          </span>
          <!-- Mobile action buttons -->
          <div class="flex sm:hidden flex-wrap items-center gap-2">
            <Button v-if="canJoin && branch.isActive" @click="joinBranch" :disabled="isJoining" variant="outline" size="sm" :title="t('branches.joinBranch')" :aria-label="t('branches.joinBranch')">
              <Users class="h-4 w-4 mr-2" />
              {{ t('branches.joinBranch') }}
            </Button>
            <span v-if="hasPendingRequest" class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {{ t('memberships.pending') }}
            </span>
            <template v-if="canManage && branch.isActive">
              <Button variant="outline" size="sm" @click="openEdit" :title="t('branches.edit')" :aria-label="t('branches.edit')">
                <Edit class="h-4 w-4 mr-2" />
                {{ t('branches.edit') }}
              </Button>
            </template>
            <Button
              v-if="canDeleteBranch && branch.isActive && !branch.isHeadquarters"
              variant="outline"
              size="sm"
              class="trac-btn-destructive-outlined"
              @click="openDeleteDialog"
              :title="t('common.delete')"
              :aria-label="t('common.delete')"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              {{ t('common.delete') }}
            </Button>
          </div>
        </div>
      </div>

      <Separator class="my-8" />

      <CommunityModule
        v-model:period="communityPeriod"
        :stats="communityStats"
        :branch-name="branch?.name ?? null"
        :is-loading="isLoadingCommunity"
        :show-global-section="false"
        :show-monthly-stats="false"
        :show-totals="false"
        show-period-filter
      />

      <div class="my-6">
        <NetsAttendeesTrendWidget :branch-id="route.params.id as string" />
      </div>

      <Separator class="my-8" />

      <template v-if="!branch?.isHeadquarters">
        <section>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package class="h-4 w-4" />
              {{ t('inventory.title') }}
            </h3>
            <router-link :to="`/branches/${route.params.id}/inventory`">
              <Button variant="outline" size="sm" class="trac-page-action-btn">
                {{ t('inventory.viewInventory') }}
                <ChevronRight class="h-4 w-4 ml-1" />
              </Button>
            </router-link>
          </div>

          <div v-if="branchEquipmentLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <EquipmentCardSkeleton v-for="i in 3" :key="i" />
          </div>

          <div v-else-if="branchEquipmentTotal === 0" class="py-8 text-center">
            <Package class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p class="text-sm text-muted-foreground">{{ t('inventory.noEquipmentYet') }}</p>
          </div>

          <template v-else>
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              <EquipmentCard
                v-for="eq in branchEquipment"
                :key="eq.id"
                :id="eq.id"
                :label="eq.label"
                :category-name="eq.category?.name"
                :category-path="buildCategoryPath(eq.category)"
                :status-name="eq.status?.name"
                :status-color="eq.status?.color"
                :is-visible="eq.isVisible"
                :properties="eq.propertyValues?.map((pv: any) => ({ name: pv.propertyDefinition?.name, value: pv.value, type: pv.propertyDefinition?.type }))"
                :thumbnail-path="eq.photos?.[0]?.filePath"
              />
            </div>

            <div v-if="branchEquipmentTotal > 6" class="mt-4">
              <router-link :to="`/branches/${route.params.id}/inventory`" class="text-sm text-primary hover:underline flex items-center gap-1">
                {{ t('inventory.viewAll') }} ({{ branchEquipmentTotal }})
                <ChevronRight class="h-4 w-4" />
              </router-link>
            </div>
          </template>
        </section>

        <Separator class="my-8" />
      </template>

      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <TowerControl class="h-4 w-4" />
          {{ t('communicationChannels.title') }}
        </h3>
        <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
          <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
            <SearchInput
              v-model="channelSearch"
              :placeholder="t('communicationChannels.searchPlaceholder')"
            />
            <Select v-model="channelTypeFilter" class="w-full min-w-0">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('communicationChannels.typeAll') }}</SelectItem>
                <SelectItem value="vhf_uhf_repeater">{{ t('communicationChannels.vhf_uhf_repeater') }}</SelectItem>
                <SelectItem value="echolink">{{ t('communicationChannels.echolink') }}</SelectItem>
                <SelectItem value="aprs">{{ t('communicationChannels.aprs') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="trac-top-actions">
            <Button
              v-if="canManage && branch.isActive"
              variant="outline"
              size="sm"
              @click="isCreateChannelSheetOpen = true"
              class="trac-page-action-btn"
              :title="t('communicationChannels.create')"
              :aria-label="t('communicationChannels.create')"
            >
              <Plus class="h-4 w-4" />
              {{ t('communicationChannels.create') }}
            </Button>
          </div>
        </div>
        <div v-if="isLoadingChannels" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <CommunicationChannelCardSkeleton v-for="i in 6" :key="i" class="h-full" />
        </div>
        <div v-else-if="channels.length === 0" class="text-center py-4">
          <TowerControl class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('communicationChannels.noInfrastructure') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
          <div v-for="ch in channels" :key="ch.id" class="flex">
            <CommunicationChannelCard
              :channel="ch"
              :can-manage="canManage"
              :branch-name="branch?.name"
              :branch-city="branch?.city"
              @edit="openEditChannel"
              @delete="openDeleteChannelDialog"
              @toggle-status="(ch) => ch.isActive ? openDeactivateChannelDialog(ch) : toggleChannelStatus(ch)"
              @open-tutorial="openTutorial"
            />
          </div>
        </div>
        <div v-if="!isLoadingChannels" class="flex flex-wrap items-center justify-between gap-2 pt-4">
          <p v-if="channelsTotal > 0 || channels.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ channels.length }}/{{ channelsTotal }} {{ t('communicationChannels.nameEntity') }}
          </p>
          <div v-if="hasMoreChannels" class="order-1 lg:order-2 w-full lg:w-auto">
            <Button variant="outline" class="trac-load-more-btn" :disabled="isLoadingMoreChannels" @click="loadMoreChannels">
              <ChevronDown v-if="!isLoadingMoreChannels" class="h-4 w-4 mr-2" />
              {{ isLoadingMoreChannels ? t('common.loading') : t('common.loadMore') }}
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
            <div class="trac-top-actions">
              <Button
                v-if="canManageMembers && !branch.isHeadquarters"
                variant="outline"
                size="sm"
                @click="showAddMemberSheet = true"
                  class="trac-card-action-btn"
                  :title="t('branches.addMember')"
                  :aria-label="t('branches.addMember')"
              >
                <Plus class="h-4 w-4" />
                {{ t('branches.addMember') }}
              </Button>
            </div>
          </div>

          <div v-if="isLoadingMembers" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="h-20 bg-muted rounded-lg animate-pulse" />
          </div>
          <div v-else-if="members.length === 0" class="text-center py-4">
            <Users class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p class="text-sm text-muted-foreground">{{ t('branches.noMembers') }}</p>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <MemberCard
              v-for="m in members"
              :key="m.id"
              :id="m.id"
              :user-id="m.operator?.user?.id ?? ''"
              :operator-id="m.operatorId"
              :role="m.role"
              :user="branchMemberCardUser(m)"
              :can-manage="canManageMembers"
              :can-change-role="canChangeRole(m)"
              :can-remove="canRemoveMember(m)"
              @role-change="updateMemberRole"
              @remove="openRemoveMemberDialog(m)"
            />
          </div>

          <div v-if="!isLoadingMembers" class="flex flex-wrap items-center justify-between gap-2 pt-4">
            <p v-if="membersTotal > 0 || members.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
              {{ members.length }}/{{ membersTotal }} {{ t('branches.members') }}
            </p>
            <div v-if="hasMoreMembers" class="order-1 lg:order-2 w-full lg:w-auto">
              <Button
                variant="outline"
                class="trac-load-more-btn"
                :disabled="isLoadingMoreMembers"
                @click="loadMoreMembers"
              >
                <ChevronDown v-if="!isLoadingMoreMembers" class="h-4 w-4 mr-2" />
                {{ isLoadingMoreMembers ? t('common.loading') : t('common.loadMore') }}
              </Button>
            </div>
          </div>
        </section>
      </template>

      <Separator class="my-8" />

      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Award class="h-4 w-4" />
          {{ t('certificates.title') }}
        </h3>
        <div class="flex flex-wrap items-center justify-end gap-2 mb-4">
          <Button
            v-if="canManage && branch.isActive"
            variant="outline"
            size="sm"
            @click="isCreateCertificateTemplateSheetOpen = true"
            class="trac-card-action-btn"
            :title="t('certificates.create')"
            :aria-label="t('certificates.create')"
          >
            <Plus class="h-4 w-4" />
            {{ t('certificates.create') }}
          </Button>
        </div>
        <div v-if="isLoadingCertificateTemplates" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
        <div v-else-if="certificateTemplates.length === 0" class="text-center py-8">
          <Award class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('certificates.noTemplates') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <CertificateTemplateCard
            v-for="tpl in certificateTemplates"
            :key="tpl.id"
            :template="tpl"
            :can-manage="canManage"
            @edit="openEditCertificateTemplate"
            @delete="openDeleteCertificateTemplateDialog"
          />
        </div>
      </section>

      <template v-if="canCreateNet">
        <Separator class="my-8" />

        <section aria-labelledby="branch-schedulers-heading">
          <div class="mb-4">
            <h3 id="branch-schedulers-heading" class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarRange class="h-4 w-4" aria-hidden="true" />
              {{ t('scheduler.title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-1">{{ t('scheduler.sectionSubtitle') }}</p>
          </div>
          <div v-if="isLoadingSchedulers" class="py-4 text-sm text-muted-foreground">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="schedulers.length === 0" class="py-4 text-sm text-muted-foreground">
            {{ t('common.noResults') }}
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <SchedulerCard
              v-for="s in schedulers"
              :key="s.id"
              :scheduler="s"
              :show-edit-button="canCreateNet"
              @edit="openEditScheduler"
            />
          </div>
        </section>

        <Separator class="my-8" />
      </template>

      <section aria-labelledby="branch-nets-heading">
        <div class="mb-4">
          <h3 id="branch-nets-heading" class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Radio class="h-4 w-4" aria-hidden="true" />
            {{ t('nets.nets') }}
          </h3>
          <p class="text-xs text-muted-foreground mt-1">{{ t('nets.sessionsSectionSubtitle') }}</p>
        </div>
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
                <SelectItem value="cancelled">{{ t('nets.filterCancelled') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="trac-top-actions">
            <Button
              v-if="canCreateNet && branch.isActive"
              variant="outline"
              size="sm"
              @click="isCreateNetSheetOpen = true"
              class="trac-card-action-btn"
              :title="t('nets.createNet')"
              :aria-label="t('nets.createNet')"
            >
              <Plus class="h-4 w-4" />
              {{ t('nets.createNet') }}
            </Button>
          </div>
        </div>

        <div v-if="isLoadingNets" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <NetCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else-if="nets.length === 0" class="text-center py-4">
          <Radio class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">
            {{ netsTotal === 0 ? t('nets.noNetsInBranch') : t('nets.noResults') }}
          </p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <NetCard
            v-for="net in nets"
            :key="net.id"
            :id="net.id"
            :name="net.name"
            :operator-id="net.operator?.id"
            :operator-call-sign="net.operator?.callSign ?? ''"
            :status="getNetStatus(net)"
            :attendee-count="net.attendeeCount"
            :duration-minutes="net.totalDurationMinutes"
            :started-at="net.startedAt"
            :ended-at="net.endedAt"
            :scheduled-at="net.scheduledAt"
            :estimated-duration-minutes="net.estimatedDurationMinutes"
            :has-certificate="!!net.certificateTemplateId"
          />
        </div>

        <div v-if="!isLoadingNets" class="flex flex-wrap items-center justify-between gap-2 pt-4">
          <p v-if="netsTotal > 0 || nets.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ nets.length }}/{{ netsTotal }} {{ t('nets.name') }}
          </p>
          <div v-if="hasMoreNets && !isLoadingNets" class="order-1 lg:order-2 w-full lg:w-auto">
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
    </div>

    <EditBranchSheet
      v-if="branch"
      :open="isEditSheetOpen"
      :branch="branch"
      @update:open="isEditSheetOpen = $event"
      @updated="handleBranchUpdated"
    />

    <AddMemberSheet
      v-if="branch && showAddMemberSheet"
      :open="showAddMemberSheet"
      :branch-id="branch.id"
      @update:open="showAddMemberSheet = $event"
      @added="fetchMembers"
    />

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
        <div class="py-2">
          <label class="text-xs text-muted-foreground">{{ t('branches.deleteConfirmTypeName') }}</label>
          <Input
            v-model="deleteBranchNameConfirm"
            type="text"
            class="mt-1"
            :placeholder="branch?.name"
            autocomplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            <X class="h-4 w-4" />
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="deleteBranch"
            :disabled="isDeleting || (deleteBranchNameConfirm.trim() !== branch?.name?.trim())"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4" />
            {{ isDeleting ? t('common.loading') : t('branches.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <CreateCommChannelSheet
      v-if="branch"
      :open="isCreateChannelSheetOpen"
      :branch-id="branch.id"
      :branch-city="branch.city"
      @update:open="isCreateChannelSheetOpen = $event"
      @created="handleChannelCreated"
    />

    <CreateCertificateTemplateSheet
      v-if="branch"
      :open="isCreateCertificateTemplateSheetOpen"
      :branch-id="branch.id"
      @update:open="isCreateCertificateTemplateSheetOpen = $event"
      @created="handleCertificateTemplateCreated"
    />

    <EditCertificateTemplateSheet
      v-if="branch && selectedCertificateTemplate"
      :open="isEditCertificateTemplateSheetOpen"
      :branch-id="branch.id"
      :template="selectedCertificateTemplate"
      @update:open="(v) => { isEditCertificateTemplateSheetOpen = v; if (!v) selectedCertificateTemplate = null }"
      @updated="handleCertificateTemplateUpdated"
    />

    <CreateNetSheet
      v-if="branch"
      :open="isCreateNetSheetOpen"
      :default-branch-id="branch.id"
      @update:open="(v) => { isCreateNetSheetOpen = v; if (!v) handleNetCreated() }"
      @created="handleNetCreated"
    />

    <EditNetSchedulerSheet
      :open="isEditSchedulerSheetOpen"
      :scheduler-id="selectedSchedulerId"
      @update:open="(v) => { isEditSchedulerSheetOpen = v; if (!v) handleSchedulerUpdated() }"
      @updated="handleSchedulerUpdated"
    />

    <EditCommChannelSheet
      v-if="selectedChannel"
      :open="isEditChannelSheetOpen"
      :channel="selectedChannel"
      :branch-city="branch?.city"
      @update:open="isEditChannelSheetOpen = $event"
      @updated="handleChannelUpdated"
    />

    <Dialog :open="showDeleteCertificateTemplateDialog" @update:open="showDeleteCertificateTemplateDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ t('certificates.deleteConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            <p>{{ t('certificates.deleteConfirmDescription') }}</p>
            <p v-if="netsUsingCertificateTemplate.length > 0" class="mt-2 text-muted-foreground text-sm">
              {{ t('certificates.templateInUseDescription', { count: netsUsingCertificateTemplate.length }) }}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteCertificateTemplateDialog = false" :disabled="isDeletingCertificateTemplate">
            <X class="h-4 w-4" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="deleteCertificateTemplate"
            :disabled="isDeletingCertificateTemplate"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4" />
            {{ isDeletingCertificateTemplate ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeleteChannelDialog" @update:open="showDeleteChannelDialog = $event">
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
          <Button variant="outline" @click="showDeleteChannelDialog = false" :disabled="isDeletingChannel">
            <X class="h-4 w-4" />
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="deleteChannel"
            :disabled="isDeletingChannel || activeNetsCount > 0"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4" />
            {{ isDeletingChannel ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeactivateChannelDialog" @update:open="showDeactivateChannelDialog = $event">
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
          <Button variant="outline" @click="showDeactivateChannelDialog = false" :disabled="isDeactivatingChannel">
            <X class="h-4 w-4" />
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="confirmDeactivateChannel"
            :disabled="isDeactivatingChannel"
            class="text-amber-600 hover:text-amber-700"
          >
            <Check class="h-4 w-4" />
            {{ isDeactivatingChannel ? t('common.loading') : t('communicationChannels.deactivate') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader class="pr-8">
          <DialogTitle class="text-lg font-semibold leading-tight text-foreground">
            {{ tutorialTitle }}
          </DialogTitle>
        </DialogHeader>
        <div class="tutorial-content text-sm text-foreground" v-html="renderMarkdown(tutorialContent.content)" />
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
            <X class="h-4 w-4" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="confirmRemoveMember"
            :disabled="isRemovingMember"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4" />
            {{ isRemovingMember ? t('common.loading') : t('branches.removeMember') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
