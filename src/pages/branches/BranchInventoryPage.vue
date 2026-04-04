<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Building2, ChevronDown, Loader2, Package, Plus, Trash2, Users, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import AppLayout from '@/components/layout/AppLayout.vue'
import { SearchInput } from '@/components/shared'
import EquipmentCard from '@/components/inventory/EquipmentCard.vue'
import EquipmentCardSkeleton from '@/components/inventory/EquipmentCardSkeleton.vue'
import CreateEquipmentSheet from '@/components/inventory/CreateEquipmentSheet.vue'
import EditEquipmentSheet from '@/components/inventory/EditEquipmentSheet.vue'
import EquipmentDetailSheet from '@/components/inventory/EquipmentDetailSheet.vue'
import { useAsyncStaleGuard } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { flattenCategoriesWithLevel } from '@/lib/category-utils'

interface Branch {
  id: string
  name: string
  isHeadquarters?: boolean
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
  isVisible: boolean
  photos: Array<{ id: string; filePath: string; sortOrder: number }>
  propertyValues: Array<{ id: string; propertyDefinitionId: string; propertyDefinition: { id: string; name: string; type: string }; value: any }>
  createdAt: string
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const branchEquipmentListGuard = useAsyncStaleGuard()
const memberEquipmentListGuard = useAsyncStaleGuard()

const branchId = computed(() => route.params.id as string)
const isBranchAdmin = computed(() =>
  authStore.canLeadBranch(branchId.value),
)

const branch = ref<Branch | null>(null)
const isLoadingBranch = ref(true)
const categories = ref<EquipmentCategory[]>([])
const categoryOptions = computed(() => flattenCategoriesWithLevel(categories.value))
const statuses = ref<EquipmentStatus[]>([])

// Branch equipment state
const branchEquipment = ref<Equipment[]>([])
const branchTotal = ref(0)
const isLoadingBranch_ = ref(true)
const isLoadingMoreBranch = ref(false)
const branchPage = ref(1)
const branchSearch = ref('')
const branchCategoryFilter = ref('all')
const branchStatusFilter = ref('all')
const hasBranchMore = computed(() => branchEquipment.value.length < branchTotal.value)

// Member equipment state
const memberEquipment = ref<Equipment[]>([])
const memberTotal = ref(0)
const isLoadingMember = ref(true)
const isLoadingMoreMember = ref(false)
const memberPage = ref(1)
const memberSearch = ref('')
const memberCategoryFilter = ref('all')
const memberStatusFilter = ref('all')
const hasMemberMore = computed(() => memberEquipment.value.length < memberTotal.value)

const pageSize = 48

const showCreateSheet = ref(false)
const detailEquipmentId = ref<string | null>(null)
const showDetailSheet = ref(false)
const detailCanEdit = ref(false)
const editingEquipmentId = ref<string | null>(null)
const showEditSheet = ref(false)
const showDeleteDialog = ref(false)
const deletingEquipment = ref<Equipment | null>(null)
const isDeleting = ref(false)

function buildCategoryPath(category: Equipment['category']): string {
  const parts: string[] = []
  let current: any = category
  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }
  return parts.join(' > ')
}

async function fetchBranch() {
  isLoadingBranch.value = true
  try {
    branch.value = await api.get<Branch>(`/branches/${branchId.value}`)
    if (branch.value?.isHeadquarters) {
      router.replace(`/branches/${branchId.value}`)
      return
    }
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    router.push('/branches')
  } finally {
    isLoadingBranch.value = false
  }
}

async function fetchBranchEquipment(append = false) {
  const token = append ? branchEquipmentListGuard.beginAppend() : branchEquipmentListGuard.beginReplace()
  if (append) {
    isLoadingMoreBranch.value = true
  } else {
    isLoadingBranch_.value = true
    branchPage.value = 1
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(append ? branchPage.value : 1))
    params.set('pageSize', String(pageSize))
    if (branchSearch.value) params.set('search', branchSearch.value)
    if (branchCategoryFilter.value !== 'all') params.set('categoryId', branchCategoryFilter.value)
    if (branchStatusFilter.value !== 'all') params.set('statusId', branchStatusFilter.value)

    const result = await api.get<{ data: Equipment[]; total: number }>(
      `/equipment/branch/${branchId.value}?${params.toString()}`,
    )

    if (!branchEquipmentListGuard.isCurrent(token)) {
      return
    }

    if (append) {
      branchEquipment.value = [...branchEquipment.value, ...result.data]
    } else {
      branchEquipment.value = result.data
    }
    branchTotal.value = result.total
  } catch (e) {
    if (!branchEquipmentListGuard.isCurrent(token)) {
      return
    }
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    if (branchEquipmentListGuard.isCurrent(token)) {
      isLoadingBranch_.value = false
      isLoadingMoreBranch.value = false
    }
  }
}

async function fetchMemberEquipment(append = false) {
  const token = append ? memberEquipmentListGuard.beginAppend() : memberEquipmentListGuard.beginReplace()
  if (append) {
    isLoadingMoreMember.value = true
  } else {
    isLoadingMember.value = true
    memberPage.value = 1
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(append ? memberPage.value : 1))
    params.set('pageSize', String(pageSize))
    if (memberSearch.value) params.set('search', memberSearch.value)
    if (memberCategoryFilter.value !== 'all') params.set('categoryId', memberCategoryFilter.value)
    if (memberStatusFilter.value !== 'all') params.set('statusId', memberStatusFilter.value)

    const result = await api.get<{ data: Equipment[]; total: number }>(
      `/equipment/branch/${branchId.value}/members?${params.toString()}`,
    )

    if (!memberEquipmentListGuard.isCurrent(token)) {
      return
    }

    if (append) {
      memberEquipment.value = [...memberEquipment.value, ...result.data]
    } else {
      memberEquipment.value = result.data
    }
    memberTotal.value = result.total
  } catch (e) {
    if (!memberEquipmentListGuard.isCurrent(token)) {
      return
    }
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    if (memberEquipmentListGuard.isCurrent(token)) {
      isLoadingMember.value = false
      isLoadingMoreMember.value = false
    }
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

function loadMoreBranch() {
  branchPage.value++
  fetchBranchEquipment(true)
}

function loadMoreMember() {
  memberPage.value++
  fetchMemberEquipment(true)
}

function handleBranchCardClick(id: string) {
  detailEquipmentId.value = id
  detailCanEdit.value = isBranchAdmin.value
  showDetailSheet.value = true
}

function handleBranchEditClick(id: string) {
  editingEquipmentId.value = id
  showEditSheet.value = true
}

function handleBranchDeleteClick(id: string) {
  deletingEquipment.value = branchEquipment.value.find((e) => e.id === id) || null
  showDeleteDialog.value = true
}

function handleMemberCardClick(id: string) {
  detailEquipmentId.value = id
  detailCanEdit.value = false
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
  fetchBranchEquipment()
}

async function confirmDelete() {
  if (!deletingEquipment.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/equipment/${deletingEquipment.value.id}`)
    toast.success(t('inventory.equipmentDeleted'))
    showDeleteDialog.value = false
    deletingEquipment.value = null
    fetchBranchEquipment()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

function handleCreated() {
  showCreateSheet.value = false
  fetchBranchEquipment()
}

function handleUpdated() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchBranchEquipment()
  fetchMemberEquipment()
}

function handleDeleted() {
  showEditSheet.value = false
  editingEquipmentId.value = null
  fetchBranchEquipment()
}

let branchSearchTimeout: ReturnType<typeof setTimeout> | null = null
watch(branchSearch, () => {
  if (branchSearchTimeout) clearTimeout(branchSearchTimeout)
  branchSearchTimeout = setTimeout(() => fetchBranchEquipment(), 300)
})

watch([branchCategoryFilter, branchStatusFilter], () => {
  fetchBranchEquipment()
})

let memberSearchTimeout: ReturnType<typeof setTimeout> | null = null
watch(memberSearch, () => {
  if (memberSearchTimeout) clearTimeout(memberSearchTimeout)
  memberSearchTimeout = setTimeout(() => fetchMemberEquipment(), 300)
})

watch([memberCategoryFilter, memberStatusFilter], () => {
  fetchMemberEquipment()
})

onMounted(() => {
  fetchBranch()
  fetchCategories()
  fetchStatuses()
  fetchBranchEquipment()
  fetchMemberEquipment()
})
</script>

<template>
  <AppLayout
    :title="t('inventory.branchInventory')"
    :breadcrumb-items="[
      { label: t('nav.home'), to: '/dashboard' },
      { label: t('nav.branches'), to: '/branches' },
      { label: branch?.name || '...', to: `/branches/${branchId}` },
    ]"
    :breadcrumb-label="t('inventory.title')"
  >
    <div class="space-y-4">
      <!-- Branch Equipment Section -->
      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Building2 class="h-4 w-4" />
          {{ t('inventory.branchInventory') }}
        </h3>

        <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
          <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-col gap-2">
            <SearchInput
              v-model="branchSearch"
              :placeholder="t('inventory.searchEquipment')"
            />
            <div class="flex flex-wrap items-center gap-2">
              <Select v-model="branchCategoryFilter">
                <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                  <SelectValue :placeholder="t('inventory.allCategories')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('inventory.allCategories') }}</SelectItem>
                  <SelectItem
                    v-for="item in categoryOptions"
                    :key="item.category.id"
                    :value="item.category.id"
                  >
                    <span :style="{ paddingLeft: `${item.level * 12}px` }">{{ item.category.name }}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select v-model="branchStatusFilter">
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
              v-if="isBranchAdmin"
              variant="outline"
              class="trac-page-action-btn"
              @click="showCreateSheet = true"
            >
              <Plus class="h-4 w-4" />
              {{ t('inventory.addEquipment') }}
            </Button>
          </div>
        </div>

        <div v-if="isLoadingBranch_" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <EquipmentCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else-if="branchEquipment.length === 0" class="py-8 text-center">
          <Package class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('inventory.noEquipmentYet') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <EquipmentCard
            v-for="item in branchEquipment"
            :key="item.id"
            :id="item.id"
            :label="item.label"
            :category-name="item.category.name"
            :category-path="buildCategoryPath(item.category)"
            :category-photo-path="item.category.photoPath"
            :status-name="item.status.name"
            :status-color="item.status.color"
            :is-visible="item.isVisible"
            :properties="item.propertyValues.map((pv) => ({ name: pv.propertyDefinition.name, value: pv.value, type: pv.propertyDefinition.type }))"
            :thumbnail-path="item.photos[0]?.filePath"
            :show-actions="isBranchAdmin"
            @click="handleBranchCardClick"
            @edit="handleBranchEditClick"
            @delete="handleBranchDeleteClick"
          />
        </div>

        <div v-if="hasBranchMore && !isLoadingBranch_" class="pt-4">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMoreBranch"
            @click="loadMoreBranch"
          >
            <ChevronDown v-if="!isLoadingMoreBranch" class="h-4 w-4 mr-2" />
            <Loader2 v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isLoadingMoreBranch ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
      </section>

      <Separator class="my-8" />

      <!-- Member Equipment Section -->
      <section>
        <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
          <Users class="h-4 w-4" />
          {{ t('inventory.memberEquipment') }}
        </h3>

        <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
          <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-col gap-2">
            <SearchInput
              v-model="memberSearch"
              :placeholder="t('inventory.searchEquipment')"
            />
            <div class="flex flex-wrap items-center gap-2">
              <Select v-model="memberCategoryFilter">
                <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                  <SelectValue :placeholder="t('inventory.allCategories')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{{ t('inventory.allCategories') }}</SelectItem>
                  <SelectItem
                    v-for="item in categoryOptions"
                    :key="item.category.id"
                    :value="item.category.id"
                  >
                    <span :style="{ paddingLeft: `${item.level * 12}px` }">{{ item.category.name }}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select v-model="memberStatusFilter">
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
        </div>

        <div v-if="isLoadingMember" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <EquipmentCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else-if="memberEquipment.length === 0" class="py-8 text-center">
          <Package class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('inventory.emptyState') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <EquipmentCard
            v-for="item in memberEquipment"
            :key="item.id"
            :id="item.id"
            :label="item.label"
            :category-name="item.category.name"
            :category-path="buildCategoryPath(item.category)"
            :category-photo-path="item.category.photoPath"
            :status-name="item.status.name"
            :status-color="item.status.color"
            :is-visible="item.isVisible"
            :properties="item.propertyValues.map((pv) => ({ name: pv.propertyDefinition.name, value: pv.value, type: pv.propertyDefinition.type }))"
            :thumbnail-path="item.photos[0]?.filePath"
            :owner-call-sign="item.operator?.callSign"
            :operator-id="item.operator?.id"
            :show-actions="false"
            @click="handleMemberCardClick"
          />
        </div>

        <div v-if="hasMemberMore && !isLoadingMember" class="pt-4 pb-16 lg:pb-0">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMoreMember"
            @click="loadMoreMember"
          >
            <ChevronDown v-if="!isLoadingMoreMember" class="h-4 w-4 mr-2" />
            <Loader2 v-else class="h-4 w-4 mr-2 animate-spin" />
            {{ isLoadingMoreMember ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
      </section>

      <EquipmentDetailSheet
        :open="showDetailSheet"
        :equipment-id="detailEquipmentId"
        :can-edit="detailCanEdit"
        @update:open="showDetailSheet = $event"
        @edit="handleDetailEdit"
        @deleted="handleDetailDeleted"
      />

      <CreateEquipmentSheet
        :open="showCreateSheet"
        owner-type="branch"
        :branch-id="branchId"
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
