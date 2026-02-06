<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { Calendar, Camera, ChevronRight, ExternalLink, Key, LogIn, Mail, Pencil, Trash2, UserCircle } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ChangePasswordSheet from '@/components/profile/ChangePasswordSheet.vue'
import EditOperatorSheet from '@/components/profile/EditOperatorSheet.vue'
import EditPersonalSheet from '@/components/profile/EditPersonalSheet.vue'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useDateFormat } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign } from '@/lib/formatters'

interface Operator {
  id?: string
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
const { formatDateLong } = useDateFormat()

const profileUrl = computed(() => {
  const id = authStore.user?.operator?.id ?? profile.value?.operator?.id
  return id ? { name: 'profile', params: { id } } : null
})

const profile = ref<Profile | null>(null)
const isLoading = ref(true)
const fileInputRef = ref<HTMLInputElement>()
const isUploadingAvatar = ref(false)
const showEditPersonal = ref(false)
const showEditOperator = ref(false)
const showChangePassword = ref(false)

const formattedCallSign = computed(() => {
  const op = profile.value?.operator
  if (!op) return '-'
  return formatCallSign(op)
})

const qth = computed(() => {
  const op = profile.value?.operator
  if (!op) return null
  const parts = [op.district, op.city, op.country].filter(Boolean)
  return parts.length > 0 ? parts.join(' • ') : null
})

const gridSquareUrl = computed(() => {
  const gs = profile.value?.operator?.gridSquare
  return gs ? `https://k7fry.com/grid/?qth=${gs}` : null
})

const memberSince = computed(() => formatDateLong(profile.value?.createdAt))

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
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div class="relative group flex justify-center sm:justify-start shrink-0">
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
            <div class="min-w-0 flex-1 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <h2 class="text-2xl font-bold">{{ formattedCallSign }}</h2>
                  <p v-if="profile.fullName" class="text-lg text-muted-foreground">{{ profile.fullName }}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  :title="t('profile.editNameTooltip')"
                  class="shrink-0"
                  @click="showEditPersonal = true"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
              </div>
              <div class="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                <div class="flex min-w-0 flex-1 flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                  <span v-if="memberSince" class="flex items-center gap-1.5">
                    <Calendar class="h-4 w-4 shrink-0" />
                    {{ memberSince }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <Mail class="h-4 w-4 shrink-0" />
                    {{ profile.email }}
                  </span>
                  <span v-if="profile.provider" class="flex items-center gap-1.5">
                    <LogIn class="h-4 w-4 shrink-0" />
                    <span class="capitalize">{{ profile.provider }}</span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  :title="t('profile.changePassword')"
                  class="shrink-0"
                  @click="showChangePassword = true"
                >
                  <Key class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div class="min-w-0 space-y-3">
            <div class="flex items-center justify-end gap-2">
              <p class="text-xs text-muted-foreground mr-auto">{{ t('profile.qth') }}</p>
              <Button
                variant="outline"
                size="icon-sm"
                :title="t('profile.editQthTooltip')"
                @click="showEditOperator = true"
              >
                <Pencil class="h-4 w-4" />
              </Button>
            </div>
            <p class="font-medium">{{ qth || '-' }}</p>
            <p class="text-xs text-muted-foreground">{{ t('profile.locator') }}</p>
            <div>
              <a
                v-if="gridSquareUrl"
                :href="gridSquareUrl"
                target="_blank"
                class="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {{ profile.operator?.gridSquare }}
                <ExternalLink class="h-3 w-3" />
              </a>
              <p v-else class="text-sm font-medium">-</p>
            </div>
          </div>
        </div>

        <section v-if="profileUrl" class="mt-10">
          <RouterLink
            :to="profileUrl"
            class="flex items-center gap-5 p-6 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 group"
          >
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
              <UserCircle class="h-8 w-8" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {{ t('account.viewProfile') }}
              </h3>
              <p class="text-sm text-muted-foreground mt-0.5">
                {{ t('account.viewProfileDesc') }}
              </p>
            </div>
            <ChevronRight class="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </RouterLink>
        </section>
      </template>
    </div>

    <EditPersonalSheet v-model:open="showEditPersonal" @updated="handleProfileUpdated" />
    <EditOperatorSheet v-model:open="showEditOperator" @updated="handleProfileUpdated" />
    <ChangePasswordSheet v-model:open="showChangePassword" />
  </AppLayout>
</template>
