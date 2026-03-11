<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Link2, Loader2, Plus, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface RelatedEquipment {
  id: string
  label?: string
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
}

const RELATION_TYPES = ['accessory', 'part', 'mounted', 'used_together'] as const

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
})

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()

const showAddForm = ref(false)
const ownerEquipment = ref<OwnerEquipment[]>([])
const isLoadingEquipment = ref(false)
const searchQuery = ref('')
const selectedEquipmentId = ref('')
const selectedType = ref('')
const isAdding = ref(false)
const removingId = ref<string | null>(null)

interface MergedRelation {
  id: string
  equipment: RelatedEquipment
  type: string
  direction: 'source' | 'target'
}

const allRelations = computed<MergedRelation[]>(() => {
  const source = (props.relationsAsSource || []).map((r) => ({
    id: r.id,
    equipment: r.targetEquipment,
    type: r.type,
    direction: 'source' as const,
  }))
  const target = (props.relationsAsTarget || []).map((r) => ({
    id: r.id,
    equipment: r.sourceEquipment,
    type: r.type,
    direction: 'target' as const,
  }))
  return [...source, ...target]
})

const relatedIds = computed(() => {
  const ids = new Set(allRelations.value.map((r) => r.equipment?.id).filter(Boolean))
  ids.add(props.equipmentId)
  return ids
})

const filteredEquipment = computed(() => {
  return ownerEquipment.value.filter((eq) => {
    if (relatedIds.value.has(eq.id)) return false
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    const label = eq.label?.toLowerCase() || ''
    const catName = eq.category?.name?.toLowerCase() || ''
    return label.includes(q) || catName.includes(q)
  })
})

function equipmentDisplayName(eq: RelatedEquipment): string {
  return eq.label || eq.category?.name || '—'
}

function equipmentCategoryPath(eq: RelatedEquipment): string {
  if (!eq.category) return ''
  if (eq.category.parent?.name) return `${eq.category.parent.name} > ${eq.category.name}`
  return eq.category.name
}

async function openAddForm() {
  showAddForm.value = true
  searchQuery.value = ''
  selectedEquipmentId.value = ''
  selectedType.value = ''

  if (ownerEquipment.value.length === 0) {
    isLoadingEquipment.value = true
    try {
      const endpoint = props.ownerType === 'operator'
        ? `/equipment/operator/${props.ownerId}?pageSize=100`
        : `/equipment/branch/${props.ownerId}?pageSize=100`
      const res = await api.get<{ data: OwnerEquipment[]; total: number }>(endpoint)
      ownerEquipment.value = res.data
    } catch (e) {
      const err = e as ApiError
      toast.error(translateError(err.message))
    } finally {
      isLoadingEquipment.value = false
    }
  }
}

function closeAddForm() {
  showAddForm.value = false
  searchQuery.value = ''
  selectedEquipmentId.value = ''
  selectedType.value = ''
}

async function handleAdd() {
  if (!selectedEquipmentId.value || !selectedType.value || isAdding.value) return

  isAdding.value = true
  try {
    await api.post(`/equipment/${props.equipmentId}/relations`, {
      targetEquipmentId: selectedEquipmentId.value,
      type: selectedType.value,
    })
    toast.success(t('inventory.relationCreated'))
    closeAddForm()
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isAdding.value = false
  }
}

async function handleRemove(relationId: string) {
  if (removingId.value) return
  removingId.value = relationId
  try {
    await api.delete(`/equipment/${props.equipmentId}/relations/${relationId}`)
    toast.success(t('inventory.relationRemoved'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Link2 class="h-4 w-4" />
        {{ t('inventory.relations') }}
      </h4>
      <Button
        v-if="canEdit && !showAddForm"
        variant="outline"
        size="sm"
        @click="openAddForm"
        :aria-label="t('inventory.addRelation')"
      >
        <Plus class="h-4 w-4 mr-2" />
        {{ t('inventory.addRelation') }}
      </Button>
    </div>

    <!-- Add Relation Form -->
    <div
      v-if="showAddForm"
      class="border border-border rounded-md p-3 mb-4 space-y-3"
    >
      <!-- Search Input -->
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          :placeholder="t('inventory.searchEquipment')"
          class="pl-9"
        />
      </div>

      <!-- Equipment List -->
      <div v-if="isLoadingEquipment" class="flex items-center justify-center py-4">
        <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
      </div>

      <div
        v-else-if="filteredEquipment.length"
        class="max-h-40 overflow-y-auto border border-border rounded-md"
      >
        <button
          v-for="eq in filteredEquipment"
          :key="eq.id"
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
          :class="{ 'bg-accent': selectedEquipmentId === eq.id }"
          @click="selectedEquipmentId = eq.id"
        >
          <span
            v-if="eq.status?.color"
            class="h-2 w-2 rounded-full shrink-0"
            :style="{ backgroundColor: eq.status.color }"
          />
          <div class="min-w-0 flex-1">
            <span class="font-medium truncate block">{{ equipmentDisplayName(eq) }}</span>
            <span
              v-if="equipmentCategoryPath(eq)"
              class="text-xs text-muted-foreground truncate block"
            >
              {{ equipmentCategoryPath(eq) }}
            </span>
          </div>
        </button>
      </div>

      <div v-else-if="!isLoadingEquipment" class="text-center py-3">
        <p class="text-xs text-muted-foreground">{{ t('common.noResults') }}</p>
      </div>

      <!-- Relation Type Select -->
      <Select v-model="selectedType">
        <SelectTrigger>
          <SelectValue :placeholder="t('common.select')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="type in RELATION_TYPES"
            :key="type"
            :value="type"
          >
            {{ t(`inventory.relationType.${type}`) }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- Form Actions -->
      <div class="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" @click="closeAddForm" :disabled="isAdding">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="handleAdd"
          :disabled="!selectedEquipmentId || !selectedType || isAdding"
        >
          <Plus class="h-4 w-4 mr-2" />
          {{ isAdding ? t('common.loading') : t('common.add') }}
        </Button>
      </div>
    </div>

    <!-- Existing Relations List -->
    <div v-if="allRelations.length" class="space-y-1">
      <div
        v-for="rel in allRelations"
        :key="rel.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors group"
      >
        <span
          v-if="rel.equipment?.status?.color"
          class="h-2.5 w-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: rel.equipment.status.color }"
        />

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ equipmentDisplayName(rel.equipment) }}</p>
          <p
            v-if="equipmentCategoryPath(rel.equipment)"
            class="text-xs text-muted-foreground truncate"
          >
            {{ equipmentCategoryPath(rel.equipment) }}
          </p>
        </div>

        <span class="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
          {{ t(`inventory.relationType.${rel.type}`) }}
        </span>

        <Button
          v-if="canEdit"
          variant="outline"
          size="sm"
          class="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          :disabled="removingId === rel.id"
          @click="handleRemove(rel.id)"
          :aria-label="t('inventory.removeRelation')"
        >
          <Loader2 v-if="removingId === rel.id" class="h-3 w-3 animate-spin" />
          <X v-else class="h-3 w-3" />
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!canEdit && !showAddForm" class="text-center py-6">
      <Link2 class="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
      <p class="text-sm text-muted-foreground">{{ t('inventory.noRelationsYet') }}</p>
    </div>
  </div>
</template>
