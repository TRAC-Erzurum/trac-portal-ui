<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Building2, Check, CheckCircle2, ChevronRight, Key, X } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDateFormat } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface PendingMembership {
  id: string
  userId: string
  branchId: string
  user?: { id: string; fullName?: string; operator?: { id?: string; callSign?: string } }
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
const router = useRouter()
const { formatDateSimple } = useDateFormat()
const refreshPendingRequestsCount = inject<() => Promise<void>>('refreshPendingRequestsCount', () => Promise.resolve())
const isLoading = ref(true)
const membershipRequests = ref<BranchRequests[]>([])
const passwordResetRequests = ref<PasswordResetRequest[]>([])
const processingMembershipId = ref<string | null>(null)
const processingPasswordResetId = ref<string | null>(null)
const rejectReason = ref<Record<string, string>>({})
const approveRole = ref<Record<string, string>>({})

const showApproveDialog = ref(false)
const showRejectDialog = ref(false)
const showApprovePwSheet = ref(false)
const showRejectPwDialog = ref(false)
const pendingApprove = ref<{ branchId: string; userId: string; membershipId: string } | null>(null)
const pendingReject = ref<{ branchId: string; userId: string; membershipId: string } | null>(null)
const pendingApprovePwId = ref<string | null>(null)
const pendingRejectPwId = ref<string | null>(null)
const approvePwNewPassword = ref('')
const approvePwConfirmPassword = ref('')

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

function openApproveDialog(branchId: string, userId: string, membershipId: string) {
  pendingApprove.value = { branchId, userId, membershipId }
  showApproveDialog.value = true
}

function openRejectDialog(branchId: string, userId: string, membershipId: string) {
  pendingReject.value = { branchId, userId, membershipId }
  showRejectDialog.value = true
}

async function confirmApproveMembership() {
  if (!pendingApprove.value) return
  const { branchId, userId, membershipId } = pendingApprove.value
  const role = approveRole.value[membershipId]
  if (!role) return
  processingMembershipId.value = membershipId
  showApproveDialog.value = false
  pendingApprove.value = null
  try {
    await api.patch(`/branches/${branchId}/members/${userId}/approve`, { role })
    toast.success(t('admin.roleUpdated'))
    await fetchPending()
    await refreshPendingRequestsCount?.()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

async function confirmRejectMembership() {
  if (!pendingReject.value) return
  const { branchId, userId, membershipId } = pendingReject.value
  processingMembershipId.value = membershipId
  showRejectDialog.value = false
  const reason = rejectReason.value[membershipId] || undefined
  pendingReject.value = null
  try {
    await api.patch(`/branches/${branchId}/members/${userId}/reject`, { rejectionReason: reason })
    toast.success(t('admin.membershipRejected'))
    await fetchPending()
    await refreshPendingRequestsCount?.()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingMembershipId.value = null
  }
}

function openApprovePwSheet(requestId: string) {
  pendingApprovePwId.value = requestId
  approvePwNewPassword.value = ''
  approvePwConfirmPassword.value = ''
  showApprovePwSheet.value = true
}

function openRejectPwDialog(requestId: string) {
  pendingRejectPwId.value = requestId
  showRejectPwDialog.value = true
}

async function confirmApprovePasswordReset() {
  const requestId = pendingApprovePwId.value
  if (!requestId) return
  if (approvePwNewPassword.value.length < 6) {
    toast.error(t('admin.passwordTooShort'))
    return
  }
  if (approvePwNewPassword.value !== approvePwConfirmPassword.value) {
    toast.error(t('admin.passwordMismatch'))
    return
  }
  showApprovePwSheet.value = false
  pendingApprovePwId.value = null
  processingPasswordResetId.value = requestId
  try {
    await api.post(`/auth/password-reset-requests/${requestId}/approve`, {
      newPassword: approvePwNewPassword.value,
    })
    toast.success(t('admin.passwordReset'))
    passwordResetRequests.value = passwordResetRequests.value.filter((r) => r.id !== requestId)
    await refreshPendingRequestsCount?.()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    processingPasswordResetId.value = null
  }
  approvePwNewPassword.value = ''
  approvePwConfirmPassword.value = ''
}

async function confirmRejectPasswordReset() {
  const requestId = pendingRejectPwId.value
  if (!requestId) return
  showRejectPwDialog.value = false
  pendingRejectPwId.value = null
  processingPasswordResetId.value = requestId
  try {
    await api.post(`/auth/password-reset-requests/${requestId}/reject`)
    toast.success(t('admin.passwordResetRejected'))
    passwordResetRequests.value = passwordResetRequests.value.filter((r) => r.id !== requestId)
    await refreshPendingRequestsCount?.()
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

function getOperatorProfilePath(m: PendingMembership): string | null {
  const id = m.user?.operator?.id
  return id ? `/operators/${id}` : null
}

function goToOperatorProfile(m: PendingMembership) {
  const path = getOperatorProfilePath(m)
  if (path) router.push(path)
}

const branchesWithMembershipRequests = computed(() =>
  membershipRequests.value.filter((b) => b.pendingMemberships.length > 0)
)
const totalPendingCount = computed(() => {
  const membership = branchesWithMembershipRequests.value.reduce(
    (sum, b) => sum + b.pendingMemberships.length,
    0
  )
  return membership + passwordResetRequests.value.length
})
const hasAnyRequests = computed(() => totalPendingCount.value > 0)
const membershipCount = computed(() =>
  branchesWithMembershipRequests.value.reduce((s, b) => s + b.pendingMemberships.length, 0)
)

function hasSelectedRole(membershipId: string): boolean {
  return !!approveRole.value[membershipId]
}

onMounted(fetchPending)
</script>

<template>
  <AppLayout :title="t('admin.pendingRequests')">
    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <div class="space-y-4">
        <div class="h-5 w-40 bg-muted rounded-md animate-pulse" />
        <div class="h-4 w-full bg-muted rounded-md animate-pulse" />
        <div class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-20 rounded-lg border border-border bg-muted/30 animate-pulse" />
        </div>
      </div>
      <div class="space-y-4">
        <div class="h-5 w-44 bg-muted rounded-md animate-pulse" />
        <div class="h-4 w-full bg-muted rounded-md animate-pulse" />
        <div class="space-y-2">
          <div v-for="i in 2" :key="i" class="h-16 rounded-lg border border-border bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!hasAnyRequests" class="py-8">
      <p class="text-sm text-muted-foreground flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        {{ t('admin.allCaughtUp') }}
      </p>
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 gap-8 xl:grid-cols-2">
      <!-- Membership -->
      <section>
        <h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Building2 class="h-4 w-4" />
          {{ t('admin.membershipRequests') }}
          <span v-if="membershipCount > 0" class="font-normal text-muted-foreground/80">({{ membershipCount }})</span>
        </h2>
        <p class="text-xs text-muted-foreground mb-4">
          {{ t('admin.membershipRequestsDescription') }}
        </p>

        <div v-if="branchesWithMembershipRequests.length > 0" class="space-y-3">
          <div
            v-for="branch in branchesWithMembershipRequests"
            :key="branch.branchId"
            class="rounded-lg border border-border overflow-hidden"
          >
            <p class="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
              {{ branch.branchName }}
            </p>
            <ul class="divide-y divide-border/50">
              <li
                v-for="m in branch.pendingMemberships"
                :key="m.id"
                class="px-3 py-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)] gap-x-4 gap-y-2 items-start"
              >
                <!-- Sütun 1 - Satır 1: Operatör etiketi + çağrı işareti + ad + tarih -->
                <div class="min-w-0 flex flex-col gap-2">
                  <label class="text-xs text-muted-foreground">{{ t('admin.operator') }}</label>
                  <div class="min-w-0 text-sm leading-8">
                    <span class="font-medium font-mono text-foreground">{{ getMemberLabel(m) }}</span>
                    <template v-if="m.user?.fullName">
                      <span class="text-muted-foreground mx-1">·</span>
                      <span class="text-xs text-muted-foreground">{{ m.user.fullName }}</span>
                    </template>
                    <span class="text-muted-foreground mx-1">·</span>
                    <span class="text-xs text-muted-foreground">{{ formatDateSimple(m.createdAt) }}</span>
                  </div>
                  <!-- Sütun 1 - Satır 2: Detay butonu -->
                  <Button
                    v-if="getOperatorProfilePath(m)"
                    variant="ghost"
                    size="sm"
                    class="h-8 w-full justify-start px-2 text-xs -ml-2"
                    @click="goToOperatorProfile(m)"
                  >
                    <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
                    {{ t('common.detail') }}
                  </Button>
                  <div v-else class="h-8" />
                </div>
                <!-- Sütun 2 - Satır 1: Rol + Select, Satır 2: Onayla -->
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label class="text-xs text-muted-foreground">{{ t('memberships.role') }}</label>
                  <Select
                    :model-value="approveRole[m.id] ?? ''"
                    @update:model-value="(v) => (approveRole[m.id] = v ? String(v) : '')"
                  >
                    <SelectTrigger class="h-8 w-full">
                      <SelectValue :placeholder="t('admin.selectRole')" />
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
                    class="h-8 w-full justify-start"
                    :disabled="processingMembershipId === m.id || !hasSelectedRole(m.id)"
                    @click="openApproveDialog(branch.branchId, m.userId, m.id)"
                  >
                    <Check class="h-4 w-4 mr-2" />
                    {{ t('admin.approve') }}
                  </Button>
                </div>
                <!-- Sütun 3 - Satır 1: Red sebebi + Input, Satır 2: Reddet -->
                <div class="flex flex-col gap-1.5 min-w-0">
                  <label :for="`reject-reason-${m.id}`" class="text-xs text-muted-foreground">{{ t('memberships.rejectionReason') }}</label>
                  <Input
                    :id="`reject-reason-${m.id}`"
                    v-model="rejectReason[m.id]"
                    class="h-8 w-full text-xs"
                    :aria-label="t('admin.rejectionReasonOptional')"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 w-full justify-start"
                    :disabled="processingMembershipId === m.id"
                    @click="openRejectDialog(branch.branchId, m.userId, m.id)"
                  >
                    <X class="h-4 w-4 mr-2" />
                    {{ t('admin.reject') }}
                  </Button>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <p v-else class="py-6 text-sm text-muted-foreground">
          {{ t('admin.noMembershipRequests') }}
        </p>
      </section>

      <!-- Password reset -->
      <section>
        <h2 class="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
          <Key class="h-4 w-4" />
          {{ t('admin.passwordResetRequests') }}
          <span v-if="passwordResetRequests.length > 0" class="font-normal text-muted-foreground/80">({{ passwordResetRequests.length }})</span>
        </h2>
        <p class="text-xs text-muted-foreground mb-4">
          {{ t('admin.passwordResetRequestsDescription') }}
        </p>

        <div v-if="passwordResetRequests.length > 0" class="space-y-2">
          <div
            v-for="req in passwordResetRequests"
            :key="req.id"
            class="flex flex-col gap-2 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium font-mono text-foreground">{{ req.callSign }}</p>
              <p v-if="req.operator?.fullName" class="text-xs text-muted-foreground truncate">
                {{ req.operator.fullName }}
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="processingPasswordResetId === req.id"
                @click="openApprovePwSheet(req.id)"
              >
                <Check class="h-4 w-4 mr-2" />
                {{ t('admin.approve') }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="processingPasswordResetId === req.id"
                @click="openRejectPwDialog(req.id)"
              >
                <X class="h-4 w-4 mr-2" />
                {{ t('admin.reject') }}
              </Button>
            </div>
          </div>
        </div>
        <p v-else class="py-6 text-sm text-muted-foreground">
          {{ t('admin.noPasswordResetRequests') }}
        </p>
      </section>
    </div>

    <!-- Membership approve confirm -->
    <Dialog :open="showApproveDialog" @update:open="showApproveDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('admin.approveConfirmTitle') }}</DialogTitle>
          <DialogDescription>{{ t('admin.approveConfirmDescription') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showApproveDialog = false">{{ t('common.cancel') }}</Button>
          <Button variant="outline" @click="confirmApproveMembership">
            {{ t('admin.approve') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Membership reject confirm -->
    <Dialog :open="showRejectDialog" @update:open="showRejectDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('admin.rejectConfirmTitle') }}</DialogTitle>
          <DialogDescription>{{ t('admin.rejectConfirmDescription') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRejectDialog = false">{{ t('common.cancel') }}</Button>
          <Button variant="outline" @click="confirmRejectMembership">
            {{ t('admin.reject') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Password reset approve: set temporary password -->
    <Sheet v-model:open="showApprovePwSheet">
      <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>{{ t('admin.approvePasswordResetConfirmTitle') }}</SheetTitle>
          <SheetDescription>
            {{ t('admin.approvePasswordResetSheetDescription', { callSign: passwordResetRequests.find(r => r.id === pendingApprovePwId)?.callSign || '' }) }}
          </SheetDescription>
        </SheetHeader>
        <div class="space-y-4 py-6">
          <div class="space-y-2">
            <Label for="approvePwNew">{{ t('admin.newPassword') }}</Label>
            <Input
              id="approvePwNew"
              v-model="approvePwNewPassword"
              type="password"
              :placeholder="t('admin.newPasswordPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <Label for="approvePwConfirm">{{ t('admin.confirmPassword') }}</Label>
            <Input
              id="approvePwConfirm"
              v-model="approvePwConfirmPassword"
              type="password"
              :placeholder="t('admin.confirmPasswordPlaceholder')"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" @click="showApprovePwSheet = false">{{ t('common.cancel') }}</Button>
          <Button
            variant="outline"
            :disabled="processingPasswordResetId !== null || !approvePwNewPassword || !approvePwConfirmPassword"
            @click="confirmApprovePasswordReset"
          >
            {{ processingPasswordResetId ? t('common.loading') : t('admin.approve') }}
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <!-- Password reset reject confirm -->
    <Dialog :open="showRejectPwDialog" @update:open="showRejectPwDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('admin.rejectPasswordResetConfirmTitle') }}</DialogTitle>
          <DialogDescription>{{ t('admin.rejectPasswordResetConfirmDescription') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showRejectPwDialog = false">{{ t('common.cancel') }}</Button>
          <Button variant="outline" @click="confirmRejectPasswordReset">
            {{ t('admin.reject') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
