<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Search, ChevronRight, Radio, Users } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import { api } from '@/lib/api'

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
  }
}

interface OperatorsResponse {
  data: Operator[]
  total: number
}

const { t } = useI18n()
const router = useRouter()

const operators = ref<Operator[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = 24
const hasMore = ref(true)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchOperators = async (append = false) => {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const response = await api.get<OperatorsResponse>(
      `/operator?pageNumber=${page.value}&pageSize=${pageSize}&search=${encodeURIComponent(search.value)}`
    )
    
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

const goToOperator = (id: string) => {
  router.push(`/operators/${id}`)
}

const formatCallSign = (op: Operator) => {
  if (op.prefix) {
    return `${op.prefix}/${op.callSign}`
  }
  if (op.suffix) {
    return `${op.callSign}/${op.suffix}`
  }
  return op.callSign
}

const getDisplayName = (op: Operator) => {
  return op.user?.fullName || op.fullName || ''
}

const getQth = (op: Operator) => {
  const parts = [op.district, op.city].filter(Boolean)
  return parts.join(', ')
}

watch(search, handleSearch)

onMounted(() => {
  fetchOperators()
})
</script>

<template>
  <AppLayout :title="t('nav.operators')">
    <div class="space-y-4">
      <div class="relative max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="search"
          :placeholder="t('operators.searchPlaceholder')"
          class="pl-9"
        />
      </div>

      <p v-if="!isLoading" class="text-sm text-muted-foreground">
        {{ t('operators.totalCount', { count: total }) }}
      </p>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="i in 9" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
          <div class="h-5 w-24 bg-muted animate-pulse rounded" />
          <div class="h-4 w-40 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div v-else-if="operators.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('operators.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <button
          v-for="op in operators"
          :key="op.id"
          @click="goToOperator(op.id)"
          class="w-full text-left p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group flex items-center gap-3"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ formatCallSign(op) }}</span>
              <span v-if="op.attendedCount > 0 || op.managedCount > 0" class="flex items-center gap-2 text-xs text-muted-foreground">
                <span v-if="op.attendedCount > 0" class="flex items-center gap-0.5">
                  <Users class="h-3 w-3" />
                  {{ op.attendedCount }}
                </span>
                <span v-if="op.managedCount > 0" class="flex items-center gap-0.5">
                  <Radio class="h-3 w-3" />
                  {{ op.managedCount }}
                </span>
              </span>
            </div>
            <p class="text-sm text-muted-foreground truncate">
              <template v-if="getDisplayName(op)">{{ getDisplayName(op) }}</template>
              <template v-if="getDisplayName(op) && getQth(op)"> • </template>
              <template v-if="getQth(op)">{{ getQth(op) }}</template>
              <template v-if="!getDisplayName(op) && !getQth(op)">—</template>
            </p>
          </div>
          <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
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
