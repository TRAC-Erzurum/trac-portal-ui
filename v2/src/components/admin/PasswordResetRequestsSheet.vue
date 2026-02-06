<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X, Copy, AlertTriangle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'

interface PasswordResetRequest {
  id: string
  callSign: string
  operatorId: string | null
  status: string
  createdAt: string
  operator?: {
    id: string
    callSign: string
    fullName?: string
  }
}

interface ApprovedRequest {
  callSign: string
  password: string
}

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()

const requests = ref<PasswordResetRequest[]>([])
const isLoading = ref(false)
const processingId = ref<string | null>(null)
const approvedRequests = ref<ApprovedRequest[]>([])

const fetchRequests = async () => {
  isLoading.value = true
  try {
    requests.value = await api.get<PasswordResetRequest[]>('/auth/password-reset-requests')
  } catch (error) {
    console.error('Failed to fetch requests:', error)
  } finally {
    isLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    fetchRequests()
    approvedRequests.value = []
  }
})

const approveRequest = async (request: PasswordResetRequest) => {
  processingId.value = request.id
  try {
    const result = await api.post<{ newPassword: string }>(`/auth/password-reset-requests/${request.id}/approve`)
    
    approvedRequests.value.push({
      callSign: request.callSign,
      password: result.newPassword
    })
    
    requests.value = requests.value.filter(r => r.id !== request.id)
    emit('updated')
  } catch (error) {
    console.error('Failed to approve:', error)
    toast.error(t('error.serverError'))
  } finally {
    processingId.value = null
  }
}

const rejectRequest = async (request: PasswordResetRequest) => {
  processingId.value = request.id
  try {
    await api.post(`/auth/password-reset-requests/${request.id}/reject`)
    toast.success(t('admin.passwordResetRejected'))
    
    requests.value = requests.value.filter(r => r.id !== request.id)
    emit('updated')
  } catch (error) {
    console.error('Failed to reject:', error)
    toast.error(t('error.serverError'))
  } finally {
    processingId.value = null
  }
}

const copyPassword = async (password: string) => {
  await navigator.clipboard.writeText(password)
  toast.success(t('admin.passwordCopied'))
}

const dismissApproved = (callSign: string) => {
  approvedRequests.value = approvedRequests.value.filter(r => r.callSign !== callSign)
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return t('common.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours })
  return t('common.daysAgo', { count: diffDays })
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('admin.passwordResetRequests') }}</SheetTitle>
        <SheetDescription>
          {{ t('admin.passwordResetRequestsDescription') }}
        </SheetDescription>
      </SheetHeader>

      <div class="py-6 space-y-4">
        <div v-if="approvedRequests.length > 0" class="space-y-3">
          <div
            v-for="approved in approvedRequests"
            :key="approved.callSign"
            class="p-4 border border-green-500/30 bg-green-500/5 rounded-lg space-y-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-green-700 dark:text-green-400">
                  {{ approved.callSign }}
                </p>
                <p class="text-sm text-green-600 dark:text-green-500">
                  {{ t('admin.temporaryPasswordGenerated') }}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                @click="dismissApproved(approved.callSign)"
                class="text-muted-foreground hover:text-foreground"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>

            <div class="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
              <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p class="text-xs text-amber-700 dark:text-amber-300">
                {{ t('admin.temporaryPasswordWarning') }}
              </p>
            </div>

            <div class="flex gap-2">
              <Input 
                :model-value="approved.password" 
                readonly 
                class="font-mono tracking-wider"
              />
              <Button variant="outline" size="icon" @click="copyPassword(approved.password)" :aria-label="t('admin.copyPassword')">
                <Copy class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="p-4 border border-border/50 rounded-lg space-y-2">
            <div class="h-5 w-24 bg-muted animate-pulse rounded" />
            <div class="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>

        <div v-else-if="requests.length === 0 && approvedRequests.length === 0" class="py-8 text-center">
          <p class="text-muted-foreground">{{ t('admin.noPasswordResetRequests') }}</p>
        </div>

        <div v-else-if="requests.length > 0" class="space-y-3">
          <div
            v-for="request in requests"
            :key="request.id"
            class="p-4 border border-border/50 rounded-lg"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="font-semibold">{{ request.callSign }}</p>
                <p v-if="request.operator?.fullName" class="text-sm text-muted-foreground truncate">
                  {{ request.operator.fullName }}
                </p>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ formatRelativeTime(request.createdAt) }}
                </p>
              </div>

              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="approveRequest(request)"
                  :disabled="processingId === request.id"
                  class="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                >
                  <Check class="h-4 w-4 mr-1" />
                  {{ t('admin.approve') }}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  @click="rejectRequest(request)"
                  :disabled="processingId === request.id"
                  class="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <X class="h-4 w-4 mr-1" />
                  {{ t('admin.reject') }}
                </Button>
              </div>
            </div>

            <p v-if="!request.operatorId" class="text-xs text-amber-600 dark:text-amber-400 mt-2">
              {{ t('admin.operatorNotFound') }}
            </p>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
