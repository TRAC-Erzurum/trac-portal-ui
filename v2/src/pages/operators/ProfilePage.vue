<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronRight, MapPin, ExternalLink, Radio, Users, TrendingUp, Signal, Ear, Pencil, Shield, Key, Calendar } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AppLayout from '@/components/layout/AppLayout.vue'
import EditOperatorAdminSheet from '@/components/operators/EditOperatorAdminSheet.vue'
import ResetPasswordSheet from '@/components/admin/ResetPasswordSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { UserAvatar } from '@/components/ui/user-avatar'
import { api } from '@/lib/api'
import { formatCallSign, formatDateLong, formatNetDate } from '@/lib/formatters'
import { getRoleBadgeClass, type UserRole } from '@/lib/ui-helpers'

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
    role?: UserRole
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
const showResetPasswordSheet = ref(false)
const netsPage = ref(1)
const netsPageSize = 12
const hasMoreNets = ref(true)
const isUpdatingRole = ref(false)

const availableRoles: UserRole[] = ['guest', 'volunteer', 'member', 'admin']

const operatorId = computed(() => route.params.id as string)

const canEdit = computed(() => authStore.isAdmin || authStore.isSuperAdmin)

const hasUserAccount = computed(() => !!operator.value?.user?.id)

const canChangeRole = computed(() => {
  if (!hasUserAccount.value || !operator.value?.user?.role) return false
  const targetRole = operator.value.user.role
  if (authStore.isSuperAdmin) return targetRole !== 'super_admin'
  if (authStore.isAdmin) return !['admin', 'super_admin'].includes(targetRole)
  return false
})

const canResetPassword = computed(() => {
  if (!hasUserAccount.value || !operator.value?.user?.role) return false
  const targetRole = operator.value.user.role
  if (authStore.isSuperAdmin) return targetRole !== 'super_admin'
  if (authStore.isAdmin) return !['admin', 'super_admin'].includes(targetRole)
  return false
})

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

const handleRoleChange = async (value: unknown) => {
  const newRole = value as string
  if (!operator.value?.user?.id || !newRole) return
  
  isUpdatingRole.value = true
  try {
    await api.patch(`/user/${operator.value.user.id}/role`, { role: newRole })
    toast.success(t('admin.roleUpdated'))
    fetchOperator()
  } catch (error) {
    console.error('Failed to update role:', error)
    toast.error(t('error.serverError'))
  } finally {
    isUpdatingRole.value = false
  }
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
                <Shield class="h-4 w-4" />
                <span 
                  class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  :class="getRoleBadgeClass(operator.user?.role)"
                >{{ t(`admin.roles.${operator.user?.role}`) }}</span>
              </div>
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

        <template v-if="hasUserAccount && canEdit">
          <Separator class="my-8" />

          <section>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Key class="h-4 w-4" />
                {{ t('admin.accountInfo') }}
              </h3>
              <Button 
                v-if="canResetPassword" 
                variant="outline" 
                size="sm" 
                @click="showResetPasswordSheet = true"
              >
                <Key class="h-4 w-4 mr-2" />
                {{ t('admin.resetPassword') }}
              </Button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">{{ t('admin.email') }}</p>
                <p class="font-medium truncate">{{ operator.user?.email }}</p>
              </div>

              <div>
                <p class="text-xs text-muted-foreground mb-0.5">{{ t('admin.role') }}</p>
                <Select 
                  v-if="canChangeRole"
                  :model-value="operator.user?.role" 
                  @update:model-value="handleRoleChange"
                  :disabled="isUpdatingRole"
                >
                  <SelectTrigger class="w-full h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="role in availableRoles" :key="role" :value="role">
                      {{ t(`admin.roles.${role}`) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p v-else class="font-medium">{{ t(`admin.roles.${operator.user?.role}`) }}</p>
              </div>
            </div>
          </section>
        </template>

        <Separator class="my-8" />

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
                <p class="text-xs text-muted-foreground">{{ formatNetDate(net.date) }}</p>
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

      <ResetPasswordSheet
        v-if="operator?.user?.id"
        v-model:open="showResetPasswordSheet"
        :user-id="operator.user.id"
        :call-sign="formattedCallSign"
      />
    </div>
  </AppLayout>
</template>
