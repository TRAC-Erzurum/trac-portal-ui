<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronDown, Trash2, Upload } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import { OperatorCard, OperatorCardSkeleton, SearchInput } from '@/components/shared'
import ImportOperatorsSheet from '@/components/operators/ImportOperatorsSheet.vue'
import { usePersistedFilters } from '@/composables'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { type UserRole } from '@/lib/ui-helpers'
import { translateError } from '@/i18n'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  city?: string
  district?: string
  gridSquare?: string
  attendedCount: number
  managedCount: number
  user?: {
    id?: string
    fullName?: string
    role?: UserRole
    picture?: string
  }
}

interface OperatorsResponse {
  data: Operator[]
  total: number
}

const { t, locale } = useI18n()
const authStore = useAuthStore()

type MembershipFilter = 'all' | 'registered' | 'unregistered'

const operators = ref<Operator[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isImportSheetOpen = ref(false)
const search = ref('')
const membershipFilter = ref<MembershipFilter>('all')
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

const showDeleteDialog = ref(false)
const operatorToDelete = ref<Operator | null>(null)
const isDeleting = ref(false)

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

const handleDeleteClick = (op: Operator) => {
  operatorToDelete.value = op
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!operatorToDelete.value) return
  isDeleting.value = true
  try {
    await api.delete(`/operator/${operatorToDelete.value.id}`)
    toast.success(t('operators.deleteOperatorSuccess'))
    operators.value = operators.value.filter(op => op.id !== operatorToDelete.value?.id)
    total.value--
  } catch (error: any) {
    console.error('Failed to delete operator:', error)
    toast.error(translateError(error.message || 'error.serverError'))
  } finally {
    isDeleting.value = false
    showDeleteDialog.value = false
    operatorToDelete.value = null
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

usePersistedFilters('operators', { search, membershipFilter })

watch(search, handleSearch)
watch(membershipFilter, handleFilterChange)

onMounted(() => {
  fetchOperators()
})
</script>

<template>
  <AppLayout :title="t('nav.operators').toLocaleUpperCase(locale)">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_160px] gap-2 items-center">
          <SearchInput
            v-model="search"
            :placeholder="t('operators.searchPlaceholder')"
          />
          <Select v-model="membershipFilter" class="w-full min-w-0">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('operators.membershipAll') }}</SelectItem>
              <SelectItem value="registered">{{ t('operators.membershipRegistered') }}</SelectItem>
              <SelectItem value="unregistered">{{ t('operators.membershipUnregistered') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="trac-top-actions">
          <Button
            v-if="authStore.isAdmin"
            variant="outline"
            size="sm"
            class="trac-page-action-btn"
            @click="isImportSheetOpen = true"
          >
            <Upload class="h-4 w-4 mr-2" />
            {{ t('operators.import') }}
          </Button>
        </div>
      </div>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <OperatorCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="operators.length === 0" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">{{ t('operators.noResults') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
          :grid-square="op.gridSquare"
          :attended-count="op.attendedCount"
          :managed-count="op.managedCount"
          :user-full-name="op.user?.fullName"
          :user-picture="op.user?.picture"
          :global-role="op.user?.role"
          :show-delete="authStore.isAdmin && !op.user?.id && op.attendedCount === 0 && op.managedCount === 0"
          @delete="handleDeleteClick(op)"
        />
      </div>

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || operators.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ operators.length }}/{{ total }} {{ t('operators.name') }}
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
    </div>

    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('operators.deleteOperator') }}</DialogTitle>
          <DialogDescription>
            {{ t('operators.deleteOperatorConfirm') }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            {{ t('common.cancel') }}
          </Button>
          <Button variant="destructive" class="trac-btn-destructive-outlined" @click="confirmDelete" :disabled="isDeleting">
            <Trash2 v-if="!isDeleting" class="h-4 w-4 mr-2" />
            {{ isDeleting ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ImportOperatorsSheet
      v-model:open="isImportSheetOpen"
      @imported="fetchOperators"
    />
  </AppLayout>
</template>
