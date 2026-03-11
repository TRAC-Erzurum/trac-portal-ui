<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Category {
  id: string
  name: string
  parentId: string | null
  children?: Category[]
}

interface Props {
  modelValue?: string
  categories: Category[]
  leafOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  leafOnly: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

interface FlatNode {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  disabled: boolean
  path: string
}

function buildCategoryMap(categories: Category[]): Map<string, Category> {
  const map = new Map<string, Category>()
  for (const cat of categories) {
    map.set(cat.id, cat)
  }
  return map
}

function getPath(catId: string, map: Map<string, Category>): string {
  const parts: string[] = []
  let current = map.get(catId)
  while (current) {
    parts.unshift(current.name)
    current = current.parentId ? map.get(current.parentId) : undefined
  }
  return parts.join(' > ')
}

const flatNodes = computed<FlatNode[]>(() => {
  const map = buildCategoryMap(props.categories)
  const childIds = new Set(props.categories.filter((c) => c.parentId).map((c) => c.parentId!))
  const result: FlatNode[] = []

  function walk(parentId: string | null, depth: number) {
    const children = props.categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const cat of children) {
      const hasChildren = childIds.has(cat.id) || (cat.children && cat.children.length > 0)
      result.push({
        id: cat.id,
        name: cat.name,
        depth,
        hasChildren: !!hasChildren,
        disabled: props.leafOnly ? !!hasChildren : false,
        path: getPath(cat.id, map),
      })
      walk(cat.id, depth + 1)
    }
  }

  walk(null, 0)
  return result
})

const selectedPath = computed(() => {
  if (!props.modelValue) return ''
  const node = flatNodes.value.find((n) => n.id === props.modelValue)
  return node?.path ?? ''
})

const indentPrefix = (depth: number): string => {
  if (depth === 0) return ''
  return '—'.repeat(depth) + ' '
}
</script>

<template>
  <Select
    :model-value="modelValue"
    @update:model-value="(v: string) => emit('update:modelValue', v)"
  >
    <SelectTrigger class="w-full">
      <SelectValue :placeholder="t('inventory.category')">
        <span v-if="selectedPath" class="truncate">{{ selectedPath }}</span>
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="node in flatNodes"
        :key="node.id"
        :value="node.id"
        :disabled="node.disabled"
        :class="{ 'opacity-50': node.disabled }"
      >
        <span :style="{ paddingLeft: `${node.depth * 16}px` }">
          {{ indentPrefix(node.depth) }}{{ node.name }}
        </span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
