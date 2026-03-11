<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Loader2, Save, Trash2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
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

interface EquipmentStatus {
  id: string
  name: string
  color: string | null
}

interface PropertyValue {
  propertyDefinitionId: string
  value: any
}

interface Equipment {
  id: string
  categoryId: string
  category: { id: string; name: string; parent?: { id: string; name: string; parent?: any }; photoPath?: string }
  statusId: string
  status: { id: string; name: string; color?: string }
  ownerType: 'operator' | 'branch'
  label?: string
  note?: string
  isVisible: boolean
  photos: Array<{ id: string; filePath: string; sortOrder: number }>
  propertyValues: Array<{ id: string; propertyDefinitionId: string; propertyDefinition: { id: string; name: string; type: string }; value: any }>
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
  deleted: []
}>()

const { t } = useI18n()

const equipment = ref<Equipment | null>(null)
const statuses = ref<EquipmentStatus[]>([])
const effectiveProperties = ref<PropertyDefinition[]>([])
const isLoading = ref(false)

const statusId = ref<string | undefined>(undefined)
const label = ref('')
const note = ref('')
const isVisible = ref(true)
const propertyValues = ref<PropertyValue[]>([])
const isSaving = ref(false)

const showDeleteDialog = ref(false)
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

async function fetchEquipment() {
  if (!props.equipmentId) return
  isLoading.value = true
  try {
    equipment.value = await api.get<Equipment>(`/equipment/${props.equipmentId}`)
    statusId.value = equipment.value.statusId
    label.value = equipment.value.label || ''
    note.value = equipment.value.note || ''
    isVisible.value = equipment.value.isVisible
    propertyValues.value = equipment.value.propertyValues.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinitionId,
      value: pv.value,
    }))

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
      isVisible: isVisible.value,
      propertyValues: propertyValues.value.filter((pv) => pv.value != null),
    }

    await api.patch(`/equipment/${props.equipmentId}`, payload)
    toast.success(t('inventory.equipmentUpdated'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete() {
  if (!props.equipmentId || isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/equipment/${props.equipmentId}`)
    toast.success(t('inventory.equipmentDeleted'))
    showDeleteDialog.value = false
    emit('deleted')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

function handleClose(value: boolean) {
  if (!value) {
    equipment.value = null
    effectiveProperties.value = []
  }
  emit('update:open', value)
}

watch(
  () => [props.open, props.equipmentId] as const,
  ([open, id]) => {
    if (open && id) {
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
          <div class="space-y-2">
            <Label class="text-xs text-muted-foreground">{{ t('inventory.category') }}</Label>
            <p class="font-medium text-sm">{{ buildCategoryPath(equipment.category) }}</p>
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
        </div>

        <div class="trac-sheet-actions">
          <Button
            variant="outline"
            class="trac-btn-destructive-outlined mr-auto"
            @click="showDeleteDialog = true"
            :disabled="isSaving"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ t('common.delete') }}
          </Button>
          <Button variant="outline" class="trac-sheet-btn" @click="handleClose(false)" :disabled="isSaving">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
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

  <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('inventory.deleteEquipment') }}</DialogTitle>
        <DialogDescription>
          {{ equipment?.label || equipment?.category?.name }}
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
</template>
