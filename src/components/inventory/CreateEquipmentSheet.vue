<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Save, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import CategoryTreeSelect from '@/components/inventory/CategoryTreeSelect.vue'
import DynamicPropertyFields from '@/components/inventory/DynamicPropertyFields.vue'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

type PropertyType = 'enum' | 'number' | 'number_array' | 'string' | 'boolean' | 'date'

interface PropertyDefinition {
  id: string
  categoryId: string
  name: string
  type: PropertyType
  isRequired: boolean
  sortOrder: number
  enumValues?: string[] | null
  numberArrayMaxLength?: number | null
  minValue?: number | null
  maxValue?: number | null
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
  isDefault: boolean
}

interface PropertyValue {
  propertyDefinitionId: string
  value: any
}

interface Props {
  open: boolean
  ownerType: 'operator' | 'branch'
  operatorId?: string
  branchId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { t } = useI18n()

const categories = ref<EquipmentCategory[]>([])
const statuses = ref<EquipmentStatus[]>([])
const effectiveProperties = ref<PropertyDefinition[]>([])
const isLoadingProperties = ref(false)

const categoryId = ref<string | undefined>(undefined)
const statusId = ref<string | undefined>(undefined)
const label = ref('')
const note = ref('')
const isVisible = ref(true)
const propertyValues = ref<PropertyValue[]>([])
const photoFiles = ref<File[]>([])
const photoPreviewUrls = ref<string[]>([])
const isSaving = ref(false)

async function fetchCategories() {
  try {
    categories.value = await api.get<EquipmentCategory[]>('/equipment-categories')
  } catch {
    categories.value = []
  }
}

async function fetchStatuses() {
  try {
    const list = await api.get<EquipmentStatus[]>('/equipment-statuses')
    statuses.value = list
    const defaultStatus = list.find((s) => s.isDefault)
    if (defaultStatus && !statusId.value) {
      statusId.value = defaultStatus.id
    }
  } catch {
    statuses.value = []
  }
}

async function fetchEffectiveProperties(catId: string) {
  isLoadingProperties.value = true
  try {
    const category = await api.get<{ effectiveProperties?: PropertyDefinition[] }>(
      `/equipment-categories/${catId}`,
    )
    effectiveProperties.value = category.effectiveProperties || []
  } catch {
    effectiveProperties.value = []
  } finally {
    isLoadingProperties.value = false
  }
}

watch(categoryId, (newId) => {
  propertyValues.value = []
  if (newId) {
    fetchEffectiveProperties(newId)
  } else {
    effectiveProperties.value = []
  }
})

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const newFiles: File[] = []

  for (const file of Array.from(files)) {
    if (!validTypes.includes(file.type)) {
      toast.error(t('error.invalidFileType'))
      continue
    }
    newFiles.push(file)
  }

  const total = photoFiles.value.length + newFiles.length
  if (total > 5) {
    toast.error(t('inventory.maxPhotosReached'))
    const combined = [...photoFiles.value, ...newFiles].slice(0, 5)
    photoFiles.value = combined
  } else {
    photoFiles.value = [...photoFiles.value, ...newFiles]
  }

  rebuildPreviewUrls()
  input.value = ''
}

function rebuildPreviewUrls() {
  photoPreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  photoPreviewUrls.value = photoFiles.value.map((file) => URL.createObjectURL(file))
}

function removePhoto(index: number) {
  if (photoPreviewUrls.value[index]) {
    URL.revokeObjectURL(photoPreviewUrls.value[index])
  }
  photoFiles.value = photoFiles.value.filter((_, i) => i !== index)
  photoPreviewUrls.value = photoPreviewUrls.value.filter((_, i) => i !== index)
}

async function handleSave() {
  if (!categoryId.value || !statusId.value || isSaving.value) return

  isSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      categoryId: categoryId.value,
      statusId: statusId.value,
      ownerType: props.ownerType,
      label: label.value.trim() || undefined,
      note: note.value.trim() || undefined,
      isVisible: isVisible.value,
      propertyValues: propertyValues.value.filter((pv) => pv.value != null),
    }

    if (props.ownerType === 'operator' && props.operatorId) {
      payload.operatorId = props.operatorId
    }
    if (props.ownerType === 'branch' && props.branchId) {
      payload.branchId = props.branchId
    }

    const created = await api.post<{ id: string }>('/equipment', payload)

    if (photoFiles.value.length > 0 && created.id) {
      const formData = new FormData()
      for (const file of photoFiles.value) {
        formData.append('photos', file)
      }
      await api.post(`/equipment/${created.id}/photos`, formData)
    }

    toast.success(t('inventory.equipmentCreated'))
    resetForm()
    emit('created')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  categoryId.value = undefined
  statusId.value = statuses.value.find((s) => s.isDefault)?.id
  label.value = ''
  note.value = ''
  isVisible.value = true
  propertyValues.value = []
  effectiveProperties.value = []
  photoPreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  photoFiles.value = []
  photoPreviewUrls.value = []
}

onBeforeUnmount(() => {
  photoPreviewUrls.value.forEach((url) => URL.revokeObjectURL(url))
})

function handleClose(value: boolean) {
  if (!value) resetForm()
  emit('update:open', value)
}

watch(() => props.open, (val) => {
  if (val) {
    resetForm()
    fetchCategories()
    fetchStatuses()
  }
})

onMounted(() => {
  fetchCategories()
  fetchStatuses()
})
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('inventory.addEquipment') }}</SheetTitle>
        <SheetDescription>{{ t('inventory.equipment') }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-4 py-4 px-1">
        <div class="space-y-2">
          <Label>{{ t('inventory.category') }} *</Label>
          <CategoryTreeSelect
            v-model="categoryId"
            :categories="categories"
            :leaf-only="true"
          />
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.status') }} *</Label>
          <Select v-model="statusId">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('common.select')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in statuses" :key="s.id" :value="s.id">
                <div class="flex items-center gap-2">
                  <span
                    class="h-2 w-2 rounded-full inline-block"
                    :style="{ backgroundColor: s.color || '#6b7280' }"
                  />
                  {{ s.name }}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.equipmentLabel') }}</Label>
          <Input
            v-model="label"
            :placeholder="t('inventory.equipmentLabel')"
          />
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.equipmentNote') }}</Label>
          <Textarea
            v-model="note"
            :placeholder="t('inventory.equipmentNote')"
            rows="3"
          />
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="isVisible" class="h-4 w-4 rounded border-input" />
          <span class="text-sm">{{ t('inventory.visible') }}</span>
        </label>

        <template v-if="effectiveProperties.length > 0">
          <Separator class="my-4" />
          <div class="space-y-2">
            <Label class="text-sm font-medium text-muted-foreground">{{ t('inventory.properties') }}</Label>
            <DynamicPropertyFields
              :properties="effectiveProperties"
              v-model="propertyValues"
            />
          </div>
        </template>

        <Separator class="my-4" />

        <div class="space-y-2">
          <Label>{{ t('inventory.photos') }}</Label>
          <p class="text-xs text-muted-foreground">{{ t('inventory.maxPhotosCount', { count: 5 }) }}</p>

          <div v-if="photoFiles.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="(file, idx) in photoFiles"
              :key="idx"
              class="relative w-20 h-20"
            >
              <img
                :src="photoPreviewUrls[idx]"
                alt=""
                class="w-20 h-20 rounded-md object-cover border border-border"
              />
              <Button
                variant="outline"
                size="sm"
                class="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
                type="button"
                @click="removePhoto(idx)"
                :aria-label="t('common.delete')"
              >
                <X class="h-3 w-3" />
              </Button>
            </div>
          </div>

          <label
            v-if="photoFiles.length < 5"
            class="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <ImagePlus class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">{{ t('inventory.uploadPhoto') }}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              class="hidden"
              @change="handlePhotoChange"
            />
          </label>
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
          :disabled="!categoryId || !statusId || isSaving"
        >
          <Save class="h-4 w-4 mr-2" />
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
