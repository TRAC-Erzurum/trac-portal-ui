<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronRight, MapPin, ExternalLink, Radio, Users, TrendingUp, Signal, Ear, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import EditOperatorAdminSheet from '@/components/operators/EditOperatorAdminSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  country?: string
  city?: string
  district?: string
  gridSquare?: string
  user?: {
    id: string
    fullName?: string
    email?: string
  }
}

interface OperatorStats {
  attendedNets: number
  managedNets: number
  streak: number
  averageReadability: number
  averageSignal: number
}

interface OperatorNetItem {
  id: string
  name: string
  date: string
  role: 'attended' | 'managed'
  attendeeCount?: number
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const operator = ref<Operator | null>(null)
const stats = ref<OperatorStats | null>(null)
const recentNets = ref<OperatorNetItem[]>([])
const isLoading = ref(true)
const isLoadingStats = ref(true)
const isLoadingNets = ref(true)
const isLoadingMoreNets = ref(false)
const showEditSheet = ref(false)
const netsPage = ref(1)
const netsPageSize = 12
const hasMoreNets = ref(true)

const operatorId = computed(() => route.params.id as string)

const canEdit = computed(() => authStore.isAdmin || authStore.isSuperAdmin)

const formattedCallSign = computed(() => {
  if (!operator.value) return ''
  const { prefix, callSign, suffix } = operator.value
  if (prefix && suffix) return `${prefix}/${callSign}/${suffix}`
  if (prefix) return `${prefix}/${callSign}`
  if (suffix) return `${callSign}/${suffix}`
  return callSign
})

const displayName = computed(() => {
  if (!operator.value) return ''
  return operator.value.user?.fullName || operator.value.fullName || ''
})

const qthParts = computed(() => {
  if (!operator.value) return []
  return [operator.value.district, operator.value.city, operator.value.country].filter(Boolean)
})

const locatorLink = computed(() => {
  if (!operator.value?.gridSquare) return null
  return `https://www.k7fry.com/grid/?qth=${operator.value.gridSquare}`
})

const fetchOperator = async () => {
  try {
    operator.value = await api.get<Operator>(`/operator/${operatorId.value}`)
  } catch (error) {
    console.error('Failed to fetch operator:', error)
    toast.error(t('error.serverError'))
    router.push('/operators')
  } finally {
    isLoading.value = false
  }
}

const fetchStats = async () => {
  try {
    stats.value = await api.get<OperatorStats>(`/operator/${operatorId.value}/stats`)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    isLoadingStats.value = false
  }
}

const fetchRecentNets = async (append = false) => {
  if (append) {
    isLoadingMoreNets.value = true
  } else {
    isLoadingNets.value = true
  }
  
  try {
    const offset = (netsPage.value - 1) * netsPageSize
    const newNets = await api.get<OperatorNetItem[]>(
      `/operator/${operatorId.value}/recent-nets?limit=${netsPageSize}&offset=${offset}`
    )
    
    if (append) {
      recentNets.value = [...recentNets.value, ...newNets]
    } else {
      recentNets.value = newNets
    }
    
    hasMoreNets.value = newNets.length === netsPageSize
  } catch (error) {
    console.error('Failed to fetch recent nets:', error)
  } finally {
    isLoadingNets.value = false
    isLoadingMoreNets.value = false
  }
}

const loadMoreNets = () => {
  netsPage.value++
  fetchRecentNets(true)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const goToNet = (netId: string) => {
  router.push(`/nets/${netId}`)
}

const handleEditClick = () => {
  showEditSheet.value = true
}

const handleOperatorUpdated = () => {
  fetchOperator()
}

onMounted(() => {
  fetchOperator()
  fetchStats()
  fetchRecentNets()
})
</script>

<template>
  <AppLayout :title="t('operators.profile')" :breadcrumb-label="formattedCallSign || '...'">
    <div class="space-y-6">
      <template v-if="isLoading">
        <div class="space-y-4">
          <div class="h-20 w-20 mx-auto bg-muted animate-pulse rounded-full" />
          <div class="h-8 w-32 mx-auto bg-muted animate-pulse rounded" />
          <div class="h-6 w-48 mx-auto bg-muted animate-pulse rounded" />
        </div>
      </template>

      <template v-else-if="operator">
        <div class="text-center space-y-3">
          <div class="relative inline-block">
            <div class="h-20 w-20 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center">
              {{ operator.callSign.slice(0, 2) }}
            </div>
            <Button 
              v-if="canEdit" 
              variant="outline" 
              size="icon" 
              @click="handleEditClick"
              class="absolute -right-2 -bottom-1 h-8 w-8 rounded-full shadow-md"
            >
              <Pencil class="h-3.5 w-3.5" />
            </Button>
          </div>
          <div>
            <h1 class="text-2xl font-bold">{{ formattedCallSign }}</h1>
            <p v-if="displayName" class="text-lg text-muted-foreground">{{ displayName }}</p>
          </div>
          
          <div class="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
            <template v-if="qthParts.length > 0">
              <MapPin class="h-4 w-4" />
              <span>{{ qthParts.join(' • ') }}</span>
            </template>
            <a
              v-if="locatorLink"
              :href="locatorLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {{ operator.gridSquare }}
              <ExternalLink class="h-3 w-3" />
            </a>
          </div>
        </div>

        <Separator />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground mb-4">
            {{ t('operators.statistics') }}
          </h3>
          
          <div v-if="isLoadingStats" class="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <div v-for="i in 5" :key="i" class="text-center">
              <div class="h-8 w-12 mx-auto bg-muted animate-pulse rounded" />
              <div class="h-4 w-16 mx-auto mt-1 bg-muted animate-pulse rounded" />
            </div>
          </div>

          <div v-else-if="stats" class="grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users class="h-5 w-5 text-muted-foreground" />
                {{ stats.attendedNets }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.attended') }}</p>
            </div>
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Radio class="h-5 w-5 text-muted-foreground" />
                {{ stats.managedNets }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.managed') }}</p>
            </div>
            <div>
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp class="h-5 w-5 text-muted-foreground" />
                {{ stats.streak }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.streak') }}</p>
            </div>
            <div class="hidden sm:block">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Ear class="h-5 w-5 text-muted-foreground" />
                {{ stats.averageReadability || '—' }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.readability') }}</p>
            </div>
            <div class="hidden sm:block">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Signal class="h-5 w-5 text-muted-foreground" />
                {{ stats.averageSignal || '—' }}
              </div>
              <p class="text-xs text-muted-foreground">{{ t('operators.signal') }}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Radio class="h-4 w-4" />
            {{ t('operators.recentNets') }}
          </h3>

          <div v-if="isLoadingNets" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
              <div class="h-5 w-48 bg-muted animate-pulse rounded" />
              <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          <div v-else-if="recentNets.length === 0" class="py-8 text-center">
            <p class="text-muted-foreground">{{ t('operators.noNets') }}</p>
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <button
              v-for="net in recentNets"
              :key="net.id"
              @click="goToNet(net.id)"
              class="w-full text-left p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group flex items-center gap-3"
            >
              <Radio 
                v-if="net.role === 'managed'" 
                class="h-4 w-4 text-primary flex-shrink-0" 
                :title="t('operators.managed')"
              />
              <Users 
                v-else 
                class="h-4 w-4 text-muted-foreground flex-shrink-0" 
                :title="t('operators.attended')"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ net.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDate(net.date) }}</p>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          </div>

          <div v-if="hasMoreNets && recentNets.length > 0" class="pt-4">
            <Button
              variant="outline"
              class="w-full lg:w-auto lg:px-8"
              :disabled="isLoadingMoreNets"
              @click="loadMoreNets"
            >
              {{ isLoadingMoreNets ? t('common.loading') : t('operators.loadMore') }}
            </Button>
          </div>
        </section>
      </template>

      <EditOperatorAdminSheet
        v-if="operator"
        v-model:open="showEditSheet"
        :operator="operator"
        @updated="handleOperatorUpdated"
      />
    </div>
  </AppLayout>
</template>
