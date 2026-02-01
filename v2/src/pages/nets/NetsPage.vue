<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Search, ChevronRight, Users, Plus, CheckCircle2 } from 'lucide-vue-next'
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
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { getFrequencyShort } from '@/constants/net'

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
const router = useRouter()
const authStore = useAuthStore()

const nets = ref<Net[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const statusFilter = ref<NetStatus>('all')
const dateFilter = ref<DateFilter>('all')
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)
const showCreateSheet = ref(false)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const canCreate = computed(() => {
  return authStore.hasRole('member')
})

const fetchNets = async (append = false) => {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const response = await api.get<Net[]>('/net')
    let filtered = response

    if (search.value) {
      const searchLower = search.value.toLowerCase()
      filtered = filtered.filter(n => 
        n.name.toLowerCase().includes(searchLower) ||
        n.operator.callSign.toLowerCase().includes(searchLower)
      )
    }

    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(n => {
        if (statusFilter.value === 'active') return n.startedAt && !n.endedAt
        if (statusFilter.value === 'pending') return !n.startedAt
        if (statusFilter.value === 'completed') return n.endedAt
        return true
      })
    }

    if (dateFilter.value !== 'all') {
      const now = new Date()
      let cutoff: Date
      if (dateFilter.value === 'week') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (dateFilter.value === 'month') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      }
      filtered = filtered.filter(n => {
        const netDate = n.startedAt ? new Date(n.startedAt) : new Date(n.endedAt || 0)
        return netDate >= cutoff
      })
    }

    total.value = filtered.length

    const startIndex = append ? (page.value - 1) * pageSize : 0
    const endIndex = page.value * pageSize
    const paginatedData = filtered.slice(startIndex, endIndex)

    if (append) {
      nets.value = [...nets.value, ...paginatedData]
    } else {
      nets.value = paginatedData
    }

    hasMore.value = nets.value.length < filtered.length
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
    page.value = 1
    fetchNets()
  }, 300)
}

const handleFilterChange = () => {
  page.value = 1
  fetchNets()
}

const loadMore = () => {
  page.value++
  fetchNets(true)
}

const goToNet = (id: string) => {
  router.push(`/nets/${id}`)
}

const getNetStatus = (net: Net): 'active' | 'pending' | 'completed' => {
  if (net.endedAt) return 'completed'
  if (net.startedAt) return 'active'
  return 'pending'
}

const formatDuration = (net: Net) => {
  if (!net.startedAt) return null
  
  const start = new Date(net.startedAt)
  const end = net.endedAt ? new Date(net.endedAt) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const diffMins = Math.round(diffMs / 60000)
  
  if (diffMins < 60) {
    return `${diffMins} ${t('nets.minutes')}`
  }
  
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours} ${t('nets.hours')} ${mins} ${t('nets.minutes')}`
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleNetCreated = () => {
  showCreateSheet.value = false
  page.value = 1
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
        <div v-for="i in 6" :key="i" class="p-4 rounded-lg border border-border/50 space-y-3">
          <div class="h-5 w-48 bg-muted animate-pulse rounded" />
          <div class="h-4 w-32 bg-muted animate-pulse rounded" />
          <div class="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div v-else-if="nets.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('nets.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <button
          v-for="net in nets"
          :key="net.id"
          @click="goToNet(net.id)"
          class="w-full text-left p-4 rounded-lg border transition-all group"
          :class="{
            'border-green-500/30 bg-green-500/5 hover:bg-green-500/10': getNetStatus(net) === 'active',
            'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10': getNetStatus(net) === 'pending',
            'border-border/50 hover:border-border hover:bg-muted/30': getNetStatus(net) === 'completed',
            'opacity-75': getNetStatus(net) === 'completed'
          }"
        >
          <div class="flex items-start gap-3">
            <div class="mt-0.5">
              <span v-if="getNetStatus(net) === 'active'" class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span v-else-if="getNetStatus(net) === 'pending'" class="relative flex h-3 w-3">
                <span class="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <CheckCircle2 
                v-else 
                class="h-3 w-3 text-muted-foreground" 
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold truncate">{{ net.name }}</h3>
              <p class="text-sm text-muted-foreground mt-1">
                {{ net.operator.callSign }} · {{ getFrequencyShort(net.frequency) }} · {{ net.mode.toUpperCase() }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span class="flex items-center gap-1">
                  <Users class="h-3.5 w-3.5" />
                  {{ net.attendeeCount }} {{ t('nets.attendees') }}
                </span>
                <span v-if="getNetStatus(net) === 'active' && formatDuration(net)">
                  · {{ formatDuration(net) }}
                </span>
                <span v-else-if="getNetStatus(net) === 'completed' && net.endedAt">
                  · {{ formatDate(net.endedAt) }}
                </span>
                <span v-else-if="getNetStatus(net) === 'pending'">
                  · {{ t('nets.notStarted') }}
                </span>
              </div>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          </div>
        </button>
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
