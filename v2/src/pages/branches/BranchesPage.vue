<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Plus } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import AppLayout from '@/components/layout/AppLayout.vue'
import CreateBranchSheet from '@/components/branches/CreateBranchSheet.vue'
import { BranchCard, BranchCardSkeleton } from '@/components/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

interface Branch {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  address?: string
  phone?: string
  email?: string
  callSigns: BranchCallSign[]
  createdAt: string
}

const { t } = useI18n()
const authStore = useAuthStore()

const branches = ref<Branch[]>([])
const isLoading = ref(true)
const search = ref('')
const includeInactive = ref(false)
const showCreateSheet = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const canCreate = computed(() => {
  return authStore.isSuperAdmin
})

const fetchBranches = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (includeInactive.value) params.set('includeInactive', 'true')

    const response = await api.get<Branch[]>(`/branches?${params.toString()}`)
    branches.value = response
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    branches.value = []
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    fetchBranches()
  }, 300)
}

const handleBranchCreated = () => {
  showCreateSheet.value = false
  fetchBranches()
}

const toggleShowDeleted = () => {
  includeInactive.value = !includeInactive.value
}

watch(search, handleSearch)
watch(includeInactive, () => {
  fetchBranches()
})

onMounted(() => {
  fetchBranches()
})
</script>

<template>
  <AppLayout :title="t('branches.title')">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative w-full sm:flex-1 sm:max-w-xs">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="search"
            :placeholder="t('branches.searchPlaceholder')"
            class="pl-9"
          />
        </div>

        <div 
          v-if="canCreate" 
          class="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer select-none"
          @click="toggleShowDeleted"
        >
          <Checkbox
            :checked="includeInactive"
            class="pointer-events-none"
          />
          <span class="text-sm font-medium leading-none">
            {{ t('branches.showDeleted') }}
          </span>
        </div>

        <Button v-if="canCreate" variant="outline" @click="showCreateSheet = true" class="hidden lg:flex ml-auto gap-2">
          <Plus class="h-4 w-4" />
          {{ t('branches.create') }}
        </Button>
      </div>

      <p v-if="!isLoading" class="text-sm text-muted-foreground">
        {{ t('branches.totalCount', { count: branches.length }) }}
      </p>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <BranchCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="branches.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('branches.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <BranchCard
          v-for="branch in branches"
          :key="branch.id"
          :id="branch.id"
          :name="branch.name"
          :type="branch.type"
          :is-headquarters="branch.isHeadquarters"
          :is-active="branch.isActive"
          :call-signs="branch.callSigns"
        />
      </div>
    </div>

    <Button
      v-if="canCreate"
      variant="outline"
      @click="showCreateSheet = true"
      size="icon"
      class="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-background"
    >
      <Plus class="h-6 w-6" />
    </Button>

    <CreateBranchSheet 
      v-model:open="showCreateSheet"
      @created="handleBranchCreated"
    />
  </AppLayout>
</template>
