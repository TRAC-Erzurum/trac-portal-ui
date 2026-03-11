<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Boxes, Loader2, Plus, Trash2, X } from 'lucide-vue-next'
import CategoryTree from '@/components/inventory/CategoryTree.vue'
import CreateCategorySheet from '@/components/inventory/CreateCategorySheet.vue'
import EditCategorySheet from '@/components/inventory/EditCategorySheet.vue'
import StatusManagement from '@/components/inventory/StatusManagement.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface CategoryProperty {
  id: string
  name: string
  type: string
  isRequired: boolean
  sortOrder: number
  enumValues: string[] | null
  numberArrayMaxLength: number | null
  minValue: number | null
  maxValue: number | null
}

interface Category {
  id: string
  name: string
  parentId: string | null
  photoPath: string | null
  sortOrder: number
  children: Category[]
  propertyDefinitions: CategoryProperty[]
  equipmentCount?: number
}

const { t } = useI18n()

const categories = ref<Category[]>([])
const isLoadingCategories = ref(true)
const isCreateCategorySheetOpen = ref(false)
const isEditCategorySheetOpen = ref(false)
const selectedCategory = ref<Category | null>(null)
const showDeleteDialog = ref(false)
const deletingCategory = ref<Category | null>(null)
const isDeleting = ref(false)

const fetchCategories = async () => {
  isLoadingCategories.value = true
  try {
    categories.value = await api.get<Category[]>('/equipment-categories')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    categories.value = []
  } finally {
    isLoadingCategories.value = false
  }
}

const handleCategoryEdit = async (category: Category) => {
  try {
    const detail = await api.get<Category>(`/equipment-categories/${category.id}`)
    selectedCategory.value = detail
    isEditCategorySheetOpen.value = true
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  }
}

const handleCategoryDelete = (category: Category) => {
  deletingCategory.value = category
  showDeleteDialog.value = true
}

const confirmCategoryDelete = async () => {
  if (!deletingCategory.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/equipment-categories/${deletingCategory.value.id}`)
    toast.success(t('inventory.categoryDeleted'))
    showDeleteDialog.value = false
    deletingCategory.value = null
    fetchCategories()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

const handleCategoryCreated = () => {
  isCreateCategorySheetOpen.value = false
  fetchCategories()
}

const handleCategoryUpdated = () => {
  fetchCategories()
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <AppLayout :title="t('inventory.inventoryManagement')">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Boxes class="h-4 w-4" />
            {{ t('inventory.categories') }}
          </h3>
          <Button
            variant="outline"
            size="sm"
            @click="isCreateCategorySheetOpen = true"
            :aria-label="t('inventory.createCategory')"
          >
            <Plus class="h-4 w-4 mr-2" />
            {{ t('inventory.createCategory') }}
          </Button>
        </div>

        <div v-if="isLoadingCategories" class="flex items-center justify-center py-12">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-8">
          <Boxes class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('inventory.noCategoriesYet') }}</p>
        </div>

        <CategoryTree
          v-else
          :categories="categories"
          @edit="handleCategoryEdit"
          @delete="handleCategoryDelete"
        />
      </div>

      <div>
        <Separator class="my-8 lg:hidden" />
        <StatusManagement />
      </div>
    </div>

    <CreateCategorySheet
      :open="isCreateCategorySheetOpen"
      :categories="categories"
      @update:open="isCreateCategorySheetOpen = $event"
      @created="handleCategoryCreated"
    />

    <EditCategorySheet
      v-if="selectedCategory"
      :open="isEditCategorySheetOpen"
      :category="selectedCategory"
      :categories="categories"
      @update:open="(v) => { isEditCategorySheetOpen = v; if (!v) selectedCategory = null }"
      @updated="handleCategoryUpdated"
    />

    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('inventory.deleteCategory') }}</DialogTitle>
          <DialogDescription>
            {{ deletingCategory?.name }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="confirmCategoryDelete"
            :disabled="isDeleting"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ isDeleting ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
