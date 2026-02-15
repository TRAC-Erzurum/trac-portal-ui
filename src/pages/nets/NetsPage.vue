<script setup lang="ts">
import { ref, computed, onMounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AppLayout from '@/components/layout/AppLayout.vue'
import CreateNetSheet from '@/components/nets/CreateNetSheet.vue'
import { MobileFab, NetCard, NetCardSkeleton, SearchInput } from '@/components/shared'
import type { MobileFabAction } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'

interface Net {
  id: string
  name: string
  startedAt: string | null
  endedAt: string | null
  attendeeCount: number
  operator: {
    id: string
    callSign: string
  }
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
    isDefault: boolean
  }
}

interface Branch {
  id: string
  name: string
}

type NetStatus = 'all' | 'active' | 'pending' | 'completed' | 'cancelled'
type DateFilter = 'all' | 'week' | 'month' | '3months'
type BranchFilterValue = 'selected' | 'my-branches' | 'all'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const branchStore = useBranchStore()

const nets = ref<Net[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const statusFilter = ref<NetStatus>('all')
const dateFilter = ref<DateFilter>('all')
const branchFilter = ref<BranchFilterValue>('selected')
const availableBranches = ref<Branch[]>([])
const isLoadingBranches = ref(false)
const pageSize = 12
const hasMore = ref(true)
const showCreateSheet = ref(false)

const currentBranchId = computed(() => branchStore.currentBranch?.id ?? authStore.user?.currentBranchId ?? availableBranches.value[0]?.id ?? null)

const currentBranchName = computed(() => {
  const name = branchStore.currentBranch?.name ?? availableBranches.value.find(b => b.id === currentBranchId.value)?.name
  return name ?? t('nets.branchFilterSelected')
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const canCreate = computed(() => {
  return authStore.hasRole('member')
})

const mobileFabActions = computed<MobileFabAction[]>(() => {
  if (!canCreate.value) return []
  return [{ key: 'create', label: t('nets.createNet'), icon: Plus as Component }]
})

const handleFabAction = (key: string) => {
  if (key === 'create') showCreateSheet.value = true
}

interface NetResponse {
  data: Net[]
  total: number
  limit: number
  offset: number
}

const loadBranches = async () => {
  isLoadingBranches.value = true
  try {
    const response = await api.get<Array<{ branch: Branch }>>('/users/me/branches')
    availableBranches.value = response.map(membership => membership.branch)
  } catch (error) {
    console.error('Failed to load branches:', error)
    availableBranches.value = []
  } finally {
    isLoadingBranches.value = false
  }
}

const fetchNets = async (append = false) => {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const offset = append ? nets.value.length : 0
    const params = new URLSearchParams()
    
    if (search.value) params.set('search', search.value)
    if (statusFilter.value !== 'all') params.set('status', statusFilter.value)
    if (dateFilter.value !== 'all') params.set('dateFilter', dateFilter.value)
    if (branchFilter.value === 'all') {
      params.set('branchFilter', 'all')
    } else if (branchFilter.value === 'my-branches') {
      params.set('branchFilter', 'my-branches')
    } else {
      if (currentBranchId.value) params.set('branchId', currentBranchId.value)
    }
    params.set('limit', String(pageSize))
    params.set('offset', String(offset))

    const response = await api.get<NetResponse>(`/net?${params.toString()}`)
    
    total.value = response.total

    if (append) {
      nets.value = [...nets.value, ...response.data]
    } else {
      nets.value = response.data
    }

    hasMore.value = nets.value.length < response.total
  } catch (error) {
    console.error('Failed to fetch nets:', error)
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
    fetchNets()
  }, 300)
}

const handleFilterChange = () => {
  fetchNets()
}

const loadMore = () => {
  fetchNets(true)
}

const getNetStatus = (net: Net): 'active' | 'pending' | 'completed' | 'cancelled' => {
  if (net.endedAt && !net.startedAt) return 'cancelled'
  if (net.endedAt) return 'completed'
  if (net.startedAt) return 'active'
  return 'pending'
}

const handleNetCreated = () => {
  showCreateSheet.value = false
  fetchNets()
}

usePersistedFilters('nets', { search, statusFilter, dateFilter, branchFilter })

let syncingToUrl = false
function syncFiltersToUrl() {
  syncingToUrl = true
  const q: Record<string, string> = {}
  if (search.value) q.search = search.value
  if (statusFilter.value !== 'all') q.status = statusFilter.value
  if (dateFilter.value !== 'all') q.dateFilter = dateFilter.value
  q.branchFilter = branchFilter.value
  if (branchFilter.value === 'selected' && currentBranchId.value) q.branchId = currentBranchId.value
  router.replace({ path: route.path, query: q })
}

function applyFiltersFromUrl() {
  const q = route.query
  if (typeof q.search === 'string') search.value = q.search
  if (q.status === 'active' || q.status === 'pending' || q.status === 'completed' || q.status === 'cancelled') statusFilter.value = q.status
  if (q.dateFilter === 'week' || q.dateFilter === 'month' || q.dateFilter === '3months') dateFilter.value = q.dateFilter
  if (q.branchFilter === 'selected' || q.branchFilter === 'my-branches' || q.branchFilter === 'all') branchFilter.value = q.branchFilter
}

watch(search, handleSearch)
watch([statusFilter, dateFilter, branchFilter], () => {
  handleFilterChange()
  syncFiltersToUrl()
})
watch(
  () => route.query,
  () => {
    if (syncingToUrl) {
      syncingToUrl = false
      return
    }
    applyFiltersFromUrl()
    fetchNets()
  },
  { deep: true }
)

onMounted(async () => {
  await loadBranches()
  applyFiltersFromUrl()
  fetchNets()
})
</script>

<template>
  <AppLayout :title="t('nav.nets').toLocaleUpperCase(locale)">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-col gap-2">
          <SearchInput
            v-model="search"
            :placeholder="t('nets.searchPlaceholder')"
          />
          <div class="flex flex-wrap items-center gap-2">
            <Select v-model="statusFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('nets.filterAll') }}</SelectItem>
                <SelectItem value="active">{{ t('nets.filterActive') }}</SelectItem>
                <SelectItem value="pending">{{ t('nets.filterPending') }}</SelectItem>
                <SelectItem value="completed">{{ t('nets.filterCompleted') }}</SelectItem>
                <SelectItem value="cancelled">{{ t('nets.filterCancelled') }}</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="dateFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('nets.dateAll') }}</SelectItem>
                <SelectItem value="week">{{ t('nets.dateWeek') }}</SelectItem>
                <SelectItem value="month">{{ t('nets.dateMonth') }}</SelectItem>
                <SelectItem value="3months">{{ t('nets.date3Months') }}</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="branchFilter" :disabled="isLoadingBranches">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue :placeholder="t('nets.branchFilter')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="selected">{{ currentBranchName }}</SelectItem>
                <SelectItem value="my-branches">{{ t('nets.branchFilterMyBranches') }}</SelectItem>
                <SelectItem value="all">{{ t('nets.branchFilterAll') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
          <Button v-if="canCreate" variant="outline" @click="showCreateSheet = true" class="hidden lg:inline-flex gap-2">
            <Plus class="h-4 w-4" />
            {{ t('nets.createNet') }}
          </Button>
        </div>
      </div>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NetCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="nets.length === 0" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">{{ t('nets.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NetCard
          v-for="net in nets"
          :key="net.id"
          :id="net.id"
          :name="net.name"
          :operator-call-sign="net.operator.callSign"
          :status="getNetStatus(net)"
          :attendee-count="net.attendeeCount"
          :started-at="net.startedAt"
          :ended-at="net.endedAt"
          :branch-name="net.branch?.name"
          :branch-call-sign="net.branchCallSign?.callSign"
          :branch-is-headquarters="net.branch?.isHeadquarters"
          :show-branch="true"
        />
      </div>

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || nets.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ nets.length }}/{{ total }} {{ t('nets.name') }}
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

    <MobileFab :actions="mobileFabActions" @action="handleFabAction" />

    <CreateNetSheet 
      v-model:open="showCreateSheet"
      :default-branch-id="branchFilter === 'selected' && currentBranchId ? currentBranchId : undefined"
      @created="handleNetCreated"
    />
  </AppLayout>
</template>
