<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight, Edit, FolderOpen, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getUploadedFileUrl } from '@/composables'

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

const props = withDefaults(
  defineProps<{
    categories: Category[]
    /** When provided (e.g. from InventoryAdminPage), tree uses this for expand state so path can be expanded after edit */
    expandedIds?: Ref<Set<string>> | Set<string>
  }>(),
  { expandedIds: undefined }
)

const emit = defineEmits<{
  edit: [category: Category]
  delete: [category: Category]
}>()

const { t } = useI18n()
const internalExpandedIds = ref<Set<string>>(new Set())

/** Prop may be Ref<Set> or Set (if parent ref was unwrapped). Normalize to the Set and the Ref to mutate. */
const expandedState = computed(() => {
  const source = props.expandedIds ?? internalExpandedIds
  const set = source && typeof source === 'object' && 'value' in source ? (source as Ref<Set<string>>).value : (source as Set<string>)
  return { set: set ?? new Set(), ref: source && typeof source === 'object' && 'value' in source ? (source as Ref<Set<string>>) : internalExpandedIds }
})

/** Same ref/source to pass to recursive children so they share expand state */
const expandedIdsToPass = computed(() => props.expandedIds ?? internalExpandedIds)

function toggleExpand(id: string) {
  const { set, ref } = expandedState.value
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  ref.value = new Set(ref.value)
}

function isExpanded(id: string) {
  const { set } = expandedState.value
  return set.has(id)
}

function handleRowClick(category: Category) {
  if (category.children && category.children.length > 0) {
    toggleExpand(category.id)
  }
}

function getCategoryPhotoUrl(category: Category): string | null {
  if (!category.photoPath) return null
  return getUploadedFileUrl(category.photoPath) || null
}
</script>

<template>
  <div class="space-y-0.5">
    <template v-for="category in categories" :key="category.id">
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
        :class="{ 'cursor-pointer': category.children?.length }"
        @click="handleRowClick(category)"
      >
        <button
          v-if="category.children && category.children.length > 0"
          class="p-0.5 rounded hover:bg-accent"
          :aria-label="isExpanded(category.id) ? t('common.close') : t('common.detail')"
        >
          <ChevronDown v-if="isExpanded(category.id)" class="h-4 w-4 text-muted-foreground" />
          <ChevronRight v-else class="h-4 w-4 text-muted-foreground" />
        </button>
        <div v-else class="w-5" />

        <img
          v-if="getCategoryPhotoUrl(category)"
          :src="getCategoryPhotoUrl(category)!"
          :alt="category.name"
          class="h-8 w-8 object-cover rounded-md flex-shrink-0 border border-border"
        />
        <FolderOpen
          v-else
          class="h-4 w-4 text-muted-foreground flex-shrink-0"
          :aria-hidden="true"
        />

        <span class="font-medium text-sm flex-1 truncate">{{ category.name }}</span>

        <span
          v-if="category.propertyDefinitions?.length"
          class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
        >
          {{ category.propertyDefinitions.length }} {{ t('inventory.property').toLowerCase() }}
        </span>

        <span
          v-if="category.equipmentCount"
          class="text-xs text-muted-foreground"
        >
          {{ category.equipmentCount }} {{ t('inventory.equipment').toLowerCase() }}
        </span>

        <div class="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            class="h-7 w-7 p-0"
            @click.stop="emit('edit', category)"
            :aria-label="t('inventory.editCategory')"
          >
            <Edit class="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 w-7 p-0 trac-btn-destructive-outlined"
            @click.stop="emit('delete', category)"
            :aria-label="t('inventory.deleteCategory')"
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div
        v-if="category.children && category.children.length > 0 && isExpanded(category.id)"
        class="pl-6"
      >
        <CategoryTree
          :categories="category.children"
          :expanded-ids="expandedIdsToPass"
          @edit="(cat) => emit('edit', cat)"
          @delete="(cat) => emit('delete', cat)"
        />
      </div>
    </template>
  </div>
</template>
