<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronDown, Loader2, Package, Plus, Trash2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AppLayout from '@/components/layout/AppLayout.vue'
import { SearchInput } from '@/components/shared'
import EquipmentCard from '@/components/inventory/EquipmentCard.vue'
import EquipmentCardSkeleton from '@/components/inventory/EquipmentCardSkeleton.vue'
import CreateEquipmentSheet from '@/components/inventory/CreateEquipmentSheet.vue'
import EditEquipmentSheet from '@/components/inventory/EditEquipmentSheet.vue'
import EquipmentDetailSheet from '@/components/inventory/EquipmentDetailSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCallSign } from '@/lib/formatters'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  user?: { id: string; fullName?: string; picture?: string }
}

interface EquipmentCategory {
  id: string
  name: string
  parentId: string | null
  children?: EquipmentCategory[]
}

interface EquipmentStatus {
  id: string
  name: string
  color: string | null
}

interface Equipment {
  id: string
  categoryId: string
  category: { id: string; name: string; parent?: { id: string; name: string; parent?: any }; photoPath?: string }
  statusId: string
  status: { id: string; name: string; color?: string }
  ownerType: 'operator' | 'branch'
  operatorId?: string
  operator?: { id: string; callSign: string }
  branchId?: string
  label?: string
  note?: string
  quantity?: number
  isVisible: boolean
  photos: Array<{ id: string; filePath: string; sortOrder: number }>
  propertyValues: Array<{ id: string; propertyDefinitionId: string; propertyDefinition: { id: string; name: string; type: string }; value: any }>
  createdAt: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const operatorId = computed(() => route.params.id as string)
const isOwner = computed(() => authStore.user?.operator?.id === operatorId.value)

const operator = ref<Operator | null>(null)
const isLoadingOperator = ref(true)

const equipment = ref<Equipment[]>([])
const equipmentTotal = ref(0)
const isLoadingEquipment = ref(true)
const isLoadingMore = ref(false)
const pageNumber = ref(1)
const pageSize = 12
const hasMore = computed(() => equipment.value.length < equipmentTotal.value)

const categories = ref<EquipmentCategory[]>([])
const statuses = ref<EquipmentStatus[]>([])

const search = ref('')
const categoryFilter = ref('all')
const statusFilter = ref('all')

const showCreateSheet = ref(false)
const detailEquipmentId = ref<string | null>(null)
const showDetailSheet = ref(false)
const editingEquipmentId = ref<string | null>(null)
const showEditSheet = ref(false)
const showDeleteDialog = ref(false)
const deletingEquipment = ref<Equipment | null>(null)
const isDeleting = ref(false)

const formattedCallSign = computed(() => {
  if (!operator.value) return '...'
  return formatCallSign(operator.value)
})

function buildCategoryPath(category: Equipment['category']): string {
  const parts: string[] = []
  let current: any = category
  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }
  return parts.join(' > ')
}

async function fetchOperator() {
  isLoadingOperator.value = true
  try {
    operator.value = await api.get<Operator>(`/operator/${operatorId.value}`)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    router.push('/operators')
  } finally {
    isLoadingOperator.value = false
  }
}

async function fetchEquipment(append = false) {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoadingEquipment.value = true
    pageNumber.value = 1
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(append ? pageNumber.value : 1))
    params.set('pageSize', String(pageSize))
    if (search.value) params.set('search', search.value)
    if (categoryFilter.value !== 'all') params.set('categoryId', categoryFilter.value)
    if (statusFilter.value !== 'all') params.set('statusId', statusFilter.value)

    const result = await api.get<{ data: Equipment[]; total: number }>(
      `/equipment/operator/${operatorId.value}?${params.toString()}`,
    )

    if (append) {
      equipment.value = [...equipment.value, ...result.data]
    } else {
      equipment.value = result.data
    }
    equipmentTotal.value = result.total
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isLoadingEquipment.value = false
    isLoadingMore.value = false
  }
}

async function fetchCategories() {
  try {
    categories.value = await api.get<EquipmentCategory[]>('/equipment-categories')
  } catch {
    categories.value = []
  }
}

async function fetchStatuses() {
  try {
    statuses.value = await api.get<EquipmentStatus[]>('/equipment-statuses')
  } catch {
    statuses.value = []
  }
}

function loadMore() {
  pageNumber.value++
  fetchEquipment(true)
}

function handleCardClick(id: string) {
  detailEquipmentId.value = id
  showDetailSheet.value = true
}

function handleDetailEdit() {
  showDetailSheet.value = false
  if (detailEquipmentId.value) {
    editingEquipmentId.value = detailEquipmentId.value
    showEditSheet.value = true
  }
}

function handleDetailDeleted() {
  showDetailSheet.value = false
  detailEquipmentId.value = null
  fetchEquipment()
}

function handleEditClick(id: string) {
  editingEquipmentId.value = id
  showEditSheet.value = true
}

function handleDeleteClick(id: string) {
  deletingEquipment.value = equipment.value.find((e) => e.id === id) || null
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!deletingEquipment.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/equipment/${deletingEquipment.value.id}`)
    toast.success(t('inventory.equipmentDeleted'))
    showDeleteDialog.value = false
    deletingEquipment.value = null
    fetchEquipment()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

function handleCreated() {
  showCreateSheet.value = false
  fetchEquipment()
}

function handleUpdated() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchEquipment()
}

function handleDeleted() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchEquipment()
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchEquipment(), 300)
})

watch([categoryFilter, statusFilter], () => {
  fetchEquipment()
})

onMounted(() => {
  fetchOperator()
  fetchCategories()
  fetchStatuses()
  fetchEquipment()
})
</script>

<template>
  <AppLayout
    :title="t('inventory.operatorInventory')"
    :breadcrumb-items="[
      { label: t('nav.home'), to: '/dashboard' },
      { label: t('nav.operators'), to: '/operators' },
      { label: formattedCallSign, to: `/operators/${operatorId}` },
    ]"
    :breadcrumb-label="t('inventory.title')"
  >
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-col gap-2">
          <SearchInput
            v-model="search"
            :placeholder="t('inventory.searchEquipment')"
          />
          <div class="flex flex-wrap items-center gap-2">
            <Select v-model="categoryFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue :placeholder="t('inventory.allCategories')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('inventory.allCategories') }}</SelectItem>
                <SelectItem v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="statusFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue :placeholder="t('inventory.allStatuses')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t('inventory.allStatuses') }}</SelectItem>
                <SelectItem v-for="s in statuses" :key="s.id" :value="s.id">
                  {{ s.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="trac-top-actions">
          <Button
            v-if="isOwner"
            variant="outline"
            class="trac-page-action-btn"
            @click="showCreateSheet = true"
          >
            <Plus class="h-4 w-4" />
            {{ t('inventory.addEquipment') }}
          </Button>
        </div>
      </div>

      <div v-if="isLoadingEquipment" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <EquipmentCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="equipment.length === 0" class="py-8 text-center">
        <Package class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p class="text-sm text-muted-foreground">
          {{ isOwner ? t('inventory.noEquipmentYet') : t('inventory.emptyState') }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <EquipmentCard
          v-for="item in equipment"
          :key="item.id"
          :id="item.id"
          :label="item.label"
          :category-name="item.category.name"
          :category-path="buildCategoryPath(item.category)"
          :category-photo-path="item.category.photoPath"
          :status-name="item.status.name"
          :status-color="item.status.color"
          :quantity="item.quantity"
          :is-visible="item.isVisible"
          :properties="item.propertyValues.map((pv) => ({ name: pv.propertyDefinition.name, value: pv.value, type: pv.propertyDefinition.type }))"
          :photo-paths="item.photos.map((p) => p.filePath)"
          :thumbnail-path="item.photos[0]?.filePath"
          :show-actions="isOwner"
          @click="handleCardClick"
          @edit="handleEditClick"
          @delete="handleDeleteClick"
        />
      </div>

      <div v-if="hasMore && !isLoadingEquipment" class="pt-4 pb-16 lg:pb-0">
        <Button
          variant="outline"
          class="w-full lg:w-auto lg:px-8"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          <ChevronDown v-if="!isLoadingMore" class="h-4 w-4 mr-2" />
          <Loader2 v-else class="h-4 w-4 mr-2 animate-spin" />
          {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
        </Button>
      </div>

      <EquipmentDetailSheet
        :open="showDetailSheet"
        :equipment-id="detailEquipmentId"
        :can-edit="isOwner"
        @update:open="showDetailSheet = $event"
        @edit="handleDetailEdit"
        @deleted="handleDetailDeleted"
      />

      <CreateEquipmentSheet
        :open="showCreateSheet"
        owner-type="operator"
        :operator-id="operatorId"
        @update:open="showCreateSheet = $event"
        @created="handleCreated"
      />

      <EditEquipmentSheet
        :open="showEditSheet"
        :equipment-id="editingEquipmentId"
        @update:open="showEditSheet = $event"
        @updated="handleUpdated"
        @deleted="handleDeleted"
      />

      <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{{ t('inventory.deleteEquipment') }}</DialogTitle>
            <DialogDescription>
              {{ deletingEquipment?.label || deletingEquipment?.category?.name }}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
              <X class="h-4 w-4 mr-2" />
              {{ t('common.cancel') }}
            </Button>
            <Button
              variant="outline"
              @click="confirmDelete"
              :disabled="isDeleting"
              class="trac-btn-destructive-outlined"
            >
              <Trash2 class="h-4 w-4 mr-2" />
              {{ isDeleting ? t('common.loading') : t('common.delete') }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </AppLayout>
</template>
