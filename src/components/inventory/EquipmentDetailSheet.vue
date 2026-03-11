<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Calendar, Eye, EyeOff, Loader2, Pencil, Settings2, Trash2, X } from 'lucide-vue-next'
import EquipmentRelationsPanel from '@/components/inventory/EquipmentRelationsPanel.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface EquipmentPhoto {
  id: string
  filePath: string
  sortOrder: number
}

interface PropertyValue {
  id: string
  propertyDefinitionId: string
  propertyDefinition: { id: string; name: string; type: string }
  value: any
}

interface EquipmentRelation {
  id: string
  targetEquipment: Equipment
  type: string
}

interface EquipmentRelationTarget {
  id: string
  sourceEquipment: Equipment
  type: string
}

interface Equipment {
  id: string
  categoryId: string
  category: { id: string; name: string; parent?: { name: string; parent?: any }; photoPath?: string }
  statusId: string
  status: { id: string; name: string; color?: string }
  ownerType: 'operator' | 'branch'
  operatorId?: string
  operator?: { id: string; callSign: string }
  branchId?: string
  label?: string
  note?: string
  isVisible: boolean
  photos: EquipmentPhoto[]
  propertyValues: PropertyValue[]
  relationsAsSource: EquipmentRelation[]
  relationsAsTarget: EquipmentRelationTarget[]
  createdAt: string
}

interface Props {
  open: boolean
  equipmentId: string | null
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  edit: []
  deleted: []
}>()

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL

const equipment = ref<Equipment | null>(null)
const isLoading = ref(false)
const showDeleteDialog = ref(false)
const isDeleting = ref(false)
const previewPhotoIndex = ref(-1)

const categoryPath = computed(() => {
  if (!equipment.value?.category) return ''
  const parts: string[] = []
  let current: any = equipment.value.category
  while (current) {
    parts.unshift(current.name)
    current = current.parent
  }
  return parts.join(' > ')
})

const sortedProperties = computed(() => {
  if (!equipment.value?.propertyValues) return []
  return [...equipment.value.propertyValues].filter(
    (pv) => pv.value != null && pv.value !== '',
  )
})

const hasRelations = computed(() => {
  if (!equipment.value) return false
  return (
    (equipment.value.relationsAsSource?.length || 0) +
    (equipment.value.relationsAsTarget?.length || 0) > 0
  )
})

const previewPhoto = computed(() => {
  if (previewPhotoIndex.value < 0 || !equipment.value?.photos) return null
  return equipment.value.photos[previewPhotoIndex.value] ?? null
})

function photoUrl(photo: EquipmentPhoto): string {
  return `${API_BASE}/uploads/${photo.filePath}`
}

function formatPropertyValue(value: any, type: string): string {
  if (value == null || value === '') return '—'
  if (type === 'boolean') return value ? '✓' : '—'
  if (type === 'number_array' && Array.isArray(value)) return value.join(' × ')
  if (type === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString()
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatCreatedDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

async function fetchEquipment() {
  if (!props.equipmentId) return
  isLoading.value = true
  try {
    equipment.value = await api.get<Equipment>(`/equipment/${props.equipmentId}`)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    equipment.value = null
  } finally {
    isLoading.value = false
  }
}

async function handleDelete() {
  if (!equipment.value || isDeleting.value) return
  isDeleting.value = true
  try {
    await api.delete(`/equipment/${equipment.value.id}`)
    toast.success(t('inventory.equipmentDeleted'))
    showDeleteDialog.value = false
    emit('update:open', false)
    emit('deleted')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

function handleRelationsUpdated() {
  if (props.equipmentId) fetchEquipment()
}

function handleClose(value: boolean) {
  previewPhotoIndex.value = -1
  emit('update:open', value)
}

watch(
  () => [props.open, props.equipmentId],
  ([open, id]) => {
    if (open && id) {
      equipment.value = null
      fetchEquipment()
    }
  },
  { immediate: true },
)
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <template v-if="isLoading">
        <div class="flex items-center justify-center py-20">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </template>

      <template v-else-if="equipment">
        <SheetHeader>
          <SheetTitle>{{ categoryPath }}</SheetTitle>
          <SheetDescription>
            <span
              class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border"
              :style="{
                borderColor: equipment.status.color || 'var(--border)',
                color: equipment.status.color || 'var(--muted-foreground)',
              }"
            >
              <span
                class="h-2 w-2 rounded-full inline-block"
                :style="{ backgroundColor: equipment.status.color || 'var(--muted-foreground)' }"
              />
              {{ equipment.status.name }}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div class="py-6 px-1 space-y-6">
          <!-- Photos -->
          <div v-if="equipment.photos.length" class="space-y-2">
            <div class="flex gap-2 overflow-x-auto pb-2">
              <button
                v-for="(photo, index) in equipment.photos"
                :key="photo.id"
                type="button"
                class="shrink-0 h-20 w-20 rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer"
                @click="previewPhotoIndex = index"
              >
                <img
                  :src="photoUrl(photo)"
                  alt=""
                  class="h-full w-full object-cover"
                />
              </button>
            </div>
          </div>

          <!-- Info -->
          <div class="space-y-3">
            <div v-if="equipment.label" class="space-y-0.5">
              <p class="text-xs text-muted-foreground">{{ t('inventory.equipmentLabel') }}</p>
              <p class="font-medium">{{ equipment.label }}</p>
            </div>

            <div v-if="equipment.note" class="space-y-0.5">
              <p class="text-xs text-muted-foreground">{{ t('inventory.equipmentNote') }}</p>
              <p class="text-sm">{{ equipment.note }}</p>
            </div>

            <div class="flex items-center gap-4">
              <span
                class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                :class="equipment.isVisible
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'"
              >
                <Eye v-if="equipment.isVisible" class="h-3 w-3" />
                <EyeOff v-else class="h-3 w-3" />
                {{ equipment.isVisible ? t('inventory.visible') : t('inventory.hidden') }}
              </span>

              <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar class="h-3 w-3" />
                {{ formatCreatedDate(equipment.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Properties -->
          <template v-if="sortedProperties.length">
            <Separator class="my-8" />
            <div>
              <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
                <Settings2 class="h-4 w-4" />
                {{ t('inventory.properties') }}
              </h4>
              <div class="space-y-2">
                <div
                  v-for="pv in sortedProperties"
                  :key="pv.id"
                  class="flex items-baseline gap-2 text-sm"
                >
                  <span class="text-muted-foreground shrink-0">{{ pv.propertyDefinition.name }}:</span>
                  <span class="font-medium">{{ formatPropertyValue(pv.value, pv.propertyDefinition.type) }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Relations -->
          <template v-if="hasRelations || canEdit">
            <Separator class="my-8" />
            <EquipmentRelationsPanel
              :equipment-id="equipment.id"
              :owner-type="equipment.ownerType"
              :owner-id="(equipment.ownerType === 'operator' ? equipment.operatorId : equipment.branchId) || ''"
              :relations-as-source="equipment.relationsAsSource"
              :relations-as-target="equipment.relationsAsTarget"
              :can-edit="canEdit"
              @updated="handleRelationsUpdated"
            />
          </template>
        </div>

        <div v-if="canEdit" class="trac-sheet-actions">
          <Button
            variant="outline"
            class="trac-sheet-btn trac-btn-destructive-outlined mr-auto"
            @click="showDeleteDialog = true"
            :aria-label="t('inventory.deleteEquipment')"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ t('common.delete') }}
          </Button>
          <Button
            class="trac-sheet-btn"
            @click="emit('edit')"
          >
            <Pencil class="h-4 w-4 mr-2" />
            {{ t('common.edit') }}
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>

  <!-- Photo Preview Dialog -->
  <Dialog
    :open="previewPhotoIndex >= 0"
    @update:open="(val: boolean) => { if (!val) previewPhotoIndex = -1 }"
  >
    <DialogContent class="sm:max-w-2xl p-2">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ t('inventory.photos') }}</DialogTitle>
        <DialogDescription>{{ categoryPath }}</DialogDescription>
      </DialogHeader>
      <img
        v-if="previewPhoto"
        :src="photoUrl(previewPhoto)"
        :alt="categoryPath"
        class="w-full rounded-md object-contain max-h-[70vh]"
      />
    </DialogContent>
  </Dialog>

  <!-- Delete Confirm Dialog -->
  <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('inventory.deleteEquipment') }}</DialogTitle>
        <DialogDescription>
          {{ equipment?.label || categoryPath }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button
          variant="outline"
          @click="handleDelete"
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
