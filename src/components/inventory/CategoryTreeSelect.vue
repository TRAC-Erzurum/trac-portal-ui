<script setup lang="ts">
import { computed } from 'vue'
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

interface FlatNode {
  id: string
  name: string
  depth: number
  hasChildren: boolean
  disabled: boolean
  path: string
}

/** Flatten tree from API (nested children) into a list with parentId so walk() can build flatNodes. */
function flattenTree(cats: Category[], parentId: string | null = null): Category[] {
  const out: Category[] = []
  for (const c of cats) {
    out.push({
      id: c.id,
      name: c.name,
      parentId: c.parentId ?? parentId,
      children: undefined,
    })
    if (c.children?.length) {
      out.push(...flattenTree(c.children, c.id))
    }
  }
  return out
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
  const flatCategories = flattenTree(props.categories)
  const map = buildCategoryMap(flatCategories)
  const childIds = new Set(flatCategories.filter((c) => c.parentId).map((c) => c.parentId!))
  const result: FlatNode[] = []

  function walk(parentId: string | null, depth: number) {
    const children = flatCategories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const cat of children) {
      const hasChildren = childIds.has(cat.id)
      result.push({
        id: cat.id,
        name: cat.name,
        depth,
        hasChildren,
        disabled: props.leafOnly ? hasChildren : false,
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
    @update:model-value="(v) => emit('update:modelValue', v === null ? '' : String(v))"
  >
    <SelectTrigger class="w-full">
      <SelectValue placeholder="">
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
