<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { MapPin, ExternalLink, Radio, Users, TrendingUp, Signal, Ear, Pencil, Calendar, Building2, Search, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import BranchMembershipCard from '@/components/shared/BranchMembershipCard.vue'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import EditOperatorAdminSheet from '@/components/operators/EditOperatorAdminSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { UserAvatar } from '@/components/ui/user-avatar'
import { api } from '@/lib/api'
import { formatCallSign, formatDateLong, formatNetDate } from '@/lib/formatters'

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
    role?: string
    createdAt?: string
    picture?: string
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

interface UserBranchMembership {
  id: string
  userId: string
  branchId: string
  role: string
  status: string
  branch: {
    id: string
    name: string
    isHeadquarters: boolean
  }
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const operator = ref<Operator | null>(null)
const stats = ref<OperatorStats | null>(null)
const recentNets = ref<OperatorNetItem[]>([])
const memberships = ref<UserBranchMembership[]>([])
const isLoading = ref(true)
const isLoadingStats = ref(true)
const isLoadingNets = ref(true)
const isLoadingMoreNets = ref(false)
const isLoadingMemberships = ref(true)
const showEditSheet = ref(false)
const membershipSearch = ref('')
const membershipRoleFilter = ref('all')
const netsSearch = ref('')
const netsRoleFilter = ref('all')
const netsPage = ref(1)
const netsPageSize = 12
const hasMoreNets = ref(true)

const operatorId = computed(() => route.params.id as string)

const canEdit = computed(() => authStore.isAdmin || authStore.isSuperAdmin)

const hasUserAccount = computed(() => !!operator.value?.user?.id)

const formatMemberSince = computed(() => {
  return formatDateLong(operator.value?.user?.createdAt)
})

const formattedCallSign = computed(() => {
  if (!operator.value) return ''
  return formatCallSign(operator.value)
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

const fetchMemberships = async () => {
  if (!operator.value?.user?.id) return
  
  isLoadingMemberships.value = true
  try {
    memberships.value = await api.get<UserBranchMembership[]>(`/users/${operator.value.user.id}/memberships`)
  } catch (error) {
    console.error('Failed to fetch memberships:', error)
  } finally {
    isLoadingMemberships.value = false
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


const goToNet = (netId: string) => {
  router.push(`/nets/${netId}`)
}

const handleEditClick = () => {
  showEditSheet.value = true
}

const handleOperatorUpdated = () => {
  fetchOperator()
}

const filteredMemberships = computed(() => {
  let filtered = memberships.value.filter(m => m.status === 'approved')

  if (membershipSearch.value) {
    const search = membershipSearch.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.branch.name.toLowerCase().includes(search)
    )
  }

  if (membershipRoleFilter.value !== 'all') {
    filtered = filtered.filter(m => m.role === membershipRoleFilter.value)
  }

  return filtered
})

const approvedMemberships = computed(() => filteredMemberships.value)

const filteredNets = computed(() => {
  let filtered = recentNets.value

  if (netsSearch.value) {
    const search = netsSearch.value.toLowerCase()
    filtered = filtered.filter(n => 
      n.name.toLowerCase().includes(search)
    )
  }

  if (netsRoleFilter.value !== 'all') {
    filtered = filtered.filter(n => n.role === netsRoleFilter.value)
  }

  return filtered
})

onMounted(async () => {
  await fetchOperator()
  fetchStats()
  fetchRecentNets()
  if (operator.value?.user?.id) {
    fetchMemberships()
  }
})
</script>

<template>
  <AppLayout :title="t('operators.profile')" :breadcrumb-label="formattedCallSign || '...'">
    <div class="space-y-6">
      <template v-if="isLoading">
        <div class="animate-pulse flex flex-col sm:flex-row gap-6">
          <div class="h-24 w-24 rounded-full bg-muted flex-shrink-0 self-center sm:self-start" />
          <div class="flex-1 space-y-3">
            <div class="h-7 w-32 bg-muted rounded mx-auto sm:mx-0" />
            <div class="h-5 w-48 bg-muted rounded mx-auto sm:mx-0" />
            <div class="h-4 w-40 bg-muted rounded mx-auto sm:mx-0" />
          </div>
        </div>
      </template>

      <template v-else-if="operator">
        <div class="flex flex-col sm:flex-row gap-6">
          <UserAvatar :picture="operator.user?.picture" class="h-24 w-24 flex-shrink-0 self-center sm:self-start" />

          <div class="flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h1 class="text-2xl font-bold">{{ formattedCallSign }}</h1>
                <p v-if="displayName" class="text-lg text-muted-foreground">{{ displayName }}</p>
              </div>
              <Button 
                v-if="canEdit" 
                variant="outline" 
                size="sm" 
                @click="handleEditClick"
                class="flex-shrink-0"
              >
                <Pencil class="h-4 w-4 mr-2" />
                {{ t('common.edit') }}
              </Button>
            </div>

            <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <div v-if="hasUserAccount" class="flex items-center gap-1.5">
                <Calendar class="h-4 w-4" />
                <span>{{ formatMemberSince }}</span>
              </div>
              <div v-if="qthParts.length > 0" class="flex items-center gap-1.5">
                <MapPin class="h-4 w-4" />
                <span>{{ qthParts.join(' • ') }}</span>
              </div>
              <a
                v-if="locatorLink"
                :href="locatorLink"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-primary hover:underline"
              >
                {{ operator.gridSquare }}
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <Separator class="my-8" />

        <section v-if="hasUserAccount">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Building2 class="h-4 w-4" />
            {{ t('memberships.title') }}
          </h3>

          <div class="flex flex-wrap items-center gap-2 mb-4">
            <div class="relative flex-1 min-w-[200px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="membershipSearch"
                :placeholder="t('memberships.searchPlaceholder')"
                class="pl-9"
              />
            </div>
            <Select v-model="membershipRoleFilter">
              <SelectTrigger class="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('operators.roleAll') }}</SelectItem>
                <SelectItem value="president">{{ t('roles.president') }}</SelectItem>
                <SelectItem value="admin">{{ t('roles.admin') }}</SelectItem>
                <SelectItem value="member">{{ t('roles.member') }}</SelectItem>
                <SelectItem value="volunteer">{{ t('roles.volunteer') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div v-if="isLoadingMemberships" class="space-y-2">
            <div v-for="i in 2" :key="i" class="h-16 bg-muted rounded-lg animate-pulse" />
          </div>
          
          <div v-else-if="approvedMemberships.length === 0" class="text-center py-8">
            <Building2 class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p class="text-sm text-muted-foreground">{{ memberships.length === 0 ? t('memberships.noMemberships') : t('common.noResults') }}</p>
          </div>
          
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <BranchMembershipCard
              v-for="m in approvedMemberships"
              :key="m.id"
              :branch-id="m.branchId"
              :branch-name="m.branch.name"
              :role="m.role"
            />
          </div>
        </section>

        <Separator v-if="hasUserAccount" class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <TrendingUp class="h-4 w-4" />
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

        <Separator class="my-8" />

        <section>
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Radio class="h-4 w-4" />
            {{ t('operators.recentNets') }}
          </h3>

          <div class="flex flex-wrap items-center gap-2 mb-4">
            <div class="relative flex-1 min-w-[200px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="netsSearch"
                :placeholder="t('nets.searchPlaceholder')"
                class="pl-9"
              />
            </div>
            <Select v-model="netsRoleFilter">
              <SelectTrigger class="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('nets.roleAll') }}</SelectItem>
                <SelectItem value="managed">{{ t('operators.managed') }}</SelectItem>
                <SelectItem value="attended">{{ t('operators.attended') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="isLoadingNets" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="i in 6" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
              <div class="h-5 w-48 bg-muted animate-pulse rounded" />
              <div class="h-4 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          <div v-else-if="filteredNets.length === 0" class="py-8 text-center">
            <p class="text-muted-foreground">{{ recentNets.length === 0 ? t('operators.noNets') : t('common.noResults') }}</p>
          </div>

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <button
              v-for="net in filteredNets"
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
                <p class="text-xs text-muted-foreground">{{ formatNetDate(net.date) }}</p>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          </div>

          <div v-if="hasMoreNets && filteredNets.length > 0" class="pt-4">
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
