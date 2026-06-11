<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Key } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ResetPasswordSheet from '@/components/admin/ResetPasswordSheet.vue'
import { SearchInput } from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAsyncStaleGuard } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import { getRoleBadgeClass } from '@/lib/ui-helpers'

interface UserListItem {
  id: string
  email: string
  fullName: string
  globalRole: string
  role: string
  createdAt: string
  operator: { id: string; callSign: string } | null
}

interface UsersListResponse {
  data: UserListItem[]
  total: number
  limit: number
  offset: number
}

type OperatorFilter = 'all' | 'with' | 'without'

const { t, locale } = useI18n()

const users = ref<UserListItem[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const operatorFilter = ref<OperatorFilter>('all')
const offset = ref(0)
const pageSize = 24
const hasMore = ref(false)

const resetPasswordUser = ref<UserListItem | null>(null)
const showResetPasswordSheet = ref(false)

const usersListGuard = useAsyncStaleGuard()

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const resetPasswordLabel = computed(() => {
  const user = resetPasswordUser.value
  if (!user) return ''
  return user.operator?.callSign || user.fullName || user.email
})

async function fetchUsers(append = false) {
  const token = append ? usersListGuard.beginAppend() : usersListGuard.beginReplace()
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('limit', String(pageSize))
    params.set('offset', String(offset.value))
    if (search.value.trim()) params.set('search', search.value.trim())
    if (operatorFilter.value === 'with') params.set('hasOperator', 'true')
    if (operatorFilter.value === 'without') params.set('hasOperator', 'false')

    const response = await api.get<UsersListResponse>(`/user/admin/list?${params.toString()}`)

    if (!usersListGuard.isCurrent(token)) return

    if (append) {
      users.value = [...users.value, ...response.data]
    } else {
      users.value = response.data
    }

    total.value = response.total
    hasMore.value = users.value.length < response.total
  } catch (e) {
    if (!usersListGuard.isCurrent(token)) return
    const error = e as ApiError
    toast.error(translateError(error.message))
    users.value = []
    total.value = 0
    hasMore.value = false
  } finally {
    if (usersListGuard.isCurrent(token)) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

function handleSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    offset.value = 0
    fetchUsers()
  }, 300)
}

function handleFilterChange() {
  offset.value = 0
  fetchUsers()
}

function loadMore() {
  offset.value += pageSize
  fetchUsers(true)
}

function openResetPassword(user: UserListItem) {
  resetPasswordUser.value = user
  showResetPasswordSheet.value = true
}

function roleLabel(role: string) {
  const key = `roles.${role}`
  const translated = t(key)
  return translated === key ? role : translated
}

watch(search, handleSearch)
watch(operatorFilter, handleFilterChange)

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <AppLayout :title="t('nav.userManagement')">
    <div class="flex flex-wrap items-center gap-2 mb-6">
      <SearchInput
        v-model="search"
        :placeholder="t('userManagement.searchPlaceholder')"
        class="w-full sm:flex-1 sm:max-w-xs"
      />
      <Select v-model="operatorFilter">
        <SelectTrigger class="flex-1 sm:flex-none sm:w-[180px]">
          <SelectValue :placeholder="t('userManagement.operatorFilter')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('userManagement.operatorAll') }}</SelectItem>
          <SelectItem value="with">{{ t('userManagement.operatorWith') }}</SelectItem>
          <SelectItem value="without">{{ t('userManagement.operatorWithout') }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 6" :key="i" class="h-24 rounded-lg border border-border bg-muted/30 animate-pulse" />
    </div>

    <div v-else-if="users.length === 0" class="py-8 text-center text-muted-foreground">
      {{ t('userManagement.empty') }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      <div
        v-for="user in users"
        :key="user.id"
        class="rounded-lg border border-border p-4 space-y-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1 space-y-1">
            <p class="font-medium truncate">{{ user.fullName || user.email }}</p>
            <p class="text-sm text-muted-foreground truncate">{{ user.email }}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="shrink-0"
            :title="t('admin.resetPassword')"
            :aria-label="t('admin.resetPassword')"
            @click="openResetPassword(user)"
          >
            <Key class="h-4 w-4" />
          </Button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="getRoleBadgeClass(user.role)"
          >
            {{ roleLabel(user.role) }}
          </span>
          <span
            v-if="user.globalRole && user.globalRole !== user.role"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="getRoleBadgeClass(user.globalRole)"
          >
            {{ roleLabel(user.globalRole) }}
          </span>
          <span
            v-if="user.operator?.callSign"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary font-mono"
          >
            {{ user.operator.callSign }}
          </span>
          <span
            v-else
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
          >
            {{ t('userManagement.noOperator') }}
          </span>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ t('userManagement.registeredAt') }}: {{ formatDateTime(user.createdAt, locale) }}
        </p>
      </div>
    </div>

    <div v-if="hasMore && !isLoading" class="pt-4 pb-16 lg:pb-0">
      <Button
        variant="outline"
        class="w-full lg:w-auto lg:px-8"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
      </Button>
    </div>

    <ResetPasswordSheet
      v-if="resetPasswordUser"
      v-model:open="showResetPasswordSheet"
      :user-id="resetPasswordUser.id"
      :call-sign="resetPasswordLabel"
    />
  </AppLayout>
</template>
