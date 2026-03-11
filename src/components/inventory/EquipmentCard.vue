<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, EyeOff, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  id: string
  label?: string
  categoryName: string
  categoryPath?: string
  categoryPhotoPath?: string
  statusName: string
  statusColor?: string
  isVisible?: boolean
  properties?: Array<{ name: string; value: any; type: string }>
  thumbnailPath?: string
  ownerCallSign?: string
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: true,
  showActions: false,
})

const emit = defineEmits<{
  click: [id: string]
  edit: [id: string]
  delete: [id: string]
}>()

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL

const title = computed(() => props.label || props.categoryName)

const resolvedThumbnail = computed(() => {
  if (!props.thumbnailPath) return null
  if (props.thumbnailPath.startsWith('http')) return props.thumbnailPath
  return `${API_BASE}/uploads/${props.thumbnailPath}`
})

const resolvedCategoryPhoto = computed(() => {
  if (!props.categoryPhotoPath) return null
  if (props.categoryPhotoPath.startsWith('http')) return props.categoryPhotoPath
  return `${API_BASE}/uploads/${props.categoryPhotoPath}`
})

const visibleProperties = computed(() => {
  if (!props.properties) return []
  return props.properties.slice(0, 4)
})

const formatPropertyValue = (value: any, type: string): string => {
  if (value == null || value === '') return '—'
  if (type === 'boolean') return value ? t('inventory.propertyTypes.boolean') : '—'
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
</script>

<template>
  <div
    class="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors flex flex-col gap-2"
    :class="{ 'opacity-60': !isVisible }"
    role="button"
    tabindex="0"
    @click="emit('click', id)"
    @keydown.enter="emit('click', id)"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="h-2 w-2 rounded-full inline-block shrink-0"
          :style="{ backgroundColor: statusColor || 'var(--muted-foreground)' }"
        />
        <span class="text-xs font-medium truncate">{{ statusName }}</span>
        <span
          v-if="!isVisible"
          class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
        >
          <EyeOff class="h-3 w-3 inline-block mr-0.5" />
          {{ t('inventory.hidden') }}
        </span>
      </div>
    </div>

    <div class="flex items-start gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-medium text-base truncate">{{ title }}</p>
        <p v-if="categoryPath" class="text-xs text-muted-foreground truncate mt-0.5">
          {{ categoryPath }}
        </p>
      </div>
      <img
        v-if="resolvedThumbnail"
        :src="resolvedThumbnail"
        :alt="title"
        class="h-10 w-10 rounded-md object-cover shrink-0"
      />
      <div
        v-else-if="resolvedCategoryPhoto"
        class="h-10 w-10 rounded-md overflow-hidden shrink-0"
      >
        <img
          :src="resolvedCategoryPhoto"
          :alt="categoryName"
          class="h-full w-full object-cover opacity-50"
        />
      </div>
    </div>

    <div v-if="visibleProperties.length" class="space-y-0.5">
      <div
        v-for="prop in visibleProperties"
        :key="prop.name"
        class="text-sm flex items-baseline gap-1 min-w-0"
      >
        <span class="text-muted-foreground shrink-0">{{ prop.name }}:</span>
        <span class="font-medium truncate">{{ formatPropertyValue(prop.value, prop.type) }}</span>
      </div>
    </div>

    <p v-if="ownerCallSign" class="text-xs text-muted-foreground pt-1">
      {{ t('inventory.ownerCallSign') }}: <span class="font-mono font-medium">{{ ownerCallSign }}</span>
    </p>

    <div class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <Button
        v-if="showActions"
        variant="outline"
        size="sm"
        class="h-7 px-2 text-[10px]"
        @click.stop="emit('edit', id)"
      >
        <Pencil class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.edit') }}
      </Button>
      <Button
        v-if="showActions"
        variant="outline"
        size="sm"
        class="h-7 px-2 text-[10px] trac-btn-destructive-outlined"
        @click.stop="emit('delete', id)"
      >
        <Trash2 class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.delete') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        class="h-7 px-2 text-[10px]"
        @click.stop="emit('click', id)"
      >
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
