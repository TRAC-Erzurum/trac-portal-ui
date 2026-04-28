<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CalendarRange, ChevronDown, Plus, Radio } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import EditNetSchedulerSheet from '@/components/nets/EditNetSchedulerSheet.vue'
import SchedulerCard from '@/components/nets/SchedulerCard.vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AppLayout from '@/components/layout/AppLayout.vue'
import CreateNetSheet from '@/components/nets/CreateNetSheet.vue'
import { NetCard, NetCardSkeleton, SearchInput } from '@/components/shared'
import { useAsyncStaleGuard, usePersistedFilters } from '@/composables'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface Net {
  id: string
  name: string
  startedAt: string | null
  endedAt: string | null
  attendeeCount: number
  totalDurationMinutes?: number
  certificateTemplateId?: string | null
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
  scheduledAt?: string | null
  estimatedDurationMinutes?: number | null
}

interface Branch {
  id: string
  name: string
}

type NetStatus = 'all' | 'active' | 'pending' | 'completed' | 'cancelled'
type DateFilter = 'all' | 'week' | 'month' | '3months'
type BranchFilterValue = 'my-branches' | 'all' | `branch:${string}`

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const nets = ref<Net[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const statusFilter = ref<NetStatus>('all')
const dateFilter = ref<DateFilter>('all')
const branchFilter = ref<BranchFilterValue>('my-branches')
const availableBranches = ref<Branch[]>([])
const isLoadingBranches = ref(false)
const pageSize = 48
const hasMore = ref(true)
const showCreateSheet = ref(false)

const schedulers = ref<{ id: string; name: string; startDate: string; recurrence: string; branch?: { name?: string }; operator?: { callSign?: string } }[]>([])
const schedulersTotal = ref(0)
const isLoadingSchedulers = ref(false)
const isLoadingMoreSchedulers = ref(false)
const hasMoreSchedulers = ref(false)
const schedulerPageSize = 6
const selectedSchedulerId = ref<string | null>(null)
const isEditSchedulerSheetOpen = ref(false)

const netsListGuard = useAsyncStaleGuard()
const schedulersListGuard = useAsyncStaleGuard()

interface SchedulerResponse {
  data: typeof schedulers.value
  total: number
  limit: number
  offset: number
}

const fetchSchedulers = async (append = false) => {
  if (!canCreate.value) return
  const token = append ? schedulersListGuard.beginAppend() : schedulersListGuard.beginReplace()
  if (append) {
    isLoadingMoreSchedulers.value = true
  } else {
    isLoadingSchedulers.value = true
  }
  try {
    const offset = append ? schedulers.value.length : 0
    const params = new URLSearchParams()
    if (branchFilter.value === 'all') {
      params.set('branchFilter', 'all')
    } else if (branchFilter.value === 'my-branches') {
      params.set('branchFilter', 'my-branches')
    } else {
      const branchId = selectedBranchId.value
      if (branchId) {
        params.set('branchFilter', 'branch')
        params.set('branchId', branchId)
      }
    }
    if (search.value?.trim()) params.set('search', search.value.trim())
    params.set('limit', String(schedulerPageSize))
    params.set('offset', String(offset))
    const response = await api.get<SchedulerResponse | typeof schedulers.value>(
      `/net-schedulers?${params.toString()}`
    )
    if (!schedulersListGuard.isCurrent(token)) {
      return
    }
    const isPaginated = typeof response === 'object' && response !== null && 'data' in response
    if (isPaginated) {
      const res = response as SchedulerResponse
      schedulers.value = append ? [...schedulers.value, ...res.data] : res.data
      schedulersTotal.value = res.total
      hasMoreSchedulers.value = schedulers.value.length < res.total
    } else {
      const list = response as typeof schedulers.value
      schedulers.value = append ? [...schedulers.value, ...list] : list
      schedulersTotal.value = list.length
      hasMoreSchedulers.value = false
    }
  } catch {
    if (!schedulersListGuard.isCurrent(token)) {
      return
    }
    if (!append) schedulers.value = []
    schedulersTotal.value = 0
    hasMoreSchedulers.value = false
  } finally {
    if (schedulersListGuard.isCurrent(token)) {
      isLoadingSchedulers.value = false
      isLoadingMoreSchedulers.value = false
    }
  }
}

const loadMoreSchedulers = () => fetchSchedulers(true)

const openEditScheduler = (id: string) => {
  selectedSchedulerId.value = id
  isEditSchedulerSheetOpen.value = true
}

const handleSchedulerUpdated = () => {
  fetchSchedulers()
}

const selectedBranchId = computed(() =>
  branchFilter.value.startsWith('branch:') ? branchFilter.value.slice('branch:'.length) : null,
)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const canCreate = computed(() => {
  return authStore.hasRole('member')
})

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
  const token = append ? netsListGuard.beginAppend() : netsListGuard.beginReplace()
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
      const branchId = selectedBranchId.value
      if (branchId) {
        params.set('branchFilter', 'selected')
        params.set('branchId', branchId)
      }
    }
    params.set('limit', String(pageSize))
    params.set('offset', String(offset))

    const response = await api.get<NetResponse>(`/net?${params.toString()}`)

    if (!netsListGuard.isCurrent(token)) {
      return
    }

    total.value = response.total

    if (append) {
      nets.value = [...nets.value, ...response.data]
    } else {
      nets.value = response.data
    }

    hasMore.value = nets.value.length < response.total
  } catch (error) {
    if (!netsListGuard.isCurrent(token)) {
      return
    }
    console.error('Failed to fetch nets:', error)
  } finally {
    if (netsListGuard.isCurrent(token)) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    fetchNets()
    fetchSchedulers()
  }, 300)
}

const handleFilterChange = () => {
  fetchNets()
  fetchSchedulers()
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
  fetchNets()
  fetchSchedulers()
}

usePersistedFilters('nets', { search, statusFilter, dateFilter, branchFilter })

let syncingToUrl = false
function syncFiltersToUrl() {
  syncingToUrl = true
  const q: Record<string, string> = {}
  if (search.value) q.search = search.value
  if (statusFilter.value !== 'all') q.status = statusFilter.value
  if (dateFilter.value !== 'all') q.dateFilter = dateFilter.value
  if (branchFilter.value === 'my-branches' || branchFilter.value === 'all') {
    q.branchFilter = branchFilter.value
  } else {
    const branchId = selectedBranchId.value
    if (branchId) {
      q.branchFilter = 'selected'
      q.branchId = branchId
    }
  }
  router.replace({ path: route.path, query: q })
}

function applyFiltersFromUrl() {
  const q = route.query
  if (typeof q.search === 'string') search.value = q.search
  if (q.status === 'active' || q.status === 'pending' || q.status === 'completed' || q.status === 'cancelled') statusFilter.value = q.status
  if (q.dateFilter === 'week' || q.dateFilter === 'month' || q.dateFilter === '3months') dateFilter.value = q.dateFilter
  if (q.branchFilter === 'my-branches' || q.branchFilter === 'all') {
    branchFilter.value = q.branchFilter
  } else if (q.branchFilter === 'selected' && typeof q.branchId === 'string') {
    branchFilter.value = `branch:${q.branchId}`
  }
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
    fetchSchedulers()
  },
  { deep: true }
)

watch([branchFilter, selectedBranchId], () => {
  fetchSchedulers()
})

onMounted(async () => {
  await loadBranches()
  applyFiltersFromUrl()
  fetchNets()
  fetchSchedulers()
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
                <SelectItem value="my-branches">{{ t('nets.branchFilterMyBranches') }}</SelectItem>
                <SelectItem value="all">{{ t('nets.branchFilterAll') }}</SelectItem>
                <SelectItem
                  v-for="branch in availableBranches"
                  :key="branch.id"
                  :value="`branch:${branch.id}`"
                >
                  {{ branch.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="trac-top-actions">
          <Button v-if="canCreate" variant="outline" @click="showCreateSheet = true" class="trac-page-action-btn">
            <Plus class="h-4 w-4" />
            {{ t('nets.createNet') }}
          </Button>
        </div>
      </div>

      <template v-if="canCreate">
        <Separator class="my-8" />

        <!-- Schedulers first (same order as Branch detail: schedules then nets) -->
        <section aria-labelledby="nets-schedulers-heading">
          <div class="mb-4">
            <h3 id="nets-schedulers-heading" class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarRange class="h-4 w-4" aria-hidden="true" />
              {{ t('scheduler.title') }}
            </h3>
            <p class="text-xs text-muted-foreground mt-1">{{ t('scheduler.sectionSubtitle') }}</p>
          </div>
          <div v-if="isLoadingSchedulers" class="py-4 text-sm text-muted-foreground">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="schedulers.length === 0" class="py-4 text-sm text-muted-foreground">
            {{ t('common.noResults') }}
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <SchedulerCard
              v-for="s in schedulers"
              :key="s.id"
              :scheduler="s"
              :show-edit-button="canCreate"
              @edit="openEditScheduler"
            />
          </div>
          <div v-if="!isLoadingSchedulers" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-4">
            <p v-if="schedulersTotal > 0 || schedulers.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
              {{ schedulers.length }}/{{ schedulersTotal }} {{ t('scheduler.name') }}
            </p>
            <div v-if="hasMoreSchedulers && !isLoadingSchedulers" class="order-1 lg:order-2 w-full lg:w-auto">
              <Button
                variant="outline"
                class="trac-load-more-btn"
                :disabled="isLoadingMoreSchedulers"
                @click="loadMoreSchedulers"
              >
                <ChevronDown v-if="!isLoadingMoreSchedulers" class="h-4 w-4 mr-2" />
                {{ isLoadingMoreSchedulers ? t('common.loading') : t('common.loadMore') }}
              </Button>
            </div>
          </div>
        </section>

        <Separator class="my-8" />
      </template>

      <!-- Nets (sessions) second -->
      <section aria-labelledby="nets-sessions-heading">
        <div class="mb-4">
          <h3 id="nets-sessions-heading" class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Radio class="h-4 w-4" aria-hidden="true" />
            {{ t('nets.nets') }}
          </h3>
          <p class="text-xs text-muted-foreground mt-1">{{ t('nets.sessionsSectionSubtitle') }}</p>
        </div>
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
            :duration-minutes="net.totalDurationMinutes"
            :started-at="net.startedAt"
            :ended-at="net.endedAt"
            :scheduled-at="net.scheduledAt"
            :estimated-duration-minutes="net.estimatedDurationMinutes"
            :branch-name="net.branch?.name"
            :branch-call-sign="net.branchCallSign?.callSign"
            :branch-is-headquarters="net.branch?.isHeadquarters"
            :show-branch="true"
            :has-certificate="!!net.certificateTemplateId"
          />
        </div>
        <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-4">
          <p v-if="total > 0 || nets.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ nets.length }}/{{ total }} {{ t('nets.name') }}
          </p>
          <div v-if="hasMore && !isLoading" class="order-1 lg:order-2 w-full lg:w-auto">
            <Button
              variant="outline"
              class="trac-load-more-btn"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <ChevronDown v-if="!isLoadingMore" class="h-4 w-4 mr-2" />
              {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
            </Button>
          </div>
        </div>
      </section>

      <div class="pb-16 lg:pb-0" aria-hidden="true" />
    </div>

    <CreateNetSheet
      :open="showCreateSheet"
      :default-branch-id="selectedBranchId ?? undefined"
      @update:open="(v) => { showCreateSheet = v; if (!v) handleNetCreated() }"
      @created="handleNetCreated"
    />

    <EditNetSchedulerSheet
      :open="isEditSchedulerSheetOpen"
      :scheduler-id="selectedSchedulerId"
      @update:open="(v) => { isEditSchedulerSheetOpen = v; if (!v) handleSchedulerUpdated() }"
      @updated="handleSchedulerUpdated"
    />
  </AppLayout>
</template>
