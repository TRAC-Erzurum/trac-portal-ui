<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import AppLayout from '@/components/layout/AppLayout.vue'
import CreateBranchSheet from '@/components/branches/CreateBranchSheet.vue'
import { BranchCard, BranchCardSkeleton, SearchInput } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
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

interface BranchesResponse {
  data: Branch[]
  total: number
}

const { t, locale } = useI18n()
const authStore = useAuthStore()

const branches = ref<Branch[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const includeInactive = ref(false)
const showCreateSheet = ref(false)
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const canCreate = computed(() => {
  return authStore.isSuperAdmin
})

const fetchBranches = async (append = false) => {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(page.value))
    params.set('pageSize', String(pageSize))
    if (search.value) params.set('search', search.value)
    if (includeInactive.value) params.set('includeInactive', 'true')

    const response = await api.get<BranchesResponse>(`/branches?${params.toString()}`)
    
    if (append) {
      branches.value = [...branches.value, ...response.data]
    } else {
      branches.value = response.data
    }
    
    total.value = response.total
    hasMore.value = branches.value.length < response.total
  } catch (error) {
    console.error('Failed to fetch branches:', error)
    branches.value = []
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchBranches()
  }, 300)
}

const loadMore = () => {
  page.value++
  fetchBranches(true)
}

const handleBranchCreated = () => {
  showCreateSheet.value = false
  page.value = 1
  fetchBranches()
}

const toggleShowDeleted = () => {
  includeInactive.value = !includeInactive.value
}

const handleFilterChange = () => {
  page.value = 1
  fetchBranches()
}

usePersistedFilters('branches', { search, includeInactive })

watch(search, handleSearch)
watch(includeInactive, handleFilterChange)

onMounted(() => {
  fetchBranches()
})
</script>

<template>
  <AppLayout :title="t('nav.branches').toLocaleUpperCase(locale)">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2 items-center">
          <SearchInput
            v-model="search"
            :placeholder="t('branches.searchPlaceholder')"
          />
          <div
            v-if="canCreate"
            class="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer select-none w-full lg:w-auto min-w-0"
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
        </div>
        <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
          <Button v-if="canCreate" variant="outline" @click="showCreateSheet = true" class="hidden lg:inline-flex gap-2">
            <Plus class="h-4 w-4" />
            {{ t('branches.create') }}
          </Button>
        </div>
      </div>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <BranchCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="branches.length === 0" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">{{ t('branches.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
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

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || branches.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ branches.length }}/{{ total }} {{ t('branches.nameEntity') }}
        </p>
        <div v-if="hasMore && !isLoading" class="order-1 lg:order-2 w-full lg:w-auto">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
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
