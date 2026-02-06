<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Building2, Check, Key, X } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useDateFormat } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface PendingMembership {
  id: string
  userId: string
  branchId: string
  user?: { id: string; fullName?: string; operator?: { callSign?: string } }
  branch?: { id: string; name: string }
  createdAt: string
}

interface BranchRequests {
  branchId: string
  branchName: string
  pendingMemberships: PendingMembership[]
}

interface PasswordResetRequest {
  id: string
  callSign: string
  operatorId: string | null
  status: string
  createdAt: string
  operator?: { callSign: string; fullName?: string }
}

interface AdminPendingResponse {
  membershipRequests: BranchRequests[]
  passwordResetRequests: PasswordResetRequest[]
}

const { t } = useI18n()
const { formatDateSimple } = useDateFormat()
const isLoading = ref(true)
const membershipRequests = ref<BranchRequests[]>([])
const passwordResetRequests = ref<PasswordResetRequest[]>([])
const processingMembershipId = ref<string | null>(null)
const processingPasswordResetId = ref<string | null>(null)
const rejectReason = ref<Record<string, string>>({})
const approveRole = ref<Record<string, string>>({})

async function fetchPending() {
  isLoading.value = true
  try {
    const data = await api.get<AdminPendingResponse>('/auth/admin/pending-requests')
    membershipRequests.value = data.membershipRequests || []
    passwordResetRequests.value = data.passwordResetRequests || []
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isLoading.value = false
  }
}

async function approveMembership(branchId: string, userId: string, membershipId: string) {
  processingMembershipId.value = membershipId
  try {
    const role = approveRole.value[membershipId] || 'member'
    await api.patch(`/branches/${branchId}/members/${userId}/approve`, { role })
    toast.success(t('admin.roleUpdated') || 'Approved')
    await fetchPending()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

async function rejectMembership(branchId: string, userId: string, membershipId: string) {
  processingMembershipId.value = membershipId
  try {
    await api.patch(`/branches/${branchId}/members/${userId}/reject`, {
      rejectionReason: rejectReason.value[membershipId] || undefined,
    })
    toast.success(t('admin.reject') + ' OK')
    await fetchPending()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

async function approvePasswordReset(requestId: string) {
  processingPasswordResetId.value = requestId
  try {
    await api.post<{ newPassword: string }>(`/auth/password-reset-requests/${requestId}/approve`)
    toast.success(t('admin.temporaryPasswordGenerated'))
    passwordResetRequests.value = passwordResetRequests.value.filter((r) => r.id !== requestId)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingPasswordResetId.value = null
  }
}

async function rejectPasswordReset(requestId: string) {
  processingPasswordResetId.value = requestId
  try {
    await api.post(`/auth/password-reset-requests/${requestId}/reject`)
    toast.success(t('admin.passwordResetRejected'))
    passwordResetRequests.value = passwordResetRequests.value.filter((r) => r.id !== requestId)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingPasswordResetId.value = null
  }
}

function getMemberLabel(m: PendingMembership): string {
  if (m.user?.operator?.callSign) return m.user.operator.callSign
  return m.user?.fullName || m.userId.slice(0, 8)
}

onMounted(fetchPending)
</script>

<template>
  <AppLayout :title="t('admin.pendingRequests')">
    <p class="text-sm text-muted-foreground mb-6">
      {{ t('admin.pendingRequestsDescription') }}
    </p>

    <div v-if="isLoading" class="space-y-6">
      <div class="h-32 bg-muted rounded animate-pulse" />
      <div class="h-48 bg-muted rounded animate-pulse" />
    </div>

    <template v-else>
      <section v-if="membershipRequests.some((b) => b.pendingMemberships.length > 0)" class="mb-8">
        <h2 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Building2 class="h-4 w-4" />
          {{ t('admin.membershipRequests') }}
        </h2>
        <div class="space-y-6">
          <div
            v-for="branch in membershipRequests.filter((b) => b.pendingMemberships.length > 0)"
            :key="branch.branchId"
            class="border border-border rounded-lg p-4"
          >
            <h3 class="font-medium mb-3">{{ branch.branchName }}</h3>
            <ul class="space-y-3">
              <li
                v-for="m in branch.pendingMemberships"
                :key="m.id"
                class="flex flex-wrap items-center gap-3 py-2 border-b border-border/50 last:border-0"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-medium">{{ getMemberLabel(m) }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDateSimple(m.createdAt) }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
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
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="processingMembershipId === m.id"
                    class="text-green-600 hover:text-green-700"
                    @click="approveMembership(branch.branchId, m.userId, m.id)"
                  >
                    <Check class="h-4 w-4 mr-1" />
                    {{ t('admin.approve') }}
                  </Button>
                  <Input
                    v-model="rejectReason[m.id]"
                    class="w-40 h-8 text-xs"
                    :placeholder="t('admin.rejectionReasonOptional')"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="processingMembershipId === m.id"
                    class="text-red-600 hover:text-red-700"
                    @click="rejectMembership(branch.branchId, m.userId, m.id)"
                  >
                    <X class="h-4 w-4 mr-1" />
                    {{ t('admin.reject') }}
                  </Button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div
        v-else
        class="text-sm text-muted-foreground py-4"
      >
        {{ t('admin.noMembershipRequests') }}
      </div>

      <Separator class="my-8" />

      <section>
        <h2 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Key class="h-4 w-4" />
          {{ t('admin.passwordResetRequests') }}
        </h2>
        <div v-if="passwordResetRequests.length === 0" class="text-sm text-muted-foreground py-4">
          {{ t('admin.noPasswordResetRequests') }}
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="req in passwordResetRequests"
            :key="req.id"
            class="flex items-center justify-between gap-3 py-2 border-b border-border/50"
          >
            <div>
              <p class="font-medium">{{ req.callSign }}</p>
              <p v-if="req.operator?.fullName" class="text-xs text-muted-foreground">
                {{ req.operator.fullName }}
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="processingPasswordResetId === req.id"
                class="text-green-600 hover:text-green-700"
                @click="approvePasswordReset(req.id)"
              >
                <Check class="h-4 w-4 mr-1" />
                {{ t('admin.approve') }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="processingPasswordResetId === req.id"
                class="text-red-600 hover:text-red-700"
                @click="rejectPasswordReset(req.id)"
              >
                <X class="h-4 w-4 mr-1" />
                {{ t('admin.reject') }}
              </Button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </AppLayout>
</template>
