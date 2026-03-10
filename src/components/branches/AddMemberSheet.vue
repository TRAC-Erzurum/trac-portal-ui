<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { UserPlus, X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchInput } from '@/components/shared'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserAvatar } from '@/components/ui/user-avatar'
import { api, type ApiError } from '@/lib/api'
import { translateError } from '@/i18n'
import { formatCallSign } from '@/lib/formatters'

interface Props {
  open: boolean
  branchId: string
}

interface Operator {
  id: string
  callSign?: string
  prefix?: string
  suffix?: string
  fullName?: string
  user?: {
    id: string
    email: string
    fullName?: string
    picture?: string
  }
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
}

interface SearchResult {
  userId: string
  operatorId: string
  callSign?: string
  prefix?: string
  suffix?: string
  email: string
  fullName?: string
  picture?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'added': []
}>()

const { t } = useI18n()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearching = ref(false)
const selectedUser = ref<SearchResult | null>(null)
const selectedRole = ref('volunteer')
const isAdding = ref(false)

const displayName = computed(() => {
  if (!selectedUser.value) return ''
  if (selectedUser.value.callSign) {
    return formatCallSign({
      callSign: selectedUser.value.callSign,
      prefix: selectedUser.value.prefix,
      suffix: selectedUser.value.suffix
    })
  }
  return selectedUser.value.fullName || selectedUser.value.email
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const searchUsers = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }

  isSearching.value = true
  try {
    const response = await api.get<PaginatedResponse<Operator>>(`/operator?search=${encodeURIComponent(searchQuery.value)}`)
    searchResults.value = (response.data || [])
      .filter(op => op.user?.id)
      .map(op => ({
        userId: op.user!.id,
        operatorId: op.id,
        callSign: op.callSign,
        prefix: op.prefix,
        suffix: op.suffix,
        email: op.user!.email,
        fullName: op.user!.fullName || op.fullName || '',
        picture: op.user!.picture
      }))
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

watch(searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    searchUsers()
  }, 300)
})

const selectUser = (result: SearchResult) => {
  selectedUser.value = result
  searchQuery.value = ''
  searchResults.value = []
}

const handleAdd = async () => {
  if (!selectedUser.value || isAdding.value) return

  isAdding.value = true
  try {
    await api.post(`/branches/${props.branchId}/members/add`, {
      userId: selectedUser.value.userId,
      role: selectedRole.value
    })
    toast.success(t('branches.memberAdded'))
    emit('added')
    emit('update:open', false)
    resetForm()
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isAdding.value = false
  }
}

const resetForm = () => {
  searchQuery.value = ''
  searchResults.value = []
  selectedUser.value = null
  selectedRole.value = 'volunteer'
}

const handleOpenChange = (open: boolean) => {
  emit('update:open', open)
  if (!open) {
    resetForm()
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="handleOpenChange">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('branches.addMember') }}</SheetTitle>
        <SheetDescription>{{ t('branches.addMemberDescription') }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-6 py-6">
        <div v-if="!selectedUser" class="space-y-4">
          <div class="space-y-2">
            <Label>{{ t('branches.searchUser') }}</Label>
            <SearchInput v-model="searchQuery" :placeholder="t('branches.searchUserPlaceholder')" />
          </div>

          <div v-if="isSearching" class="space-y-2">
            <div v-for="i in 3" :key="i" class="p-3 rounded-lg border animate-pulse">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-muted" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-32 bg-muted rounded" />
                  <div class="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="searchResults.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
            <button v-for="result in searchResults" :key="result.userId" @click="selectUser(result)"
              class="w-full p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all text-left">
              <div class="flex items-center gap-3">
                <UserAvatar :picture="result.picture" class="h-10 w-10" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate">
                    {{ result.callSign ? formatCallSign({
                      callSign: result.callSign, prefix: result.prefix, suffix:
                        result.suffix
                    }) : result.fullName || result.email }}
                  </p>
                  <p class="text-sm text-muted-foreground truncate">{{ result.email }}</p>
                </div>
              </div>
            </button>
          </div>

          <p v-else-if="searchQuery && !isSearching" class="text-sm text-muted-foreground text-center py-4">
            {{ t('operators.noResults') }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <div class="p-4 rounded-lg border bg-muted/20">
            <div class="flex items-center gap-3 mb-4">
              <UserAvatar :picture="selectedUser.picture" class="h-12 w-12" />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ displayName }}</p>
                <p class="text-sm text-muted-foreground truncate">{{ selectedUser.email }}</p>
              </div>
            </div>

            <Button variant="outline" size="sm" @click="selectedUser = null" class="w-full">
              {{ t('common.change') }}
            </Button>
          </div>

          <div class="space-y-2">
            <Label>{{ t('branches.role') }}</Label>
            <Select v-model="selectedRole">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="volunteer">{{ t('roles.volunteer') }}</SelectItem>
                <SelectItem value="member">{{ t('roles.member') }}</SelectItem>
                <SelectItem value="admin">{{ t('roles.admin') }}</SelectItem>
                <SelectItem value="president">{{ t('roles.president') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div class="trac-sheet-actions">
        <Button variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button class="trac-sheet-btn" @click="handleAdd" :disabled="!selectedUser || isAdding">
          <UserPlus class="h-4 w-4 mr-2" />
          {{ t('common.add') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>