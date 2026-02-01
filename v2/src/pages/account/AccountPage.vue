<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Shield, Calendar, MapPin, Pencil, Camera, Key, ExternalLink, User, Radio } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import EditPersonalSheet from '@/components/profile/EditPersonalSheet.vue'
import EditOperatorSheet from '@/components/profile/EditOperatorSheet.vue'
import ChangePasswordSheet from '@/components/profile/ChangePasswordSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

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

const avatarUrl = computed(() => {
  if (!profile.value?.picture) return null
  if (profile.value.picture.startsWith('http')) return profile.value.picture
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  return `${baseUrl}${profile.value.picture}`
})

const formattedCallSign = computed(() => {
  const op = profile.value?.operator
  if (!op) return '-'
  const parts = [op.prefix, op.callSign, op.suffix].filter(Boolean)
  return parts.join('/')
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
  if (!profile.value?.createdAt) return '-'
  return new Date(profile.value.createdAt).toLocaleDateString()
})

const roleLabel = computed(() => {
  const role = profile.value?.role
  if (!role) return '-'
  return t(`roles.${role}`, role)
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

async function handleProfileUpdated() {
  await fetchProfile()
  await authStore.checkAuth()
}

onMounted(fetchProfile)
</script>

<template>
  <AppLayout :title="t('nav.account')">
    <div class="max-w-2xl mx-auto">
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
            <Avatar class="h-24 w-24">
              <AvatarImage v-if="avatarUrl" :src="avatarUrl" />
              <AvatarFallback class="bg-primary text-primary-foreground text-lg font-bold">
                {{ profile.operator?.callSign || '?' }}
              </AvatarFallback>
            </Avatar>
            <button
              @click="triggerFileInput"
              :disabled="isUploadingAvatar"
              class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
            >
              <Camera v-if="!isUploadingAvatar" class="h-5 w-5 text-white" />
              <div v-else class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            />
          </div>

          <div class="flex-1 text-center sm:text-left">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 class="text-2xl font-bold">{{ formattedCallSign }}</h2>
                <p v-if="profile.fullName" class="text-lg text-muted-foreground">{{ profile.fullName }}</p>
                <p class="text-sm text-muted-foreground">{{ profile.email }}</p>
              </div>
              <Button variant="ghost" size="icon" @click="showEditPersonal = true" class="self-center sm:self-start">
                <Pencil class="h-4 w-4" />
              </Button>
            </div>

            <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <div class="flex items-center gap-1.5">
                <Shield class="h-4 w-4" />
                <span>{{ roleLabel }}</span>
              </div>
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
            <Button variant="ghost" size="icon" @click="showEditOperator = true">
              <Pencil class="h-4 w-4" />
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
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Key class="h-4 w-4" />
              {{ t('profile.security') }}
            </h3>
            <Button variant="ghost" size="icon" @click="showChangePassword = true">
              <Pencil class="h-4 w-4" />
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
