<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Calendar, Camera, ChevronRight, Key, LogIn, Mail, Pencil, Trash2, UserCircle, Phone, MapPin, HeartPulse, Briefcase, GraduationCap } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ChangePasswordSheet from '@/components/profile/ChangePasswordSheet.vue'
import EditOperatorSheet from '@/components/profile/EditOperatorSheet.vue'
import EditContactInfoSheet from '@/components/profile/EditContactInfoSheet.vue'
import EditPersonalBasicsSheet from '@/components/profile/EditPersonalBasicsSheet.vue'
import EditEmergencyContactsSheet from '@/components/profile/EditEmergencyContactsSheet.vue'
import EditExpertiseSheet from '@/components/profile/EditExpertiseSheet.vue'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { MobileFab } from '@/components/shared'
import type { MobileFabAction } from '@/components/shared'
import { useDateFormat } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { LocatorMapPreview } from '@/components/shared'
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
  dmrId?: number | null
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
  profession?: string | null
  birthDate?: string | null
  idNumber?: string | null
  phoneNumbers?: string[] | null
  addresses?: { type: string; address: string; qth: string }[] | null
  emergencyContacts?: { name: string; callSign?: string; phone: string }[] | null
  expertiseAreas?: string[] | null
  trainings?: { title: string; institution?: string; year?: number }[] | null
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
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
const showEditContact = ref(false)
const showEditPersonalBasics = ref(false)
const showEditEmergency = ref(false)
const showEditExpertise = ref(false)
const showEditOperator = ref(false)
const showChangePassword = ref(false)
const pendingEditOperator = ref(false)

const formattedCallSign = computed(() => {
  const op = profile.value?.operator
  if (!op) return '-'
  return formatCallSign(op)
})

const gridSquareForMap = computed(() =>
  profile.value?.operator?.gridSquare?.trim() ?? null
)

function onLocatorMapClick() {
  if (gridSquareForMap.value) {
    router.push({ path: '/map', query: { locator: gridSquareForMap.value } })
  } else {
    showEditOperator.value = true
  }
}

const memberSince = computed(() => formatDateLong(profile.value?.createdAt))

const mobileFabActions = computed<MobileFabAction[]>(() => {
  return [
    { key: 'editPersonal', label: t('account.personalInfo'), icon: Pencil as Component },
    { key: 'editContact', label: t('account.contactInfo'), icon: Phone as Component },
    { key: 'editEmergency', label: t('account.emergencyContacts'), icon: HeartPulse as Component },
    { key: 'editExpertise', label: t('account.editExpertise'), icon: GraduationCap as Component },
    { key: 'changePassword', label: t('profile.changePassword'), icon: Key as Component },
    { key: 'editOperator', label: t('profile.editOperatorAction'), icon: Pencil as Component },
  ]
})

const handleFabAction = (key: string) => {
  switch (key) {
    case 'editPersonal': showEditPersonalBasics.value = true; break
    case 'editContact': showEditContact.value = true; break
    case 'editEmergency': showEditEmergency.value = true; break
    case 'editExpertise': showEditExpertise.value = true; break
    case 'changePassword': showChangePassword.value = true; break
    case 'editOperator': showEditOperator.value = true; break
  }
}

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

watch(
  () => route.query.edit,
  (edit) => {
    if (edit === 'operator') {
      pendingEditOperator.value = true
      router.replace({ path: '/account', query: {} })
    }
  },
  { immediate: true }
)

watch(
  () => [profile.value, pendingEditOperator.value] as const,
  ([p, pending]) => {
    if (pending && p) {
      pendingEditOperator.value = false
      showEditOperator.value = true
    }
  },
  { immediate: true }
)
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
                :class="{ 'opacity-100': isUploadingAvatar }">
                <div v-if="isUploadingAvatar"
                  class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <template v-else>
                  <button @click="triggerFileInput" class="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    :title="t('profile.changeAvatar')">
                    <Camera class="h-4 w-4 text-white" />
                  </button>
                  <button v-if="profile.picture" @click="deleteAvatar"
                    class="p-1.5 rounded-full hover:bg-red-500/50 transition-colors" :title="t('profile.deleteAvatar')">
                    <Trash2 class="h-4 w-4 text-white" />
                  </button>
                </template>
              </div>
              <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden"
                @change="handleAvatarChange" />
            </div>
            <div class="min-w-0 flex-1 space-y-3">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h2 class="text-2xl font-bold">{{ formattedCallSign }}</h2>
                    <Button variant="ghost" size="icon"
                      class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                      @click="showChangePassword = true" :title="t('profile.changePassword')">
                      <Key class="h-4 w-4" />
                    </Button>
                  </div>
                  <p v-if="profile.fullName" class="text-lg text-muted-foreground">{{ profile.fullName }}</p>
                </div>
              </div>
              <div class="flex flex-wrap items-start justify-between gap-3 text-sm text-muted-foreground">
                <div
                  class="flex min-w-0 flex-1 flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
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
              </div>
            </div>
          </div>

          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center justify-end gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs text-muted-foreground">{{ t('profile.dmrId') }}</p>
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-medium font-mono">{{ profile.operator?.dmrId || '-' }}</p>
                  <Button variant="ghost" size="icon"
                    class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                    @click="showEditOperator = true">
                    <Pencil class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p class="text-xs text-muted-foreground">{{ t('profile.qth') }}</p>
            <LocatorMapPreview :grid-square="gridSquareForMap" @click="onLocatorMapClick" />
          </div>
        </div>

        <!-- Detailed Profile Information (Sensitive) -->
         
        <div class="mt-6 bg-muted/50 p-3 rounded-md border border-muted text-xs text-muted-foreground mb-6 text-center">
          {{ t('account.sensitiveDataNotice') }}
        </div>
        <div class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <!-- Contact Info Section -->
          <div class="space-y-4 rounded-xl border p-5">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-semibold">
                <Phone class="h-4 w-4 text-primary" />
                {{ t('account.contactInfo') }}
              </h3>
              <Button variant="ghost" size="icon"
                class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                @click="showEditContact = true">
                <Pencil class="h-4 w-4" />
              </Button>
            </div>
            <div class="space-y-3">
              <div v-if="profile.phoneNumbers?.length" class="space-y-1">
                <p class="text-xs text-muted-foreground">{{ t('account.phoneNumbers') }}</p>
                <div v-for="phone in profile.phoneNumbers" :key="phone" class="text-sm">{{ phone }}</div>
              </div>
              <div v-if="profile.addresses?.length" class="space-y-1">
                <p class="text-xs text-muted-foreground">{{ t('account.addresses') }}</p>
                <div v-for="(addr, idx) in profile.addresses" :key="idx" class="border-l-2 pl-3 py-1 space-y-1">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                    <span v-if="addr.type === 'home'">{{ t('account.addressHome') }}</span>
                    <span v-else-if="addr.type === 'work'">{{ t('account.addressWork') }}</span>
                    <span v-else>{{ t('account.addressOther') }}</span>
                    <span v-if="addr.qth" class="flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      <MapPin class="h-3 w-3" />
                      {{ addr.qth }}
                    </span>
                  </div>
                  <div class="text-sm whitespace-pre-wrap">{{ addr.address }}</div>
                </div>
              </div>
              <div v-if="!profile.phoneNumbers?.length && !profile.addresses?.length"
                class="text-sm text-muted-foreground italic">
                {{ t('common.noData') }}
              </div>
            </div>
          </div>

          <!-- Personal Info Section -->
          <div class="space-y-4 rounded-xl border p-5">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-semibold">
                <UserCircle class="h-4 w-4 text-primary" />
                {{ t('account.personalInfo') }}
              </h3>
              <Button variant="ghost" size="icon"
                class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                @click="showEditPersonalBasics = true">
                <Pencil class="h-4 w-4" />
              </Button>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground">{{ t('account.profession') }}</p>
                <p class="text-sm font-medium flex items-center gap-2">
                  <Briefcase class="h-4 w-4 text-muted-foreground" />
                  {{ profile.profession || '-' }}
                </p>
              </div>
              <div class="space-y-1">
                <p class="text-xs text-muted-foreground">{{ t('account.birthDate') }}</p>
                <p class="text-sm font-medium flex items-center gap-2">
                  <Calendar class="h-4 w-4 text-muted-foreground" />
                  {{ profile.birthDate ? formatDateLong(profile.birthDate) : '-' }}
                </p>
              </div>
              <div class="space-y-1 sm:col-span-2">
                <p class="text-xs text-muted-foreground">{{ t('account.idNumber') }}</p>
                <p class="text-sm font-medium flex items-center gap-2">
                  <UserCircle class="h-4 w-4 text-muted-foreground" />
                  {{ profile.idNumber || '-' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Emergency Contact Section -->
          <div class="space-y-4 rounded-xl border p-5 md:col-span-2">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-semibold">
                <HeartPulse class="h-4 w-4 text-destructive" />
                {{ t('account.emergencyContacts') }}
              </h3>
              <Button variant="ghost" size="icon"
                class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                @click="showEditEmergency = true">
                <Pencil class="h-4 w-4" />
              </Button>
            </div>
            <div v-if="profile.emergencyContacts?.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="(contact, idx) in profile.emergencyContacts" :key="idx"
                class="rounded-lg bg-muted/30 p-3 flex flex-col gap-1">
                <div class="flex items-center justify-between font-medium">
                  <span class="truncate">{{ contact.name }}</span>
                  <span v-if="contact.callSign" class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{{
                    contact.callSign }}</span>
                </div>
                <div class="text-sm text-muted-foreground">{{ contact.phone }}</div>
              </div>
            </div>
            <div v-else class="text-sm text-muted-foreground italic">
              {{ t('common.noData') }}
            </div>
          </div>

          <!-- Expertise & Training Section -->
          <div class="space-y-6 rounded-xl border p-5 md:col-span-2">
            <div class="flex items-center justify-between">
              <h3 class="flex items-center gap-2 font-semibold">
                <GraduationCap class="h-4 w-4 text-primary" />
                {{ t('account.expertise') }}
              </h3>
              <Button variant="ghost" size="icon"
                class="hidden sm:flex h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                @click="showEditExpertise = true">
                <Pencil class="h-4 w-4" />
              </Button>
            </div>

            <div class="grid gap-8 lg:grid-cols-2">
              <!-- Expertise Areas -->
              <div class="space-y-3">
                <p class="text-sm font-medium text-muted-foreground uppercase tracking-wider">{{ t('account.expertiseAreas') }}</p>
                <div v-if="profile.expertiseAreas?.length" class="flex flex-wrap gap-2">
                  <div v-for="area in profile.expertiseAreas" :key="area" class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-primary/5 text-primary-foreground font-normal border-primary/20">
                    {{ area }}
                  </div>
                </div>
                <div v-else class="text-sm text-muted-foreground italic">
                  {{ t('account.expertiseEmpty') }}
                </div>
              </div>

              <!-- Trainings -->
              <div class="space-y-3">
                <p class="text-sm font-medium text-muted-foreground uppercase tracking-wider">{{ t('account.trainings') }}</p>
                <div v-if="profile.trainings?.length" class="space-y-3">
                  <div v-for="(training, idx) in profile.trainings" :key="idx" class="flex gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <GraduationCap class="h-5 w-5" />
                    </div>
                    <div>
                      <h4 class="text-sm font-semibold leading-none">{{ training.title }}</h4>
                      <p v-if="training.institution" class="mt-1 text-xs text-muted-foreground">{{ training.institution }}</p>
                      <p v-if="training.year" class="mt-1 text-xs font-medium text-primary">{{ training.year }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-muted-foreground italic">
                  {{ t('account.expertiseEmpty') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section v-if="profileUrl && !authStore.isGuest" class="mt-10 space-y-4">
          <RouterLink :to="profileUrl"
            class="flex items-center gap-5 p-6 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 group">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
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
            <ChevronRight
              class="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </RouterLink>
        </section>
      </template>
    </div>

    <MobileFab :actions="mobileFabActions" @action="handleFabAction" />

    <EditPersonalBasicsSheet v-model:open="showEditPersonalBasics" :initial-profile="profile"
      @updated="handleProfileUpdated" />
    <EditContactInfoSheet v-model:open="showEditContact" :initial-profile="profile" @updated="handleProfileUpdated" />
    <EditEmergencyContactsSheet v-model:open="showEditEmergency" :initial-profile="profile"
      @updated="handleProfileUpdated" />
    <EditExpertiseSheet v-model:open="showEditExpertise" :initial-profile="profile" @updated="handleProfileUpdated" />
    <EditOperatorSheet v-model:open="showEditOperator" :initial-profile="profile" @updated="handleProfileUpdated" />
    <ChangePasswordSheet v-model:open="showChangePassword" />
  </AppLayout>
</template>
