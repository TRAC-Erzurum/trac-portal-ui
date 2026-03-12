<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Link2, Loader2, Save, Search, X } from 'lucide-vue-next'
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
  isDefault: boolean
}

interface OwnerEquipmentItem {
  id: string
  label?: string
  category?: { id: string; name: string; parent?: { name: string } }
  status?: { id: string; name: string; color?: string }
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
const quantity = ref(1)
const isVisible = ref(true)
const propertyValues = ref<PropertyValue[]>([])
const photoFiles = ref<File[]>([])
const photoPreviewUrls = ref<string[]>([])
const isSaving = ref(false)

const RELATION_TYPES = ['accessory', 'part', 'mounted', 'used_together'] as const
const RELATION_NONE = 'none'

const ownerEquipment = ref<OwnerEquipmentItem[]>([])
const isLoadingOwnerEquipment = ref(false)
const relationSearchQuery = ref('')
const relationSelection = ref<Record<string, string>>({})

const filteredOwnerEquipment = computed(() => {
  const list = ownerEquipment.value
  if (!relationSearchQuery.value.trim()) return list
  const q = relationSearchQuery.value.toLowerCase()
  return list.filter((eq) => {
    const lbl = (eq.label || '').toLowerCase()
    const catName = (eq.category?.name || '').toLowerCase()
    return lbl.includes(q) || catName.includes(q)
  })
})

const pendingRelationsForSubmit = computed(() =>
  Object.entries(relationSelection.value)
    .filter(
      ([, type]) => type && type !== RELATION_NONE && RELATION_TYPES.includes(type as (typeof RELATION_TYPES)[number]),
    )
    .map(([targetEquipmentId, type]) => ({ targetEquipmentId, type })),
)

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

async function fetchOwnerEquipment() {
  const ownerId =
    props.ownerType === 'operator' ? props.operatorId : props.ownerType === 'branch' ? props.branchId : null
  if (!ownerId) {
    ownerEquipment.value = []
    return
  }
  isLoadingOwnerEquipment.value = true
  try {
    const endpoint =
      props.ownerType === 'operator'
        ? `/equipment/operator/${ownerId}?pageSize=100`
        : `/equipment/branch/${ownerId}?pageSize=100`
    const res = await api.get<{ data: OwnerEquipmentItem[]; total: number }>(endpoint)
    ownerEquipment.value = res.data || []
  } catch {
    ownerEquipment.value = []
  } finally {
    isLoadingOwnerEquipment.value = false
  }
}

function equipmentDisplayName(eq: OwnerEquipmentItem): string {
  return eq.label || eq.category?.name || '—'
}

function equipmentCategoryPath(eq: OwnerEquipmentItem): string {
  if (!eq.category) return ''
  if (eq.category.parent?.name) return `${eq.category.parent.name} > ${eq.category.name}`
  return eq.category.name
}

function getRelationSelectionValue(equipmentId: string): string {
  return relationSelection.value[equipmentId] ?? RELATION_NONE
}

function setRelationSelection(equipmentId: string, value: string) {
  if (value === RELATION_NONE) {
    const next = { ...relationSelection.value }
    delete next[equipmentId]
    relationSelection.value = next
  } else {
    relationSelection.value = { ...relationSelection.value, [equipmentId]: value }
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

  const total = photoFiles.value.length + newFiles.length
  if (total > 5) {
    toast.error(t('inventory.maxPhotosReached'))
    const combined = [...photoFiles.value, ...newFiles].slice(0, 5)
    photoFiles.value = combined
  } else {
    photoFiles.value = [...photoFiles.value, ...newFiles]
  }

  await rebuildPreviewUrls()
  input.value = ''
}

async function rebuildPreviewUrls() {
  photoPreviewUrls.value = await Promise.all(photoFiles.value.map(readFileAsDataUrl))
}

function removePhoto(index: number) {
  photoFiles.value = photoFiles.value.filter((_, i) => i !== index)
  photoPreviewUrls.value = photoPreviewUrls.value.filter((_, i) => i !== index)
}

function updatePropertyValues(v: PropertyValue[]) {
  propertyValues.value = v
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
      quantity: quantity.value,
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

    for (const rel of pendingRelationsForSubmit.value) {
      try {
        await api.post(`/equipment/${created.id}/relations`, {
          targetEquipmentId: rel.targetEquipmentId,
          type: rel.type,
        })
      } catch (e) {
        const err = e as ApiError
        toast.error(translateError(err.message))
      }
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
  quantity.value = 1
  isVisible.value = true
  propertyValues.value = []
  effectiveProperties.value = []
  photoFiles.value = []
  photoPreviewUrls.value = []
  relationSelection.value = {}
  relationSearchQuery.value = ''
}

function handleClose(value: boolean) {
  if (!value) resetForm()
  emit('update:open', value)
}

watch(() => props.open, (val) => {
  if (val) {
    resetForm()
    fetchCategories()
    fetchStatuses()
    fetchOwnerEquipment()
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>{{ t('inventory.category') }} *</Label>
            <CategoryTreeSelect
              v-model="categoryId"
              :categories="categories"
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

        <Separator class="my-4" />
        <div>
          <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
            <Link2 class="h-4 w-4" />
            {{ t('inventory.relatedEquipment') }}
          </h4>

          <div class="relative mb-3">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="relationSearchQuery"
              :placeholder="t('inventory.searchEquipment')"
              class="pl-9 w-full sm:flex-1 sm:max-w-xs"
            />
          </div>

          <div
            v-if="isLoadingOwnerEquipment"
            class="flex items-center justify-center py-6"
          >
            <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
          </div>

          <div v-else-if="filteredOwnerEquipment.length" class="space-y-1">
            <div
              v-for="eq in filteredOwnerEquipment"
              :key="eq.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors"
            >
              <span
                v-if="eq.status?.color"
                class="h-2.5 w-2.5 rounded-full shrink-0"
                :style="{ backgroundColor: eq.status.color }"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ equipmentDisplayName(eq) }}</p>
                <p
                  v-if="equipmentCategoryPath(eq)"
                  class="text-xs text-muted-foreground truncate"
                >
                  {{ equipmentCategoryPath(eq) }}
                </p>
              </div>
              <Select
                :model-value="getRelationSelectionValue(eq.id)"
                @update:model-value="(v) => { if (v != null) setRelationSelection(eq.id, String(v)) }"
              >
                <SelectTrigger class="w-[180px] shrink-0 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="RELATION_NONE">
                    {{ t('inventory.noRelation') }}
                  </SelectItem>
                  <SelectItem
                    v-for="type in RELATION_TYPES"
                    :key="type"
                    :value="type"
                  >
                    {{ t(`inventory.relationType.${type}`) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div v-else-if="!isLoadingOwnerEquipment" class="text-center py-6">
            <Link2 class="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
            <p class="text-sm text-muted-foreground">{{ t('inventory.noRelationsYet') }}</p>
          </div>
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

          <div v-if="photoFiles.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="(_, idx) in photoFiles"
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
          variant="outline"
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
