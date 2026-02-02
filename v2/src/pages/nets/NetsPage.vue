<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Plus } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
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
import { NetCard, NetCardSkeleton } from '@/components/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

interface Net {
  id: string
  name: string
  frequency: string
  mode: string
  type: string
  startedAt: string | null
  endedAt: string | null
  attendeeCount: number
  operator: {
    id: string
    callSign: string
  }
}

type NetStatus = 'all' | 'active' | 'pending' | 'completed'
type DateFilter = 'all' | 'week' | 'month' | '3months'

const { t } = useI18n()
const authStore = useAuthStore()

const nets = ref<Net[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const statusFilter = ref<NetStatus>('all')
const dateFilter = ref<DateFilter>('all')
const pageSize = 12
const hasMore = ref(true)
const showCreateSheet = ref(false)

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

const getNetStatus = (net: Net): 'active' | 'pending' | 'completed' => {
  if (net.endedAt) return 'completed'
  if (net.startedAt) return 'active'
  return 'pending'
}

const handleNetCreated = () => {
  showCreateSheet.value = false
  fetchNets()
}

watch(search, handleSearch)
watch([statusFilter, dateFilter], handleFilterChange)

onMounted(() => {
  fetchNets()
})
</script>

<template>
  <AppLayout :title="t('nav.nets')">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative w-full sm:flex-1 sm:max-w-xs">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="search"
            :placeholder="t('nets.searchPlaceholder')"
            class="pl-9"
          />
        </div>

        <Select v-model="statusFilter">
          <SelectTrigger class="flex-1 sm:flex-none sm:w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{{ t('nets.filterAll') }}</SelectItem>
            <SelectItem value="active">{{ t('nets.filterActive') }}</SelectItem>
            <SelectItem value="pending">{{ t('nets.filterPending') }}</SelectItem>
            <SelectItem value="completed">{{ t('nets.filterCompleted') }}</SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="dateFilter">
          <SelectTrigger class="flex-1 sm:flex-none sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{{ t('nets.dateAll') }}</SelectItem>
            <SelectItem value="week">{{ t('nets.dateWeek') }}</SelectItem>
            <SelectItem value="month">{{ t('nets.dateMonth') }}</SelectItem>
            <SelectItem value="3months">{{ t('nets.date3Months') }}</SelectItem>
          </SelectContent>
        </Select>

        <Button v-if="canCreate" variant="outline" @click="showCreateSheet = true" class="hidden lg:flex ml-auto gap-2">
          <Plus class="h-4 w-4" />
          {{ t('nets.createNet') }}
        </Button>
      </div>

      <p v-if="!isLoading" class="text-sm text-muted-foreground">
        {{ t('nets.totalCount', { count: total }) }}
      </p>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <NetCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="nets.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('nets.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <NetCard
          v-for="net in nets"
          :key="net.id"
          :id="net.id"
          :name="net.name"
          :operator-call-sign="net.operator.callSign"
          :frequency="net.frequency"
          :mode="net.mode"
          :status="getNetStatus(net)"
          :attendee-count="net.attendeeCount"
          :started-at="net.startedAt"
          :ended-at="net.endedAt"
        />
      </div>

      <div v-if="hasMore && !isLoading" class="pt-4 pb-16 lg:pb-0">
        <Button
          variant="outline"
          class="w-full lg:w-auto lg:px-8"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          {{ isLoadingMore ? t('common.loading') : t('nets.loadMore') }}
        </Button>
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

    <CreateNetSheet 
      v-model:open="showCreateSheet"
      @created="handleNetCreated"
    />
  </AppLayout>
</template>
