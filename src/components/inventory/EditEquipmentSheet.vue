<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Loader2, Plus, Save, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CategoryTreeSelect from '@/components/inventory/CategoryTreeSelect.vue'
import DynamicPropertyFields from '@/components/inventory/DynamicPropertyFields.vue'
import EquipmentRelationsPanel from '@/components/inventory/EquipmentRelationsPanel.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getUploadedFileUrl } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { readFileAsDataUrl } from '@/lib/utils'

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
}

interface PropertyValue {
  propertyDefinitionId: string
  value: any
}

interface EquipmentPhoto {
  id: string
  filePath: string
  sortOrder: number
}

interface RelatedEquipment {
  id: string
  label?: string
  category?: { id: string; name: string; parent?: { name: string } }
  status?: { id: string; name: string; color?: string }
}

interface Equipment {
  id: string
  categoryId: string
  category: { id: string; name: string; parent?: { id: string; name: string; parent?: any }; photoPath?: string }
  statusId: string
  status: { id: string; name: string; color?: string }
  ownerType: 'operator' | 'branch'
  operatorId?: string | null
  branchId?: string | null
  label?: string
  note?: string
  isVisible: boolean
  quantity: number
  photos: EquipmentPhoto[]
  propertyValues: Array<{ id: string; propertyDefinitionId: string; propertyDefinition: { id: string; name: string; type: string }; value: any }>
  relationsAsSource?: Array<{ id: string; targetEquipment: RelatedEquipment; type: string }>
  relationsAsTarget?: Array<{ id: string; sourceEquipment: RelatedEquipment; type: string }>
  createdAt: string
}

interface Props {
  open: boolean
  equipmentId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: []
}>()

const { t } = useI18n()

const equipment = ref<Equipment | null>(null)
const categories = ref<EquipmentCategory[]>([])
const statuses = ref<EquipmentStatus[]>([])
const effectiveProperties = ref<PropertyDefinition[]>([])
const isLoading = ref(false)

const categoryId = ref<string>('')
const statusId = ref<string | undefined>(undefined)
const label = ref('')
const note = ref('')
const quantity = ref(1)
const isVisible = ref(true)
const propertyValues = ref<PropertyValue[]>([])
const existingPhotos = ref<EquipmentPhoto[]>([])
const photoFiles = ref<File[]>([])
const photoPreviewUrls = ref<string[]>([])
const isSaving = ref(false)

const RELATION_NONE = 'none'
const relationSelection = ref<Record<string, string>>({})

async function fetchCategories() {
  try {
    categories.value = await api.get<EquipmentCategory[]>('/equipment-categories')
  } catch {
    categories.value = []
  }
}

function updatePropertyValues(v: PropertyValue[]) {
  propertyValues.value = v
}

async function handlePhotoChange(event: Event) {
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

  const total = existingPhotos.value.length + photoFiles.value.length + newFiles.length
  if (total > 5) {
    toast.error(t('inventory.maxPhotosReached'))
    const toAdd = 5 - existingPhotos.value.length - photoFiles.value.length
    if (toAdd > 0) {
      photoFiles.value = [...photoFiles.value, ...newFiles].slice(0, photoFiles.value.length + toAdd)
      await rebuildPreviewUrls()
    }
  } else {
    photoFiles.value = [...photoFiles.value, ...newFiles]
    await rebuildPreviewUrls()
  }
  input.value = ''
}

async function rebuildPreviewUrls() {
  photoPreviewUrls.value = await Promise.all(photoFiles.value.map(readFileAsDataUrl))
}

function removeNewPhoto(index: number) {
  photoFiles.value = photoFiles.value.filter((_, i) => i !== index)
  photoPreviewUrls.value = photoPreviewUrls.value.filter((_, i) => i !== index)
}

async function removeExistingPhoto(photoId: string) {
  if (!props.equipmentId) return
  try {
    await api.delete(`/equipment/${props.equipmentId}/photos/${photoId}`)
    existingPhotos.value = existingPhotos.value.filter((p) => p.id !== photoId)
    if (equipment.value) {
      equipment.value.photos = equipment.value.photos.filter((p) => p.id !== photoId)
    }
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  }
}

async function fetchEquipment() {
  if (!props.equipmentId) return
  isLoading.value = true
  try {
    equipment.value = await api.get<Equipment>(`/equipment/${props.equipmentId}`)
    categoryId.value = equipment.value.categoryId
    statusId.value = equipment.value.statusId
    label.value = equipment.value.label || ''
    note.value = equipment.value.note || ''
    quantity.value = equipment.value.quantity ?? 1
    isVisible.value = equipment.value.isVisible
    propertyValues.value = equipment.value.propertyValues.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinitionId,
      value: pv.value,
    }))
    existingPhotos.value = [...(equipment.value.photos || [])]
    photoFiles.value = []
    photoPreviewUrls.value = []

    relationSelection.value = buildRelationSelection(equipment.value)

    await fetchEffectiveProperties(equipment.value.categoryId)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    emit('update:open', false)
  } finally {
    isLoading.value = false
  }
}

async function fetchStatuses() {
  try {
    statuses.value = await api.get<EquipmentStatus[]>('/equipment-statuses')
  } catch {
    statuses.value = []
  }
}

function buildRelationSelection(eq: Equipment): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of eq.relationsAsSource || []) {
    if (r.targetEquipment?.id) map[r.targetEquipment.id] = r.type
  }
  for (const r of eq.relationsAsTarget || []) {
    if (r.sourceEquipment?.id) map[r.sourceEquipment.id] = r.type
  }
  return map
}

async function applyRelationChanges() {
  if (!equipment.value?.id) return
  const current = new Map<string, { relationId: string; type: string }>()
  for (const r of equipment.value.relationsAsSource || []) {
    if (r.targetEquipment?.id) current.set(r.targetEquipment.id, { relationId: r.id, type: r.type })
  }
  for (const r of equipment.value.relationsAsTarget || []) {
    if (r.sourceEquipment?.id) current.set(r.sourceEquipment.id, { relationId: r.id, type: r.type })
  }
  const desired = relationSelection.value

  for (const [otherId, entry] of current) {
    const want = desired[otherId] ?? RELATION_NONE
    if (want === RELATION_NONE || want !== entry.type) {
      try {
        await api.delete(`/equipment/${equipment.value.id}/relations/${entry.relationId}`)
      } catch (e) {
        const err = e as ApiError
        toast.error(translateError(err.message))
      }
    }
  }
  for (const [otherId, type] of Object.entries(desired)) {
    if (!type || type === RELATION_NONE) continue
    const cur = current.get(otherId)
    if (cur?.type === type) continue
    try {
      await api.post(`/equipment/${equipment.value.id}/relations`, {
        targetEquipmentId: otherId,
        type,
      })
    } catch (e) {
      const err = e as ApiError
      toast.error(translateError(err.message))
    }
  }
}

async function fetchEffectiveProperties(catId: string) {
  try {
    const category = await api.get<{ effectiveProperties?: PropertyDefinition[] }>(
      `/equipment-categories/${catId}`,
    )
    effectiveProperties.value = category.effectiveProperties || []
  } catch {
    effectiveProperties.value = []
  }
}

async function handleSave() {
  if (!props.equipmentId || !statusId.value || isSaving.value) return

  isSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      statusId: statusId.value,
      label: label.value.trim() || null,
      note: note.value.trim() || null,
      quantity: quantity.value,
      isVisible: isVisible.value,
      propertyValues: propertyValues.value.filter((pv) => pv.value != null),
    }

    await api.patch(`/equipment/${props.equipmentId}`, payload)

    if (photoFiles.value.length > 0) {
      const formData = new FormData()
      for (const file of photoFiles.value) {
        formData.append('photos', file)
      }
      await api.post(`/equipment/${props.equipmentId}/photos`, formData)
    }

    await applyRelationChanges()

    await fetchEquipment()
    toast.success(t('inventory.equipmentUpdated'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

function handleClose(value: boolean) {
  if (!value) {
    equipment.value = null
    effectiveProperties.value = []
    relationSelection.value = {}
    photoFiles.value = []
    photoPreviewUrls.value = []
  }
  emit('update:open', value)
}

watch(
  () => [props.open, props.equipmentId] as const,
  ([open, id]) => {
    if (open && id) {
      fetchCategories()
      fetchStatuses()
      fetchEquipment()
    }
  },
  { immediate: true },
)
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('inventory.editEquipment') }}</SheetTitle>
        <SheetDescription>{{ t('inventory.equipment') }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
      </div>

      <template v-else-if="equipment">
        <div class="space-y-4 py-4 px-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>{{ t('inventory.category') }} *</Label>
              <CategoryTreeSelect
                v-model="categoryId"
                :categories="categories"
                :disabled="true"
              />
            </div>
            <div class="space-y-2">
              <Label>{{ t('inventory.status') }} *</Label>
              <Select v-model="statusId">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="" />
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
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <label class="flex items-center gap-2 cursor-pointer shrink-0 pb-2 sm:pb-0">
              <input type="checkbox" v-model="isVisible" class="h-4 w-4 rounded border-input" />
              <span class="text-sm">{{ t('inventory.showOnMyProfile') }}</span>
            </label>
            <div class="space-y-2">
              <Label>{{ t('inventory.quantity') }}</Label>
              <Input v-model.number="quantity" type="number" min="1" />
            </div>
          </div>

          <div class="space-y-2">
            <Label>{{ t('inventory.equipmentLabel') }}</Label>
            <Input v-model="label" :maxlength="100" />
          </div>

          <div class="space-y-2">
            <Label>{{ t('inventory.equipmentNote') }}</Label>
            <Textarea v-model="note" rows="3" :maxlength="1000" />
          </div>

          <template v-if="effectiveProperties.length > 0">
            <Separator class="my-4" />
            <div class="space-y-2">
              <Label class="text-sm font-medium text-muted-foreground">{{ t('inventory.properties') }}</Label>
              <DynamicPropertyFields
                :properties="effectiveProperties"
                :model-value="propertyValues"
                @update:model-value="updatePropertyValues"
              />
            </div>
          </template>

          <Separator class="my-4" />

          <div class="space-y-2">
            <Label>{{ t('inventory.photos') }}</Label>
            <p class="text-xs text-muted-foreground">{{ t('inventory.maxPhotosCount', { count: 5 }) }}</p>

            <div v-if="existingPhotos.length > 0 || photoFiles.length > 0" class="flex flex-wrap gap-2">
              <template v-for="(photo, idx) in existingPhotos" :key="photo.id">
                <div class="relative w-20 h-20">
                  <img
                    :src="getUploadedFileUrl(photo.filePath)"
                    alt=""
                    class="w-20 h-20 rounded-md object-cover border border-border"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    class="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
                    type="button"
                    @click="removeExistingPhoto(photo.id)"
                    :aria-label="t('common.delete')"
                  >
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              </template>
              <div
                v-for="(_, idx) in photoFiles"
                :key="'new-' + idx"
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
                  @click="removeNewPhoto(idx)"
                  :aria-label="t('common.delete')"
                >
                  <X class="h-3 w-3" />
                </Button>
              </div>
            </div>

            <label
              v-if="existingPhotos.length + photoFiles.length < 5"
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

          <Separator class="my-4" />
          <div class="space-y-2">
            <EquipmentRelationsPanel
              v-if="equipment.id"
              :equipment-id="equipment.id"
              :owner-type="equipment.ownerType"
              :owner-id="(equipment.ownerType === 'operator' ? equipment.operatorId : equipment.branchId) || ''"
              :relations-as-source="equipment.relationsAsSource || []"
              :relations-as-target="equipment.relationsAsTarget || []"
              :can-edit="true"
              :defer-save="true"
              :relation-draft="relationSelection"
              @update:relation-draft="relationSelection = $event"
              @updated="fetchEquipment"
            />
          </div>
        </div>

        <div class="trac-sheet-actions">
          <Button variant="outline" class="trac-sheet-btn" @click="handleClose(false)" :disabled="isSaving">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            class="trac-sheet-btn"
            @click="handleSave"
            :disabled="!statusId || isSaving"
          >
            <Save class="h-4 w-4 mr-2" />
            {{ isSaving ? t('common.saving') : t('common.save') }}
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
