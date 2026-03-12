<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Link2, Loader2, Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface RelatedEquipment {
  id: string
  label?: string
  isVisible?: boolean
  category?: { id: string; name: string; parent?: { name: string } }
  status?: { id: string; name: string; color?: string }
}

interface SourceRelation {
  id: string
  targetEquipment: RelatedEquipment
  type: string
}

interface TargetRelation {
  id: string
  sourceEquipment: RelatedEquipment
  type: string
}

interface OwnerEquipment {
  id: string
  label?: string
  isVisible?: boolean
  category?: { id: string; name: string; parent?: { name: string } }
  status?: { id: string; name: string; color?: string }
}

interface Props {
  equipmentId: string
  ownerType: 'operator' | 'branch'
  ownerId: string
  relationsAsSource: SourceRelation[]
  relationsAsTarget: TargetRelation[]
  canEdit?: boolean
  /** When true, dropdown changes only emit relationDraft; no API calls. Parent saves on main Save. */
  deferSave?: boolean
  /** Draft state when deferSave: otherEquipmentId -> type ('none' or relation type). Synced via update:relationDraft. */
  relationDraft?: Record<string, string> | null
}

const RELATION_TYPES = ['accessory', 'part', 'mounted', 'used_together'] as const
const NONE = 'none'

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
  deferSave: false,
  relationDraft: null,
})

const emit = defineEmits<{
  updated: []
  openDetail: [equipmentId: string]
  'update:relationDraft': [draft: Record<string, string>]
}>()

const { t } = useI18n()

const ownerEquipment = ref<OwnerEquipment[]>([])
const isLoadingEquipment = ref(false)
const searchQuery = ref('')
const updatingEquipmentId = ref<string | null>(null)

const relationByOtherId = computed(() => {
  const map = new Map<string, { relationId: string; type: string }>()
  for (const r of props.relationsAsSource || []) {
    if (r.targetEquipment?.id) map.set(r.targetEquipment.id, { relationId: r.id, type: r.type })
  }
  for (const r of props.relationsAsTarget || []) {
    if (r.sourceEquipment?.id) map.set(r.sourceEquipment.id, { relationId: r.id, type: r.type })
  }
  return map
})

/** Detail view: only equipment that have an actual relation and are visible. */
const relatedOnlyList = computed(() => {
  const items: { equipment: RelatedEquipment; type: string }[] = []
  for (const r of props.relationsAsSource || []) {
    if (r.targetEquipment?.id && r.targetEquipment.isVisible !== false) {
      items.push({ equipment: r.targetEquipment, type: r.type })
    }
  }
  for (const r of props.relationsAsTarget || []) {
    if (r.sourceEquipment?.id && r.sourceEquipment.isVisible !== false) {
      items.push({ equipment: r.sourceEquipment, type: r.type })
    }
  }
  return items
})

const filteredRelatedOnly = computed(() => {
  const list = relatedOnlyList.value
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(({ equipment }) => {
    const label = (equipment.label || '').toLowerCase()
    const catName = (equipment.category?.name || '').toLowerCase()
    return label.includes(q) || catName.includes(q)
  })
})

const otherEquipment = computed(() =>
  ownerEquipment.value.filter(
    (eq) => eq.id !== props.equipmentId && eq.isVisible !== false,
  ),
)

const filteredEquipment = computed(() => {
  const list = otherEquipment.value
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter((eq) => {
    const label = (eq.label || '').toLowerCase()
    const catName = (eq.category?.name || '').toLowerCase()
    return label.includes(q) || catName.includes(q)
  })
})

const listForDisplay = computed(() =>
  props.canEdit ? filteredEquipment.value.map((eq) => ({ equipment: eq, type: getRelationValue(eq.id) })) : filteredRelatedOnly.value,
)
const hasItemsToShow = computed(() => listForDisplay.value.length > 0)

function equipmentDisplayName(eq: RelatedEquipment): string {
  return eq.label || eq.category?.name || '—'
}

function equipmentCategoryPath(eq: RelatedEquipment): string {
  if (!eq.category) return ''
  if (eq.category.parent?.name) return `${eq.category.parent.name} > ${eq.category.name}`
  return eq.category.name
}

function getRelationValue(equipmentId: string): string {
  if (props.deferSave && props.relationDraft && equipmentId in props.relationDraft) {
    return props.relationDraft[equipmentId] ?? NONE
  }
  return relationByOtherId.value.get(equipmentId)?.type ?? NONE
}

async function fetchOwnerEquipment() {
  if (!props.ownerId) {
    ownerEquipment.value = []
    return
  }
  isLoadingEquipment.value = true
  try {
    const endpoint =
      props.ownerType === 'operator'
        ? `/equipment/operator/${props.ownerId}?pageSize=100`
        : `/equipment/branch/${props.ownerId}?pageSize=100`
    const res = await api.get<{ data: OwnerEquipment[]; total: number }>(endpoint)
    ownerEquipment.value = res.data || []
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    ownerEquipment.value = []
  } finally {
    isLoadingEquipment.value = false
  }
}

async function setRelation(otherEquipmentId: string, newType: string) {
  if (props.deferSave && props.relationDraft != null) {
    const next = { ...props.relationDraft }
    if (newType === NONE) {
      delete next[otherEquipmentId]
    } else {
      next[otherEquipmentId] = newType
    }
    emit('update:relationDraft', next)
    return
  }

  if (updatingEquipmentId.value) return
  const current = relationByOtherId.value.get(otherEquipmentId)

  if (newType === NONE) {
    if (!current) return
    updatingEquipmentId.value = otherEquipmentId
    try {
      await api.delete(`/equipment/${props.equipmentId}/relations/${current.relationId}`)
      toast.success(t('inventory.relationRemoved'))
      emit('updated')
    } catch (e) {
      const err = e as ApiError
      toast.error(translateError(err.message))
    } finally {
      updatingEquipmentId.value = null
    }
    return
  }

  updatingEquipmentId.value = otherEquipmentId
  try {
    if (current) {
      await api.delete(`/equipment/${props.equipmentId}/relations/${current.relationId}`)
    }
    await api.post(`/equipment/${props.equipmentId}/relations`, {
      targetEquipmentId: otherEquipmentId,
      type: newType,
    })
    toast.success(t('inventory.relationCreated'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    updatingEquipmentId.value = null
  }
}

function openRelatedDetail(equipmentId: string) {
  if (equipmentId) emit('openDetail', equipmentId)
}

watch(
  () => [props.equipmentId, props.ownerId, props.canEdit] as const,
  ([eqId, ownerId, canEdit]) => {
    if (eqId && ownerId && canEdit) fetchOwnerEquipment()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
      <Link2 class="h-4 w-4" />
      {{ t('inventory.relatedEquipment') }}
    </h4>

    <div class="relative mb-3">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        v-model="searchQuery"
        :placeholder="t('inventory.searchEquipment')"
        class="pl-9 w-full sm:flex-1 sm:max-w-xs"
      />
    </div>

    <div v-if="canEdit && isLoadingEquipment" class="flex items-center justify-center py-6">
      <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="hasItemsToShow" class="space-y-1">
      <div
        v-for="item in listForDisplay"
        :key="item.equipment.id"
        :role="!canEdit ? 'button' : undefined"
        :tabindex="!canEdit ? 0 : undefined"
        class="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors group"
        :class="canEdit ? 'hover:bg-accent/50' : 'cursor-pointer hover:bg-accent/50'"
        @click="!canEdit && openRelatedDetail(item.equipment.id)"
        @keydown.enter="!canEdit && openRelatedDetail(item.equipment.id)"
      >
        <span
          v-if="item.equipment.status?.color"
          class="h-2.5 w-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: item.equipment.status.color }"
        />

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ equipmentDisplayName(item.equipment) }}</p>
          <p
            v-if="equipmentCategoryPath(item.equipment)"
            class="text-xs text-muted-foreground truncate"
          >
            {{ equipmentCategoryPath(item.equipment) }}
          </p>
        </div>

        <Select
          v-if="canEdit"
          :model-value="getRelationValue(item.equipment.id)"
          :disabled="updatingEquipmentId === item.equipment.id"
          @update:model-value="(v) => { if (v != null) setRelation(item.equipment.id, String(v)) }"
        >
          <SelectTrigger class="w-[180px] shrink-0 h-8">
            <Loader2
              v-if="updatingEquipmentId === item.equipment.id"
              class="h-3 w-3 animate-spin mr-1.5"
            />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="NONE">
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

        <span
          v-else
          class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0"
        >
          {{ t(`inventory.relationType.${item.type}`) }}
        </span>
      </div>
    </div>

    <div v-else class="text-center py-6">
      <Link2 class="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
      <p class="text-sm text-muted-foreground">{{ t('inventory.noRelationsYet') }}</p>
    </div>
  </div>
</template>
