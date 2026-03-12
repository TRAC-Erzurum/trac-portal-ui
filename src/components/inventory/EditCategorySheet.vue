<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Edit, ImagePlus, Plus, Save, Settings2, Trash2, X } from 'lucide-vue-next'
import CategoryPropertyEditor from '@/components/inventory/CategoryPropertyEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getUploadedFileUrl } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { readFileAsDataUrl } from '@/lib/utils'

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

/** Create mode: property not yet saved (no id). tempId for list key. */
interface PendingProperty {
  tempId: string
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

const props = withDefaults(
  defineProps<{
    open: boolean
    /** null = create mode, category = edit mode */
    category: Category | null
    categories: Category[]
  }>(),
  { category: null }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
  updated: []
}>()

const { t } = useI18n()

const isCreateMode = computed(() => !props.category)

const name = ref('')
const parentId = ref<string>('')
const sortOrder = ref(0)
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const isSaving = ref(false)
const showAddProperty = ref(false)
const editingPropertyId = ref<string | null>(null)
/** Create mode: properties added before first save */
const pendingProperties = ref<PendingProperty[]>([])
/** Edit mode: working list (existing + new), synced with category save */
const editModeProperties = ref<(CategoryProperty | PendingProperty)[]>([])

const currentPhotoUrl = computed(() => {
  if (photoPreview.value) return photoPreview.value
  if (props.category?.photoPath) return getUploadedFileUrl(props.category.photoPath) || null
  return null
})

/** Edit mode: from editModeProperties. Create mode: from pendingProperties */
const properties = computed(() => {
  const list = props.category ? editModeProperties.value : pendingProperties.value
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder)
})

function flattenCategories(cats: Category[]): Category[] {
  return cats.flatMap((c) => [{ ...c, children: [] }, ...flattenCategories(c.children || [])])
}

function findCategoryInTree(cats: Category[], id: string): Category | null {
  for (const c of cats) {
    if (c.id === id) return c
    const found = findCategoryInTree(c.children || [], id)
    if (found) return found
  }
  return null
}

function collectSelfAndDescendantIds(cat: Category): string[] {
  return [cat.id, ...(cat.children || []).flatMap((c) => collectSelfAndDescendantIds(c))]
}

/** Categories that can be selected as parent (exclude self and descendants in edit mode) */
const parentCategoryOptions = computed(() => {
  const flat = flattenCategories(props.categories)
  if (!props.category) return flat
  const cat = findCategoryInTree(props.categories, props.category.id)
  if (!cat) return flat
  const excludeIds = new Set(collectSelfAndDescendantIds(cat))
  return flat.filter((c) => !excludeIds.has(c.id))
})

function getMaxSortOrder(): number {
  const flat = flattenCategories(props.categories)
  if (flat.length === 0) return -1
  return Math.max(...flat.map((c) => c.sortOrder ?? 0))
}

function initForm() {
  if (props.category) {
    name.value = props.category.name
    parentId.value = props.category.parentId ?? ''
    sortOrder.value = props.category.sortOrder
  } else {
    name.value = ''
    parentId.value = ''
    sortOrder.value = getMaxSortOrder() + 1
  }
  photoFile.value = null
  photoPreview.value = null
  showAddProperty.value = false
  editingPropertyId.value = null
  pendingProperties.value = []
  editModeProperties.value = props.category
    ? (props.category.propertyDefinitions || []).map((p) => ({ ...p }))
    : []
}

watch(
  () => [props.open, props.category] as const,
  () => {
    if (props.open) initForm()
  },
  { deep: true, immediate: true }
)

async function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('error.invalidFileType'))
    return
  }

  photoFile.value = file
  photoPreview.value = await readFileAsDataUrl(file)
}

function removePhoto() {
  photoFile.value = null
  photoPreview.value = null
}

async function handleSave() {
  if (!name.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    if (isCreateMode.value) {
      const propertyDefinitions = pendingProperties.value.map((p) => ({
        name: p.name,
        type: p.type,
        isRequired: p.isRequired,
        sortOrder: p.sortOrder,
        enumValues: p.enumValues ?? undefined,
        numberArrayMaxLength: p.numberArrayMaxLength ?? undefined,
        minValue: p.minValue ?? undefined,
        maxValue: p.maxValue ?? undefined,
      }))
      const created = await api.post<Category>('/equipment-categories', {
        name: name.value.trim(),
        parentId: parentId.value || undefined,
        sortOrder: sortOrder.value,
        propertyDefinitions,
      })
      const id = created.id
      if (photoFile.value) {
        const formData = new FormData()
        formData.append('file', photoFile.value)
        await api.post(`/equipment-categories/${id}/upload`, formData)
      }
      toast.success(t('inventory.categoryCreated'))
      emit('created')
      emit('update:open', false)
    } else if (props.category) {
      const propertyDefinitions = editModeProperties.value.map((p) => {
        const base = {
          name: p.name,
          type: p.type,
          isRequired: p.isRequired,
          sortOrder: p.sortOrder,
          enumValues: p.enumValues ?? undefined,
          numberArrayMaxLength: p.numberArrayMaxLength ?? undefined,
          minValue: p.minValue ?? undefined,
          maxValue: p.maxValue ?? undefined,
        }
        if ('id' in p && p.id) return { ...base, id: p.id }
        return base
      })
      await api.patch(`/equipment-categories/${props.category.id}`, {
        name: name.value.trim(),
        parentId: parentId.value || null,
        sortOrder: sortOrder.value,
        propertyDefinitions,
      })
      if (photoFile.value) {
        const formData = new FormData()
        formData.append('file', photoFile.value)
        await api.post(`/equipment-categories/${props.category.id}/upload`, formData)
      }
      toast.success(t('inventory.categoryUpdated'))
      emit('updated')
      emit('update:open', false)
    }
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

function getPropertyKey(prop: CategoryProperty | PendingProperty): string {
  return 'id' in prop && prop.id ? prop.id : prop.tempId
}

function handlePropertySaved(propertyData: Record<string, unknown>, propertyId?: string) {
  const payload: PendingProperty = {
    tempId: propertyId ?? `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: String(propertyData.name),
    type: String(propertyData.type),
    isRequired: Boolean(propertyData.isRequired),
    sortOrder: Number(propertyData.sortOrder ?? 0),
    enumValues: Array.isArray(propertyData.enumValues) ? propertyData.enumValues : null,
    numberArrayMaxLength:
      propertyData.numberArrayMaxLength != null
        ? Number(propertyData.numberArrayMaxLength)
        : null,
    minValue: propertyData.minValue != null ? Number(propertyData.minValue) : null,
    maxValue: propertyData.maxValue != null ? Number(propertyData.maxValue) : null,
  }
  if (isCreateMode.value) {
    if (propertyId) {
      const idx = pendingProperties.value.findIndex((p) => p.tempId === propertyId)
      if (idx !== -1) pendingProperties.value[idx] = payload
    } else {
      pendingProperties.value.push(payload)
    }
  } else {
    const list = editModeProperties.value
    const hasId = (p: CategoryProperty | PendingProperty): p is CategoryProperty =>
      'id' in p && !!p.id
    if (propertyId) {
      const idx = list.findIndex((p) => getPropertyKey(p) === propertyId)
      if (idx !== -1) {
        const existing = list[idx]
        list[idx] = hasId(existing)
          ? {
              id: existing.id,
              name: payload.name,
              type: payload.type,
              isRequired: payload.isRequired,
              sortOrder: payload.sortOrder,
              enumValues: payload.enumValues,
              numberArrayMaxLength: payload.numberArrayMaxLength,
              minValue: payload.minValue,
              maxValue: payload.maxValue,
            }
          : { ...payload, tempId: (existing as PendingProperty).tempId }
      }
    } else {
      list.push(payload)
    }
  }
  showAddProperty.value = false
  editingPropertyId.value = null
}

function handlePropertyDelete(propertyId: string) {
  if (isCreateMode.value) {
    pendingProperties.value = pendingProperties.value.filter((p) => p.tempId !== propertyId)
  } else {
    editModeProperties.value = editModeProperties.value.filter(
      (p) => getPropertyKey(p) !== propertyId
    )
  }
  editingPropertyId.value = null
}

function handleClose(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="flex h-full max-h-full flex-col sm:max-w-lg px-4 sm:px-6">
      <SheetHeader class="flex-shrink-0">
        <SheetTitle>{{ isCreateMode ? t('inventory.createCategory') : t('inventory.editCategory') }}</SheetTitle>
        <SheetDescription>
          {{ isCreateMode ? t('inventory.categoryName') : category?.name }}
        </SheetDescription>
      </SheetHeader>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-6 px-1">
        <div class="space-y-2">
          <Label>{{ t('inventory.categoryName') }} *</Label>
          <Input v-model="name" />
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.parentCategory') }}</Label>
          <Select v-model="parentId">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('inventory.noParentCategory')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{{ t('inventory.noParentCategory') }}</SelectItem>
              <SelectItem
                v-for="cat in parentCategoryOptions"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.sortOrder') }}</Label>
          <Input v-model.number="sortOrder" type="number" min="0" />
        </div>

        <div class="pt-2">
          <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
            <Settings2 class="h-4 w-4" />
            {{ t('inventory.categoryProperties') }}
          </h4>
          <p v-if="isCreateMode" class="text-xs text-muted-foreground mb-4">
            {{ t('inventory.categoryPropertiesCreateHint') }}
          </p>
          <div class="flex items-center justify-between mb-4">
            <span class="sr-only">{{ t('inventory.addProperty') }}</span>
            <Button
              variant="outline"
              size="sm"
              class="ml-auto"
              @click="showAddProperty = true"
              :aria-label="t('inventory.addProperty')"
            >
              <Plus class="h-4 w-4 mr-2" />
              {{ t('inventory.addProperty') }}
            </Button>
          </div>

          <div v-if="properties.length === 0 && !showAddProperty" class="text-center py-4">
            <p class="text-sm text-muted-foreground">{{ t('common.noData') }}</p>
          </div>

          <div class="space-y-3">
            <div
              v-for="prop in properties"
              :key="getPropertyKey(prop)"
              class="border border-border rounded-md p-3"
            >
              <template v-if="editingPropertyId === getPropertyKey(prop)">
                <CategoryPropertyEditor
                  :property="prop"
                  @save="(data) => handlePropertySaved(data, getPropertyKey(prop))"
                  @cancel="editingPropertyId = null"
                />
              </template>
              <template v-else>
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm">{{ prop.name }}</span>
                      <span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {{ t(`inventory.propertyTypes.${prop.type}`) }}
                      </span>
                      <span
                        v-if="prop.isRequired"
                        class="text-xs text-amber-600 dark:text-amber-400"
                      >
                        {{ t('inventory.required') }}
                      </span>
                    </div>
                    <div v-if="prop.enumValues?.length" class="mt-1 flex flex-wrap gap-1">
                      <span
                        v-for="val in prop.enumValues"
                        :key="val"
                        class="text-xs bg-muted px-1.5 py-0.5 rounded"
                      >
                        {{ val }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 w-7 p-0"
                      @click="editingPropertyId = getPropertyKey(prop)"
                      :aria-label="t('inventory.editProperty')"
                    >
                      <Edit class="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 w-7 p-0"
                      @click="handlePropertyDelete(getPropertyKey(prop))"
                      :aria-label="t('inventory.deleteProperty')"
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </template>
            </div>

            <div v-if="showAddProperty" class="border border-border rounded-md p-3">
              <CategoryPropertyEditor
                @save="(data) => handlePropertySaved(data)"
                @cancel="showAddProperty = false"
              />
            </div>
          </div>
        </div>

        <Separator class="my-8" />

        <div class="space-y-2">
          <Label>{{ t('inventory.categoryPhoto') }}</Label>
          <div v-if="currentPhotoUrl" class="relative w-32 h-32">
            <img
              :src="currentPhotoUrl"
              alt=""
              class="w-32 h-32 rounded-md object-cover border border-border"
            />
            <Button
              variant="outline"
              size="sm"
              class="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
              @click="removePhoto"
              :aria-label="t('common.delete')"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
          <label
            v-else
            class="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <ImagePlus class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">{{ t('inventory.uploadPhoto') }}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handlePhotoChange"
            />
          </label>
        </div>
      </div>

      <div class="trac-sheet-actions flex-shrink-0 border-t bg-background pt-4 -mx-4 px-4 pb-2 mt-4">
        <Button variant="outline" class="trac-sheet-btn" @click="handleClose(false)" :disabled="isSaving">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button
          class="trac-sheet-btn"
          @click="handleSave"
          :disabled="!name.trim() || isSaving"
        >
          <Save class="h-4 w-4 mr-2" />
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>

</template>
