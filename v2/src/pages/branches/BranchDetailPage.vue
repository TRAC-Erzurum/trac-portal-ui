<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { BookOpen, Edit, MapPin, Plus, Power, PowerOff, RotateCcw, Search, Star, TowerControl, Trash2, Users } from 'lucide-vue-next'
import EditBranchSheet from '@/components/branches/EditBranchSheet.vue'
import AddMemberSheet from '@/components/branches/AddMemberSheet.vue'
import CreateInfrastructureSheet from '@/components/infrastructure/CreateInfrastructureSheet.vue'
import EditInfrastructureSheet from '@/components/infrastructure/EditInfrastructureSheet.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { InfrastructureCard, InfrastructureCardSkeleton, MemberCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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

const { t } = useI18n()
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
const userMembership = ref<{ status: string; role?: string } | null>(null)

const canManage = computed(() => {
  return authStore.isSuperAdmin
})

const hasPendingRequest = computed(() => {
  return userMembership.value?.status === 'pending'
})

const canJoin = computed(() => {
  return !userMembership.value && authStore.isAuthenticated
})

const canManageMembers = computed(() => {
  if (authStore.isSuperAdmin) return true
  
  if (!userMembership.value || userMembership.value.status !== 'approved') return false
  
  return userMembership.value?.role === 'admin' || userMembership.value?.role === 'president'
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

    const response = await api.get<{ data: Infrastructure[]; total: number }>(`/branches/${route.params.id}/infrastructure?${params.toString()}`)
    
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

const openDeleteInfrastructureDialog = (infra: Infrastructure) => {
  selectedInfrastructure.value = infra
  showDeleteInfrastructureDialog.value = true
}

const deleteInfrastructure = async () => {
  if (!selectedInfrastructure.value || isDeletingInfrastructure.value) return

  isDeletingInfrastructure.value = true
  try {
    await api.delete(`/infrastructure/${selectedInfrastructure.value.id}`)
    await fetchInfrastructure()
    toast.success(t('infrastructure.deleteSuccess'))
    showDeleteInfrastructureDialog.value = false
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeletingInfrastructure.value = false
  }
}

const toggleInfrastructureStatus = async (infra: Infrastructure) => {
  try {
    await api.patch(`/infrastructure/${infra.id}`, {
      isActive: !infra.isActive
    })
    await fetchInfrastructure()
    toast.success(infra.isActive ? t('infrastructure.deactivated') : t('infrastructure.activated'))
  } catch (error) {
    const err = error as ApiError
    toast.error(translateError(err.message))
  }
}

const openTutorial = async (type: InfrastructureType) => {
  isLoadingTutorial.value = true
  showTutorialDialog.value = true
  try {
    const data = await api.get<{ title: string; content: string }>(`/infrastructure/tutorials/${type}`)
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

watch(membersSearch, handleMembersSearchChange)
watch(membersRoleFilter, handleMembersFilterChange)
watch(infrastructureSearch, handleInfrastructureSearchChange)
watch(infrastructureTypeFilter, handleInfrastructureFilterChange)

onMounted(() => {
  fetchBranch()
  checkMembership()
  fetchInfrastructure()
  fetchMembers()
})
</script>

<template>
  <AppLayout :breadcrumb-label="branch?.name">
    <template #title>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl lg:text-3xl font-bold">{{ branch?.name || t('common.loading') }}</h1>
        <span
          v-if="branch && !branch.isHeadquarters"
          class="text-xs font-medium px-2 py-0.5 rounded"
          :class="branch.type === 'branch' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'"
        >
          {{ typeLabel }}
        </span>
        <span v-if="branch && !branch.isActive" class="text-xs font-medium px-2 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400">
          {{ t('branches.deleted') }}
        </span>
      </div>
    </template>

    <div v-if="isLoading" class="space-y-4">
      <div class="h-8 w-64 bg-muted rounded animate-pulse" />
      <div class="h-4 w-48 bg-muted rounded animate-pulse" />
    </div>

    <div v-else-if="branch" class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <!-- Call Signs -->
        <div v-if="!branch.isHeadquarters && branch.callSigns.length > 0" class="flex flex-wrap items-center gap-2">
          <div
            v-for="callSign in branch.callSigns"
            :key="callSign.id"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-muted/30"
          >
            <span class="font-mono font-semibold text-sm">{{ callSign.callSign }}</span>
            <Star
              v-if="callSign.isDefault"
              class="h-3.5 w-3.5 text-amber-500 fill-amber-500"
            />
          </div>
        </div>
        <div v-else class="flex-1"></div>

        <div class="flex gap-2">
          <Button v-if="canJoin && branch.isActive" @click="joinBranch" :disabled="isJoining" variant="outline" size="sm">
            <Users class="h-4 w-4 mr-2" />
            {{ t('branches.joinBranch') }}
          </Button>
          <span v-if="hasPendingRequest" class="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {{ t('memberships.pending') }}
          </span>
          <template v-if="canManage">
            <!-- For active branches: Edit + Delete -->
            <template v-if="branch.isActive">
              <Button variant="outline" @click="openEdit">
                <Edit class="h-4 w-4 mr-2" />
                {{ t('common.edit') }}
              </Button>
              <Button 
                v-if="!branch.isHeadquarters"
                variant="outline" 
                @click="openDeleteDialog"
                class="text-red-600 hover:text-red-700"
              >
                <Trash2 class="h-4 w-4 mr-2" />
                {{ t('branches.delete') }}
              </Button>
            </template>
            <!-- For deleted branches: Restore only -->
            <template v-else>
              <Button 
                variant="outline" 
                @click="openRestoreDialog"
                class="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-600"
              >
                <RotateCcw class="h-4 w-4 mr-2" />
                {{ t('branches.restore') }}
              </Button>
            </template>
          </template>
        </div>
      </div>

      <Separator v-if="branch.address || branch.phone || branch.email" class="my-8" />

      <section v-if="branch.address || branch.phone || branch.email">
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <MapPin class="h-4 w-4" />
          {{ t('branches.contactInfo') }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
          <div v-if="branch.address">
            <p class="text-xs text-muted-foreground mb-0.5">{{ t('branches.address') }}</p>
            <p class="text-sm">{{ branch.address }}</p>
          </div>
          <div v-if="branch.phone">
            <p class="text-xs text-muted-foreground mb-0.5">{{ t('branches.phone') }}</p>
            <p class="text-sm">{{ branch.phone }}</p>
          </div>
          <div v-if="branch.email">
            <p class="text-xs text-muted-foreground mb-0.5">{{ t('branches.email') }}</p>
            <p class="text-sm">{{ branch.email }}</p>
          </div>
        </div>
      </section>

      <Separator class="my-8" />

      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users class="h-4 w-4" />
            {{ t('branches.members') }}
          </h3>
          <Button 
            v-if="canManageMembers && !branch.isHeadquarters" 
            variant="outline" 
            size="sm"
            @click="showAddMemberSheet = true"
          >
            <Plus class="h-4 w-4 mr-2" />
            {{ t('branches.addMember') }}
          </Button>
        </div>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative flex-1 min-w-[200px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="membersSearch"
              :placeholder="t('operators.searchPlaceholder')"
              class="pl-9"
            />
          </div>
          <Select v-model="membersRoleFilter">
            <SelectTrigger class="w-[140px]">
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

        <div v-if="isLoadingMembers" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div v-for="i in 4" :key="i" class="h-20 bg-muted rounded-lg animate-pulse" />
        </div>
        <div v-else-if="members.length === 0" class="text-center py-8">
          <Users class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p class="text-sm text-muted-foreground">{{ t('branches.noMembers') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

        <div v-if="hasMoreMembers && !isLoadingMembers" class="pt-4">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMoreMembers"
            @click="loadMoreMembers"
          >
            {{ isLoadingMoreMembers ? t('common.loading') : t('branches.loadMore') }}
          </Button>
        </div>
      </section>

      <Separator class="my-8" />

      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TowerControl class="h-4 w-4" />
            {{ t('infrastructure.title') }}
          </h3>
          <Button 
            v-if="canManage && branch.isActive" 
            variant="outline" 
            size="sm"
            @click="isCreateInfrastructureSheetOpen = true"
          >
            <Plus class="h-4 w-4 mr-2" />
            {{ t('infrastructure.create') }}
          </Button>
        </div>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <div class="relative flex-1 min-w-[200px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="infrastructureSearch"
              :placeholder="t('infrastructure.searchPlaceholder')"
              class="pl-9"
            />
          </div>
          <Select v-model="infrastructureTypeFilter">
            <SelectTrigger class="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('infrastructure.typeAll') }}</SelectItem>
              <SelectItem value="vhf_uhf_repeater">{{ t('infrastructure.vhf_uhf_repeater') }}</SelectItem>
              <SelectItem value="echolink">{{ t('infrastructure.echolink') }}</SelectItem>
              <SelectItem value="aprs">{{ t('infrastructure.aprs') }}</SelectItem>
              <SelectItem value="hf">{{ t('infrastructure.hf') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="isLoadingInfrastructure" class="space-y-3">
          <InfrastructureCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <div v-else-if="infrastructure.length === 0" class="text-center py-8">
          <TowerControl class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p class="text-sm text-muted-foreground">{{ t('infrastructure.noInfrastructure') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div v-for="infra in infrastructure" :key="infra.id">
            <InfrastructureCard
              :id="infra.id"
              :name="infra.name"
              :type="infra.type"
              :is-active="infra.isActive"
              :description="infra.description"
              :location="infra.location"
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
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 rounded-full"
                  :title="t('infrastructure.howToConnect')"
                  @click.stop="openTutorial(infra.type)"
                >
                  <BookOpen class="h-3.5 w-3.5" />
                </Button>
              </template>
              <template v-if="canManage" #actions>
                <div class="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs"
                    @click.stop="openEditInfrastructure(infra)"
                  >
                    <Edit class="h-3.5 w-3.5 mr-1.5" />
                    {{ t('common.edit') }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs"
                    @click.stop="toggleInfrastructureStatus(infra)"
                  >
                    <Power v-if="infra.isActive" class="h-3.5 w-3.5 mr-1.5" />
                    <PowerOff v-else class="h-3.5 w-3.5 mr-1.5" />
                    {{ infra.isActive ? t('infrastructure.deactivate') : t('infrastructure.activate') }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    @click.stop="openDeleteInfrastructureDialog(infra)"
                  >
                    <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                    {{ t('common.delete') }}
                  </Button>
                </div>
              </template>
            </InfrastructureCard>
          </div>
        </div>

        <div v-if="hasMoreInfrastructure && !isLoadingInfrastructure" class="pt-4">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMoreInfrastructure"
            @click="loadMoreInfrastructure"
          >
            {{ isLoadingMoreInfrastructure ? t('common.loading') : t('infrastructure.loadMore') }}
          </Button>
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

    <CreateInfrastructureSheet
      v-if="branch"
      :open="isCreateInfrastructureSheetOpen"
      :branch-id="branch.id"
      :branch-city="branch.city"
      @update:open="isCreateInfrastructureSheetOpen = $event"
      @created="handleInfrastructureCreated"
    />

    <EditInfrastructureSheet
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
            {{ t('infrastructure.deleteConfirmTitle') }}
          </DialogTitle>
          <DialogDescription>
            {{ t('infrastructure.deleteConfirmDescription') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteInfrastructureDialog = false" :disabled="isDeletingInfrastructure">
            {{ t('common.cancel') }}
          </Button>
          <Button 
            variant="outline" 
            @click="deleteInfrastructure"
            :disabled="isDeletingInfrastructure"
            class="text-red-600 hover:text-red-700"
          >
            {{ isDeletingInfrastructure ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ tutorialContent.title || t('infrastructure.tutorial') }}
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
