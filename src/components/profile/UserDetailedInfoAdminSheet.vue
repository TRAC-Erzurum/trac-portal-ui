<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Phone, MapPin, HeartPulse, Briefcase, Calendar, Badge, UserCircle } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useDateFormat } from '@/composables'
import { api } from '@/lib/api'

interface Address {
  type: string
  address: string
  qth: string
}

interface EmergencyContact {
  name: string
  callSign?: string
  phone: string
}

interface UserProfile {
  id: string
  fullName?: string
  profession?: string | null
  birthDate?: string | null
  idNumber?: string | null
  phoneNumbers?: string[] | null
  addresses?: Address[] | null
  emergencyContacts?: EmergencyContact[] | null
}

const props = defineProps<{
  open: boolean
  userId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const { formatDateLong } = useDateFormat()

const profile = ref<UserProfile | null>(null)
const isLoading = ref(false)

async function fetchDetails() {
  if (!props.userId) return
  isLoading.value = true
  try {
    profile.value = await api.get<UserProfile>(`/user/${props.userId}`)
  } catch (err) {
    console.error('Failed to fetch user details:', err)
  } finally {
    isLoading.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    fetchDetails()
  }
})
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('account.detailedInfo') }}</SheetTitle>
        <SheetDescription>{{ profile?.fullName }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoading" class="py-10 flex justify-center">
        <div class="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="profile" class="mt-8 space-y-8 pb-10">
        <!-- Contact Info Section -->
        <div class="space-y-4">
          <h3 class="flex items-center gap-2 font-semibold text-lg">
            <Phone class="h-5 w-5 text-primary" />
            {{ t('account.contactInfo') }}
          </h3>
          <div class="space-y-4">
            <div v-if="profile.phoneNumbers?.length" class="space-y-2">
              <p class="text-xs font-bold uppercase text-muted-foreground">{{ t('account.phoneNumbers') }}</p>
              <div v-for="phone in profile.phoneNumbers" :key="phone" class="text-sm border p-2 rounded bg-muted/20">{{ phone }}</div>
            </div>
            <div v-if="profile.addresses?.length" class="space-y-2">
              <p class="text-xs font-bold uppercase text-muted-foreground">{{ t('account.addresses') }}</p>
              <div v-for="(addr, idx) in profile.addresses" :key="idx" class="border p-3 rounded bg-muted/20 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">
                    <template v-if="addr.type === 'home'">{{ t('account.addressHome') }}</template>
                    <template v-else-if="addr.type === 'work'">{{ t('account.addressWork') }}</template>
                    <template v-else>{{ t('account.addressOther') }}</template>
                  </span>
                  <span v-if="addr.qth" class="flex items-center gap-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                    <MapPin class="h-3 w-3" />
                    {{ addr.qth }}
                  </span>
                </div>
                <div class="text-sm whitespace-pre-wrap">{{ addr.address }}</div>
              </div>
            </div>
            <div v-if="!profile.phoneNumbers?.length && !profile.addresses?.length" class="text-sm text-muted-foreground italic">
              {{ t('common.noData') }}
            </div>
          </div>
        </div>

        <Separator />

        <!-- Personal Info Section -->
        <div class="space-y-4">
          <h3 class="flex items-center gap-2 font-semibold text-lg">
            <UserCircle class="h-5 w-5 text-primary" />
            {{ t('account.personalInfo') }}
          </h3>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="text-xs font-bold uppercase text-muted-foreground">{{ t('account.profession') }}</p>
              <p class="text-sm font-medium flex items-center gap-2">
                <Briefcase class="h-4 w-4 text-muted-foreground" />
                {{ profile.profession || '-' }}
              </p>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold uppercase text-muted-foreground">{{ t('account.birthDate') }}</p>
              <p class="text-sm font-medium flex items-center gap-2">
                <Calendar class="h-4 w-4 text-muted-foreground" />
                {{ profile.birthDate ? formatDateLong(profile.birthDate) : '-' }}
              </p>
            </div>
            <div class="space-y-1 sm:col-span-2">
              <p class="text-xs font-bold uppercase text-muted-foreground">{{ t('account.idNumber') }}</p>
              <p class="text-sm font-medium flex items-center gap-2">
                <Badge class="h-4 w-4 text-muted-foreground" />
                {{ profile.idNumber || '-' }}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Emergency Contact Section -->
        <div class="space-y-4">
          <h3 class="flex items-center gap-2 font-semibold text-lg">
            <HeartPulse class="h-5 w-5 text-destructive" />
            {{ t('account.emergencyContacts') }}
          </h3>
          <div v-if="profile.emergencyContacts?.length" class="space-y-3">
            <div v-for="(contact, idx) in profile.emergencyContacts" :key="idx" class="rounded-lg border p-3 flex flex-col gap-1 bg-muted/20">
              <div class="flex items-center justify-between font-medium">
                <span class="truncate">{{ contact.name }}</span>
                <span v-if="contact.callSign" class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{{ contact.callSign }}</span>
              </div>
              <div class="text-sm text-muted-foreground">{{ contact.phone }}</div>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground italic">
            {{ t('common.noData') }}
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
