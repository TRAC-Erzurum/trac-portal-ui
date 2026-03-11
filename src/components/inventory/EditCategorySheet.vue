<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Plus, Save, Settings2, X } from 'lucide-vue-next'
import CategoryPropertyEditor from '@/components/inventory/CategoryPropertyEditor.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

const props = defineProps<{
  open: boolean
  category: Category
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: []
}>()

const { t } = useI18n()

const name = ref('')
const sortOrder = ref(0)
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const isSaving = ref(false)
const showAddProperty = ref(false)
const editingPropertyId = ref<string | null>(null)

const API_BASE = import.meta.env.VITE_API_URL

const currentPhotoUrl = computed(() => {
  if (photoPreview.value) return photoPreview.value
  if (props.category.photoPath) return `${API_BASE}${props.category.photoPath}`
  return null
})

const properties = computed(() => {
  return [...(props.category.propertyDefinitions || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )
})

function initForm() {
  name.value = props.category.name
  sortOrder.value = props.category.sortOrder
  photoFile.value = null
  photoPreview.value = null
  showAddProperty.value = false
  editingPropertyId.value = null
}

watch(() => props.open, (val) => {
  if (val) initForm()
})

watch(() => props.category, () => {
  if (props.open) initForm()
}, { deep: true })

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('error.invalidFileType'))
    return
  }

  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}

function removePhoto() {
  photoFile.value = null
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = null
  }
}

async function handleSave() {
  if (!name.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    await api.patch(`/equipment-categories/${props.category.id}`, {
      name: name.value.trim(),
      sortOrder: sortOrder.value,
    })

    if (photoFile.value) {
      const formData = new FormData()
      formData.append('file', photoFile.value)
      await api.post(`/equipment-categories/${props.category.id}/upload`, formData)
    }

    toast.success(t('inventory.categoryUpdated'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

async function handlePropertySaved(propertyData: Record<string, unknown>, propertyId?: string) {
  try {
    if (propertyId) {
      await api.patch(
        `/equipment-categories/${props.category.id}/properties/${propertyId}`,
        propertyData
      )
      toast.success(t('inventory.propertyUpdated'))
    } else {
      await api.post(
        `/equipment-categories/${props.category.id}/properties`,
        propertyData
      )
      toast.success(t('inventory.propertyCreated'))
    }
    showAddProperty.value = false
    editingPropertyId.value = null
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  }
}

async function handlePropertyDelete(propertyId: string) {
  try {
    await api.delete(
      `/equipment-categories/${props.category.id}/properties/${propertyId}`
    )
    toast.success(t('inventory.propertyDeleted'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  }
}

function handleClose(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-lg overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('inventory.editCategory') }}</SheetTitle>
        <SheetDescription>{{ category.name }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-4 py-4 px-1">
        <div class="space-y-2">
          <Label>{{ t('inventory.categoryName') }} *</Label>
          <Input v-model="name" :placeholder="t('inventory.categoryName')" />
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.sortOrder') }}</Label>
          <Input v-model.number="sortOrder" type="number" min="0" />
        </div>

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

        <Separator class="my-8" />

        <div>
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings2 class="h-4 w-4" />
              {{ t('inventory.categoryProperties') }}
            </h4>
            <Button
              variant="outline"
              size="sm"
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
              :key="prop.id"
              class="border border-border rounded-md p-3"
            >
              <template v-if="editingPropertyId === prop.id">
                <CategoryPropertyEditor
                  :property="prop"
                  @save="(data) => handlePropertySaved(data, prop.id)"
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
                      @click="editingPropertyId = prop.id"
                      :aria-label="t('inventory.editProperty')"
                    >
                      <Edit class="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-7 w-7 p-0"
                      @click="handlePropertyDelete(prop.id)"
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
      </div>

      <div class="trac-sheet-actions">
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
