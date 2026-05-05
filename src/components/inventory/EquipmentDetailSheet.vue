<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Loader2, X } from 'lucide-vue-next'
import EquipmentRelationsPanel from '@/components/inventory/EquipmentRelationsPanel.vue'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { getUploadedFileUrl } from '@/composables'
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
  quantity: number
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

const equipment = ref<Equipment | null>(null)
const isLoading = ref(false)
const currentEquipmentId = ref<string | null>(null)
const enlargedPhotoUrl = ref<string | null>(null)
const photoOverlayRef = ref<HTMLElement | null>(null)

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

const categoryBreadcrumbParts = computed(() => {
  if (!equipment.value?.category) return []
  const parts: { name: string; isLast: boolean }[] = []
  let current: any = equipment.value.category
  while (current) {
    parts.unshift({ name: current.name, isLast: false })
    current = current.parent
  }
  if (parts.length) parts[parts.length - 1].isLast = true
  return parts
})

const categoryPhotoUrl = computed(() => {
  const path = equipment.value?.category?.photoPath
  return path ? getUploadedFileUrl(path) : null
})

const sheetTitle = computed(() =>
  equipment.value?.label || equipment.value?.category?.name || t('inventory.equipment')
)
const sheetDescription = computed(() => t('inventory.equipmentDetail'))

const sortedPhotos = computed(() => {
  if (!equipment.value?.photos?.length) return []
  return [...equipment.value.photos].sort((a, b) => a.sortOrder - b.sortOrder)
})

const propertiesInRows = computed(() => {
  const list = sortedProperties.value
  const rows: PropertyValue[][] = []
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2))
  }
  return rows
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

async function fetchEquipment() {
  const id = currentEquipmentId.value ?? props.equipmentId
  if (!id) return
  isLoading.value = true
  equipment.value = null
  try {
    equipment.value = await api.get<Equipment>(`/equipment/${id}`)
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    equipment.value = null
  } finally {
    isLoading.value = false
  }
}

function handleRelationsUpdated() {
  fetchEquipment()
}

function handleRelatedOpen(equipmentId: string) {
  currentEquipmentId.value = equipmentId
  fetchEquipment()
}

function handleClose(value: boolean) {
  emit('update:open', value)
}

watch(
  () => [props.open, props.equipmentId],
  ([open, id]) => {
    if (open && id) {
      currentEquipmentId.value = id as string
      equipment.value = null
      fetchEquipment()
    }
  },
  { immediate: true },
)

watch(enlargedPhotoUrl, (url) => {
  if (url) {
    // Defer focus to avoid "Autofocus processing was blocked" when Sheet already has focus
    nextTick(() => {
      requestAnimationFrame(() => {
        const el = photoOverlayRef.value as HTMLElement | null
        if (el && document.activeElement !== (el as Element)) el.focus()
      })
    })
  }
})
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetTitle class="sr-only">{{ sheetTitle }}</SheetTitle>
      <SheetDescription class="sr-only">{{ sheetDescription }}</SheetDescription>
      <template v-if="isLoading">
        <div class="flex items-center justify-center py-20">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </template>

      <template v-else-if="equipment">
        <!-- Üstten boşluk -->
        <div class="pt-8 pb-6 px-1 flex flex-col items-center">
          <!-- Category photo: small, circular -->
          <div v-if="categoryPhotoUrl" class="flex justify-center mb-4">
            <div class="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border border-border shrink-0">
              <img
                :src="categoryPhotoUrl"
                :alt="categoryPath"
                class="h-full w-full object-cover"
              />
            </div>
          </div>

          <!-- Breadcrumb: parent -> parent -> **category** (centered) -->
          <div class="flex flex-wrap items-center justify-center gap-1 text-sm mb-6">
            <template v-for="(part, index) in categoryBreadcrumbParts" :key="index">
              <span v-if="index > 0" class="text-muted-foreground">→</span>
              <span :class="part.isLast ? 'font-semibold' : 'text-muted-foreground'">{{ part.name }}</span>
            </template>
          </div>
        </div>

        <Separator class="my-6" />

        <!-- Etiket ve not sola yaslı -->
        <div class="space-y-4 text-left">
          <p v-if="equipment.label" class="font-medium">{{ equipment.label }}</p>

          <!-- Fotoğraflar: label sonrası, tıklanınca büyüt -->
          <div v-if="sortedPhotos.length" class="flex flex-wrap gap-2">
            <button
              v-for="photo in sortedPhotos"
              :key="photo.id"
              type="button"
              class="rounded-md border border-border overflow-hidden hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-20 w-20 shrink-0"
              @click="enlargedPhotoUrl = getUploadedFileUrl(photo.filePath)"
              :aria-label="t('inventory.photos')"
            >
              <img
                :src="getUploadedFileUrl(photo.filePath)"
                :alt="t('inventory.photos')"
                class="h-full w-full object-cover"
              />
            </button>
          </div>

          <div v-if="equipment.note" class="space-y-2">
            <p class="text-sm font-medium text-foreground">{{ t('inventory.equipmentNote') }}</p>
            <p class="text-sm text-muted-foreground leading-relaxed">{{ equipment.note }}</p>
          </div>
        </div>

        <!-- Durum ve adet: düzenli iki sütun, daha okunaklı -->
        <div class="grid grid-cols-2 gap-3 items-stretch mt-4">
          <div
            class="flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 min-h-[2.75rem] bg-muted/20"
            :style="{
              borderColor: equipment.status.color || 'var(--border)',
            }"
          >
            <span
              class="h-2.5 w-2.5 rounded-full shrink-0"
              :style="{ backgroundColor: equipment.status.color || 'var(--muted-foreground)' }"
            />
            <span
              class="text-sm font-medium"
              :style="{ color: equipment.status.color || 'var(--foreground)' }"
            >
              {{ equipment.status.name }}
            </span>
          </div>
          <div class="flex items-center justify-end rounded-lg border-2 border-border bg-muted/20 px-3 py-2.5 min-h-[2.75rem]">
            <span class="text-sm font-medium text-foreground">
              {{ equipment.quantity ?? 1 }} {{ t('inventory.quantity') }}
            </span>
          </div>
        </div>

        <!-- Özellikler: kart görünümü, max 2 per row -->
        <template v-if="propertiesInRows.length">
          <div class="mt-4 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <template v-for="(row, rowIndex) in propertiesInRows" :key="rowIndex">
              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="pv in row"
                  :key="pv.id"
                  class="flex items-baseline gap-2 min-w-0 rounded-md bg-background px-2.5 py-1.5 border border-border/50"
                >
                  <span class="text-xs font-medium text-muted-foreground shrink-0">{{ pv.propertyDefinition.name }}:</span>
                  <span class="text-sm truncate">{{ formatPropertyValue(pv.value, pv.propertyDefinition.type) }}</span>
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- İlişkili ekipmanlar: sadece varsa ayraç + panel -->
        <template v-if="hasRelations && equipment.id">
          <Separator class="my-6" />
          <EquipmentRelationsPanel
            :equipment-id="equipment.id"
            :owner-type="equipment.ownerType"
            :owner-id="(equipment.ownerType === 'operator' ? equipment.operatorId : equipment.branchId) || ''"
            :relations-as-source="equipment.relationsAsSource"
            :relations-as-target="equipment.relationsAsTarget"
            :can-edit="false"
            @updated="handleRelationsUpdated"
            @open-detail="handleRelatedOpen"
          />
        </template>
      </template>
    </SheetContent>
    <!-- Fotoğraf büyütme: sheet (z-[900]) üstünde görünsün diye z-[950] overlay -->
    <Teleport to="body">
      <div
        v-if="enlargedPhotoUrl"
        ref="photoOverlayRef"
        tabindex="-1"
        class="fixed inset-0 z-[950] flex items-center justify-center bg-black/80 p-4 outline-none"
        role="dialog"
        :aria-label="t('inventory.photos')"
        @click.self="enlargedPhotoUrl = null"
        @keydown.escape="enlargedPhotoUrl = null"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-sm p-1 text-white opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
          :aria-label="t('common.close')"
          @click="enlargedPhotoUrl = null"
        >
          <X class="h-5 w-5" />
        </button>
        <img
          :src="enlargedPhotoUrl"
          :alt="t('inventory.photos')"
          class="max-h-[85vh] max-w-full w-auto object-contain rounded-md shadow-lg"
          @click.stop
        />
      </div>
    </Teleport>
  </Sheet>
</template>
