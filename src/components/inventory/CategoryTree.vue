<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight, Edit, FolderOpen, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

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

defineProps<{
  categories: Category[]
}>()

const emit = defineEmits<{
  edit: [category: Category]
  delete: [category: Category]
}>()

const { t } = useI18n()
const expandedIds = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function isExpanded(id: string) {
  return expandedIds.value.has(id)
}

function handleRowClick(category: Category) {
  if (category.children && category.children.length > 0) {
    toggleExpand(category.id)
  }
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

        <FolderOpen class="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <span class="font-medium text-sm flex-1 truncate">{{ category.name }}</span>

        <span
          v-if="category.propertyDefinitions?.length"
          class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
        >
          {{ category.propertyDefinitions.length }} {{ t('inventory.properties').toLowerCase() }}
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
          @edit="(cat) => emit('edit', cat)"
          @delete="(cat) => emit('delete', cat)"
        />
      </div>
    </template>
  </div>
</template>
