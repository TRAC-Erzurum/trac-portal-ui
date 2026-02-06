<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Building2, Calendar, Camera, ExternalLink, Key, MapPin, Pencil, Radio, Search, Send, Trash2, User } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import BranchMembershipCard from '@/components/shared/BranchMembershipCard.vue'
import ChangePasswordSheet from '@/components/profile/ChangePasswordSheet.vue'
import EditOperatorSheet from '@/components/profile/EditOperatorSheet.vue'
import EditPersonalSheet from '@/components/profile/EditPersonalSheet.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign, formatDateSimple } from '@/lib/formatters'

interface BranchMembership {
  id: string
  branchId: string
  branch: { id: string; name: string }
  role: string
  status: string
  rejectionReason?: string | null
  createdAt: string
}

interface Operator {
  callSign: string
  prefix?: string
  suffix?: string
  country?: string
  city?: string
  district?: string
  gridSquare?: string
}

interface Profile {
  id: string
  email: string
  fullName?: string
  role: string
  picture?: string
  provider?: string
  createdAt: string
  operator?: Operator
}

const { t } = useI18n()
const authStore = useAuthStore()

const profile = ref<Profile | null>(null)
const isLoading = ref(true)
const fileInputRef = ref<HTMLInputElement>()
const isUploadingAvatar = ref(false)
const showEditPersonal = ref(false)
const showEditOperator = ref(false)
const showChangePassword = ref(false)
const memberships = ref<BranchMembership[]>([])
const membershipsLoading = ref(true)
const reapplyingBranchId = ref<string | null>(null)
const membershipSearch = ref('')
const membershipRoleFilter = ref('all')
const membershipStatusFilter = ref('all')

const filteredMemberships = computed(() => {
  let filtered = memberships.value

  if (membershipSearch.value) {
    const search = membershipSearch.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.branch.name.toLowerCase().includes(search)
    )
  }

  if (membershipRoleFilter.value !== 'all') {
    filtered = filtered.filter(m => m.role === membershipRoleFilter.value)
  }

  if (membershipStatusFilter.value !== 'all') {
    filtered = filtered.filter(m => m.status === membershipStatusFilter.value)
  }

  return filtered
})

const approvedMemberships = computed(() => 
  filteredMemberships.value.filter(m => m.status === 'approved')
)

const formattedCallSign = computed(() => {
  const op = profile.value?.operator
  if (!op) return '-'
  return formatCallSign(op)
})

const qth = computed(() => {
  const op = profile.value?.operator
  if (!op) return null
  const parts = [op.district, op.city, op.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
})

const gridSquareUrl = computed(() => {
  const gs = profile.value?.operator?.gridSquare
  return gs ? `https://k7fry.com/grid/?qth=${gs}` : null
})

const memberSince = computed(() => {
  return formatDateSimple(profile.value?.createdAt)
})

async function fetchProfile() {
  isLoading.value = true
  try {
    profile.value = await api.get<Profile>('/user/profile')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

async function fetchMemberships() {
  membershipsLoading.value = true
  try {
    memberships.value = await api.get<BranchMembership[]>('/users/me/memberships')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    membershipsLoading.value = false
  }
}

async function reapplyToBranch(branchId: string) {
  reapplyingBranchId.value = branchId
  try {
    await api.post(`/branches/${branchId}/members`)
    toast.success(t('memberships.requestSent'))
    await fetchMemberships()
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    reapplyingBranchId.value = null
  }
}

const membershipStatusLabel = (status: string) => {
  if (status === 'pending') return 'memberships.pending'
  if (status === 'approved') return 'memberships.approved'
  if (status === 'rejected') return 'memberships.rejected'
  return status
}

const membershipStatusClass = (status: string) => {
  if (status === 'pending') return 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
  if (status === 'approved') return 'bg-green-500/20 text-green-700 dark:text-green-400'
  if (status === 'rejected') return 'bg-red-500/20 text-red-700 dark:text-red-400'
  return ''
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error(t('profile.invalidFileType'))
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error(t('profile.fileTooLarge'))
    return
  }

  isUploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${import.meta.env.VITE_API_URL}/user/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'error.serverError' }))
      throw { message: error.message } as ApiError
    }

    await fetchProfile()
    await authStore.checkAuth()
    toast.success(t('profile.avatarUpdated'))
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isUploadingAvatar.value = false
    input.value = ''
  }
}

async function deleteAvatar() {
  if (!profile.value?.picture) return
  
  isUploadingAvatar.value = true
  try {
    await api.delete('/user/picture')
    await fetchProfile()
    await authStore.checkAuth()
    toast.success(t('profile.avatarDeleted'))
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isUploadingAvatar.value = false
  }
}

async function handleProfileUpdated() {
  await fetchProfile()
  await authStore.checkAuth()
}

onMounted(() => {
  fetchProfile()
  fetchMemberships()
})
</script>

<template>
  <AppLayout :title="t('nav.account')">
    <div class="space-y-6">
      <template v-if="isLoading">
        <div class="animate-pulse space-y-8">
          <div class="flex gap-6">
            <div class="h-24 w-24 rounded-full bg-muted" />
            <div class="flex-1 space-y-3">
              <div class="h-7 w-32 bg-muted rounded" />
              <div class="h-5 w-48 bg-muted rounded" />
              <div class="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
          <div class="h-px bg-muted" />
          <div class="space-y-3">
            <div class="h-5 w-40 bg-muted rounded" />
            <div class="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
      </template>

      <template v-else-if="profile">
        <div class="flex flex-col sm:flex-row gap-6">
          <div class="relative group flex-shrink-0 self-center sm:self-start">
            <UserAvatar :picture="profile.picture" class="h-24 w-24" />
            <div
              class="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ 'opacity-100': isUploadingAvatar }"
            >
              <div v-if="isUploadingAvatar" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <template v-else>
                <button
                  @click="triggerFileInput"
                  class="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  :title="t('profile.changeAvatar')"
                >
                  <Camera class="h-4 w-4 text-white" />
                </button>
                <button
                  v-if="profile.picture"
                  @click="deleteAvatar"
                  class="p-1.5 rounded-full hover:bg-red-500/50 transition-colors"
                  :title="t('profile.deleteAvatar')"
                >
                  <Trash2 class="h-4 w-4 text-white" />
                </button>
              </template>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            />
          </div>

          <div class="flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h2 class="text-2xl font-bold">{{ formattedCallSign }}</h2>
                <p v-if="profile.fullName" class="text-lg text-muted-foreground">{{ profile.fullName }}</p>
                <p class="text-sm text-muted-foreground">{{ profile.email }}</p>
              </div>
              <Button variant="outline" size="sm" @click="showEditPersonal = true" class="flex-shrink-0">
                <Pencil class="h-4 w-4 mr-2" />
                {{ t('common.edit') }}
              </Button>
            </div>

            <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <div class="flex items-center gap-1.5">
                <Calendar class="h-4 w-4" />
                <span>{{ memberSince }}</span>
              </div>
              <div v-if="profile.provider" class="flex items-center gap-1.5">
                <User class="h-4 w-4" />
                <span class="capitalize">{{ profile.provider }}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator class="my-8" />

        <section>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio class="h-4 w-4" />
              {{ t('profile.operator') }}
            </h3>
            <Button variant="outline" size="sm" @click="showEditOperator = true">
              <Pencil class="h-4 w-4 mr-2" />
              {{ t('common.edit') }}
            </Button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8">
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">{{ t('form.callSign') }}</p>
              <p class="font-medium">{{ formattedCallSign }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">{{ t('profile.qth') }}</p>
              <div class="flex items-center gap-1.5">
                <MapPin class="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span class="font-medium">{{ qth || '-' }}</span>
              </div>
            </div>
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">{{ t('profile.locator') }}</p>
              <a
                v-if="gridSquareUrl"
                :href="gridSquareUrl"
                target="_blank"
                class="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                {{ profile.operator?.gridSquare }}
                <ExternalLink class="h-3 w-3" />
              </a>
              <span v-else class="font-medium">-</span>
            </div>
          </div>
        </section>

        <Separator class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Building2 class="h-4 w-4" />
            {{ t('memberships.title') }}
          </h3>

          <div class="flex flex-wrap items-center gap-2 mb-4">
            <div class="relative flex-1 min-w-[200px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="membershipSearch"
                :placeholder="t('memberships.searchPlaceholder')"
                class="pl-9"
              />
            </div>
            <Select v-model="membershipRoleFilter">
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
            <Select v-model="membershipStatusFilter">
              <SelectTrigger class="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('memberships.statusAll') }}</SelectItem>
                <SelectItem value="approved">{{ t('memberships.approved') }}</SelectItem>
                <SelectItem value="pending">{{ t('memberships.pending') }}</SelectItem>
                <SelectItem value="rejected">{{ t('memberships.rejected') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div v-if="membershipsLoading" class="space-y-2">
            <div v-for="i in 2" :key="i" class="h-16 bg-muted rounded-lg animate-pulse" />
          </div>
          
          <div v-else-if="filteredMemberships.length === 0" class="text-center py-8">
            <Building2 class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p class="text-sm text-muted-foreground">{{ memberships.length === 0 ? t('memberships.noMemberships') : t('common.noResults') }}</p>
          </div>
          
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <BranchMembershipCard
              v-for="m in approvedMemberships"
              :key="m.id"
              :branch-id="m.branchId"
              :branch-name="m.branch.name"
              :role="m.role"
            />

          </div>

          <template v-if="filteredMemberships.some(m => m.status !== 'approved')">
            <Separator class="my-4" />
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div
                v-for="m in filteredMemberships.filter(m => m.status !== 'approved')"
                :key="m.id"
                class="p-2 rounded border border-border/50 bg-muted/20"
              >
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{{ m.branch.name }}</p>
                      <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span
                          class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          :class="membershipStatusClass(m.status)"
                        >
                          {{ t(membershipStatusLabel(m.status)) }}
                        </span>
                        <span class="text-xs text-muted-foreground">{{ formatDateSimple(m.createdAt) }}</span>
                      </div>
                      <p v-if="m.status === 'rejected' && m.rejectionReason" class="text-xs text-muted-foreground mt-1">
                        {{ t('memberships.rejectionReason') }}: {{ m.rejectionReason }}
                      </p>
                    </div>
                    <Button
                      v-if="m.status === 'rejected'"
                      variant="outline"
                      size="sm"
                      :disabled="reapplyingBranchId === m.branchId"
                      @click="reapplyToBranch(m.branchId)"
                    >
                      <Send class="h-3.5 w-3.5 mr-1.5" />
                      {{ t('memberships.reapply') }}
                    </Button>
                  </div>
              </div>
            </div>
          </template>
        </section>

        <Separator class="my-8" />

        <section>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Key class="h-4 w-4" />
              {{ t('profile.security') }}
            </h3>
            <Button variant="outline" size="sm" @click="showChangePassword = true">
              <Pencil class="h-4 w-4 mr-2" />
              {{ t('common.edit') }}
            </Button>
          </div>
          <p class="text-sm text-muted-foreground">{{ t('profile.securityDesc') }}</p>
        </section>
      </template>
    </div>

    <EditPersonalSheet v-model:open="showEditPersonal" @updated="handleProfileUpdated" />
    <EditOperatorSheet v-model:open="showEditOperator" @updated="handleProfileUpdated" />
    <ChangePasswordSheet v-model:open="showChangePassword" />
  </AppLayout>
</template>
