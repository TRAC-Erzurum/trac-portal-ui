<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AppLayout from '@/components/layout/AppLayout.vue'
import { OperatorCard, OperatorCardSkeleton } from '@/components/shared'
import { api } from '@/lib/api'
import { type UserRole } from '@/lib/ui-helpers'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  city?: string
  district?: string
  attendedCount: number
  managedCount: number
  user?: {
    fullName?: string
    role?: UserRole
    picture?: string
  }
}

interface OperatorsResponse {
  data: Operator[]
  total: number
}

const { t } = useI18n()

type MembershipFilter = 'all' | 'registered' | 'unregistered'

const operators = ref<Operator[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const membershipFilter = ref<MembershipFilter>('all')
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchOperators = async (append = false) => {
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
    if (membershipFilter.value !== 'all') params.set('membership', membershipFilter.value)

    const response = await api.get<OperatorsResponse>(`/operator?${params.toString()}`)
    
    if (append) {
      operators.value = [...operators.value, ...response.data]
    } else {
      operators.value = response.data
    }
    
    total.value = response.total
    hasMore.value = operators.value.length < response.total
  } catch (error) {
    console.error('Failed to fetch operators:', error)
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
    fetchOperators()
  }, 300)
}

const loadMore = () => {
  page.value++
  fetchOperators(true)
}

const handleFilterChange = () => {
  page.value = 1
  fetchOperators()
}

watch(search, handleSearch)
watch(membershipFilter, handleFilterChange)

onMounted(() => {
  fetchOperators()
})
</script>

<template>
  <AppLayout :title="t('nav.operators')">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative w-full sm:flex-1 sm:max-w-xs">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="search"
            :placeholder="t('operators.searchPlaceholder')"
            class="pl-9"
          />
        </div>

        <Select v-model="membershipFilter">
          <SelectTrigger class="flex-1 sm:flex-none sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{{ t('operators.membershipAll') }}</SelectItem>
            <SelectItem value="registered">{{ t('operators.membershipRegistered') }}</SelectItem>
            <SelectItem value="unregistered">{{ t('operators.membershipUnregistered') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p v-if="!isLoading" class="text-sm text-muted-foreground">
        {{ t('operators.totalCount', { count: total }) }}
      </p>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <OperatorCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="operators.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('operators.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <OperatorCard
          v-for="op in operators"
          :key="op.id"
          :id="op.id"
          :call-sign="op.callSign"
          :prefix="op.prefix"
          :suffix="op.suffix"
          :full-name="op.fullName"
          :city="op.city"
          :district="op.district"
          :attended-count="op.attendedCount"
          :managed-count="op.managedCount"
          :user-full-name="op.user?.fullName"
          :user-picture="op.user?.picture"
        />
      </div>

      <div v-if="hasMore && !isLoading" class="pt-4">
        <Button
          variant="outline"
          class="w-full lg:w-auto lg:px-8"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          {{ isLoadingMore ? t('common.loading') : t('operators.loadMore') }}
        </Button>
      </div>
    </div>
  </AppLayout>
</template>
