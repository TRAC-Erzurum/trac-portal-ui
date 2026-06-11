<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Search, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useAsyncStaleGuard } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import type { DisasterMembership, DisasterRole } from '@/types/disaster'

interface UserListItem {
  id: string
  email: string
  fullName: string
  operator?: { id: string; callSign: string } | null
}

interface UsersListResponse {
  data: UserListItem[]
  total: number
}

const props = defineProps<{
  open: boolean
  disasterId: string
  members: DisasterMembership[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: []
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const userSearchGuard = useAsyncStaleGuard()

const selectedRole = ref<DisasterRole>('FIELD_OFFICER')
const userIdInput = ref('')
const userSearch = ref('')
const userSuggestions = ref<UserListItem[]>([])
const isSearchingUsers = ref(false)
const showUserDropdown = ref(false)
const isAdding = ref(false)
const isUpdatingUserId = ref<string | null>(null)
const removeTarget = ref<DisasterMembership | null>(null)
const showRemoveDialog = ref(false)
const isRemoving = ref(false)

const canSearchUsers = computed(() => authStore.isSuperAdmin)

const existingUserIds = computed(() => new Set(props.members.map(m => m.userId)))

const adminCount = computed(
  () => props.members.filter(m => m.role === 'ADMIN').length
)

function userDisplay(user: UserListItem): string {
  const base = user.fullName ? `${user.fullName} (${user.email})` : user.email
  return user.operator?.callSign ? `${user.operator.callSign} · ${base}` : base
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    selectedRole.value = 'FIELD_OFFICER'
    userIdInput.value = ''
    userSearch.value = ''
    userSuggestions.value = []
  }
})

const searchUsers = debounce(async (query: string) => {
  if (!canSearchUsers.value || !query || query.length < 2) {
    userSuggestions.value = []
    return
  }
  const token = userSearchGuard.beginReplace()
  isSearchingUsers.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit', '10')
    params.set('offset', '0')
    params.set('search', query.trim())
    const response = await api.get<UsersListResponse>(`/user/admin/list?${params.toString()}`)
    if (!userSearchGuard.isCurrent(token)) return
    userSuggestions.value = response.data.filter(u => !existingUserIds.value.has(u.id))
  } catch {
    if (!userSearchGuard.isCurrent(token)) return
    userSuggestions.value = []
  } finally {
    if (userSearchGuard.isCurrent(token)) isSearchingUsers.value = false
  }
}, 300)

watch(userSearch, (val) => {
  if (canSearchUsers.value && val) {
    showUserDropdown.value = true
    searchUsers(val)
  } else {
    userSuggestions.value = []
  }
})

function selectUser(user: UserListItem) {
  userIdInput.value = user.id
  userSearch.value = userDisplay(user)
  showUserDropdown.value = false
  userSuggestions.value = []
}

function memberLabel(member: DisasterMembership): string {
  const user = member.user
  if (!user) return member.userId
  const base = user.fullName ? `${user.fullName} (${user.email})` : user.email
  return user.callSign ? `${user.callSign} · ${base}` : base
}

async function handleAddMember() {
  const userId = userIdInput.value.trim()
  if (!userId) {
    toast.error(t('form.validation.required'))
    return
  }

  isAdding.value = true
  try {
    await api.post(`/disaster/${props.disasterId}/members`, {
      userId,
      role: selectedRole.value,
    })
    toast.success(t('disaster.memberAdded'))
    userIdInput.value = ''
    userSearch.value = ''
    emit('updated')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isAdding.value = false
  }
}

async function handleRoleChange(member: DisasterMembership, role: DisasterRole) {
  if (member.role === role) return
  if (member.role === 'ADMIN' && role !== 'ADMIN' && adminCount.value <= 1) {
    toast.error(translateError('error.lastDisasterAdminRequired'))
    return
  }
  isUpdatingUserId.value = member.userId
  try {
    await api.patch(`/disaster/${props.disasterId}/members/${member.userId}`, { role })
    toast.success(t('disaster.memberUpdated'))
    emit('updated')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isUpdatingUserId.value = null
  }
}

function promptRemove(member: DisasterMembership) {
  if (member.role === 'ADMIN' && adminCount.value <= 1) {
    toast.error(translateError('error.lastDisasterAdminRequired'))
    return
  }
  removeTarget.value = member
  showRemoveDialog.value = true
}

async function confirmRemove() {
  if (!removeTarget.value) return
  isRemoving.value = true
  try {
    await api.delete(`/disaster/${props.disasterId}/members/${removeTarget.value.userId}`)
    toast.success(t('disaster.memberRemoved'))
    showRemoveDialog.value = false
    removeTarget.value = null
    emit('updated')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('disaster.manageMembers') }}</SheetTitle>
        <SheetDescription>{{ t('disaster.manageMembersDescription') }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-6 py-4 px-1">
        <div v-if="members.length === 0" class="py-4 text-center text-sm text-muted-foreground">
          {{ t('disaster.noMembers') }}
        </div>
        <ul v-else class="space-y-3">
          <li
            v-for="member in members"
            :key="member.id"
            class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border border-border/50"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ memberLabel(member) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <Select
                :model-value="member.role"
                :disabled="isUpdatingUserId === member.userId"
                @update:model-value="(v) => handleRoleChange(member, v as DisasterRole)"
              >
                <SelectTrigger class="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{{ t('disaster.roleAdmin') }}</SelectItem>
                  <SelectItem value="FIELD_OFFICER">{{ t('disaster.roleFieldOfficer') }}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                class="h-8 w-8 p-0"
                :aria-label="t('disaster.removeMember')"
                @click="promptRemove(member)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </li>
        </ul>

        <div class="space-y-3 pt-2 border-t border-border">
          <p class="text-sm font-medium text-muted-foreground">{{ t('disaster.addMember') }}</p>
          <p v-if="!canSearchUsers" class="text-xs text-muted-foreground">
            {{ t('disaster.userPickerLimitation') }}
          </p>

          <div v-if="canSearchUsers" class="space-y-2">
            <Label for="member-user-search">{{ t('disaster.userIdOrEmail') }}</Label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="member-user-search"
                v-model="userSearch"
                type="text"
                :placeholder="t('disaster.userSearchPlaceholder')"
                class="pl-9"
                @focus="showUserDropdown = userSearch.length >= 2"
              />
              <div
                v-if="showUserDropdown && (userSuggestions.length > 0 || isSearchingUsers)"
                class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
              >
                <div v-if="isSearchingUsers" class="p-3 text-center text-sm text-muted-foreground">
                  {{ t('common.loading') }}
                </div>
                <button
                  v-for="user in userSuggestions"
                  :key="user.id"
                  type="button"
                  class="w-full p-3 text-left hover:bg-muted/50 text-sm"
                  @click="selectUser(user)"
                >
                  {{ userDisplay(user) }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="space-y-2">
            <Label for="member-user-id">{{ t('disaster.userIdOrEmail') }}</Label>
            <Input
              id="member-user-id"
              v-model="userIdInput"
              type="text"
              :placeholder="t('disaster.userIdOrEmailPlaceholder')"
            />
          </div>

          <div class="space-y-2">
            <Label for="member-role">{{ t('disaster.memberRole') }}</Label>
            <Select v-model="selectedRole">
              <SelectTrigger id="member-role" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{{ t('disaster.roleAdmin') }}</SelectItem>
                <SelectItem value="FIELD_OFFICER">{{ t('disaster.roleFieldOfficer') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" class="w-full" :disabled="isAdding" @click="handleAddMember">
            <Check class="h-4 w-4 mr-2" />
            {{ isAdding ? t('common.loading') : t('disaster.addMember') }}
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <Dialog v-model:open="showRemoveDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('disaster.removeMember') }}</DialogTitle>
        <DialogDescription>{{ t('disaster.removeMemberConfirm') }}</DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" :disabled="isRemoving" @click="showRemoveDialog = false">
          {{ t('common.cancel') }}
        </Button>
        <Button variant="destructive" class="trac-btn-destructive-outlined" :disabled="isRemoving" @click="confirmRemove">
          <Trash2 v-if="!isRemoving" class="h-4 w-4 mr-2" />
          {{ isRemoving ? t('common.loading') : t('common.delete') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
