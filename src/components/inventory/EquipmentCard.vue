<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChevronRight, Edit, EyeOff, Trash2, User } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getUploadedFileUrl } from '@/composables'

interface Props {
  id: string
  label?: string
  categoryName: string
  categoryPath?: string
  categoryPhotoPath?: string
  statusName: string
  statusColor?: string
  quantity?: number
  isVisible?: boolean
  properties?: Array<{ name: string; value: any; type: string }>
  thumbnailPath?: string
  /** All photo file paths to show on the card (overrides single thumbnail when provided). */
  photoPaths?: string[]
  /** Operator call sign (e.g. TA9ABC). Shown as link when operatorId is provided. */
  ownerCallSign?: string
  /** Operator profile id; when set with ownerCallSign, shows "Operatör: callSign" as link to profile. */
  operatorId?: string
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
const router = useRouter()

function goToOperator() {
  if (props.operatorId) {
    router.push(`/operators/${props.operatorId}`)
  }
}

const title = computed(() => props.label ?? '')

const resolvedThumbnail = computed(() => {
  if (!props.thumbnailPath) return null
  return getUploadedFileUrl(props.thumbnailPath) || null
})

const resolvedPhotoUrls = computed(() => {
  if (!props.photoPaths?.length) return []
  return props.photoPaths
    .map((p) => getUploadedFileUrl(p))
    .filter((url): url is string => !!url)
})

const resolvedCategoryPhoto = computed(() => {
  if (!props.categoryPhotoPath) return null
  return getUploadedFileUrl(props.categoryPhotoPath) || null
})

const categoryPathParts = computed(() => {
  if (!props.categoryPath) return []
  return props.categoryPath.split(/\s*>\s*/).filter(Boolean)
})
</script>

<template>
  <div
    class="border rounded-lg p-4 flex flex-col gap-2"
    :class="{ 'opacity-60': !isVisible }"
  >
    <!-- Kategori: üst-orta, sadece asıl kategori -->
    <div
      v-if="categoryPathParts.length"
      class="flex justify-center text-sm font-semibold text-foreground"
    >
      {{ categoryPathParts[categoryPathParts.length - 1] }}
    </div>

    <div class="flex items-start gap-3">
      <div class="flex-1 min-w-0">
        <p v-if="title" class="font-medium text-base truncate">{{ title }}</p>
      </div>
      <div v-if="resolvedPhotoUrls.length" class="flex gap-1 shrink-0 justify-end">
        <img
          v-for="(url, idx) in resolvedPhotoUrls"
          :key="idx"
          :src="url"
          :alt="`${title || categoryName} (${idx + 1})`"
          class="h-10 w-10 rounded-md object-cover border border-border"
        />
      </div>
      <img
        v-else-if="resolvedThumbnail"
        :src="resolvedThumbnail"
        :alt="title || categoryName"
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

    <!-- Durum: özelliklerin olduğu yerde -->
    <div class="flex items-center gap-2 min-w-0 flex-wrap">
      <span
        class="h-2 w-2 rounded-full inline-block shrink-0"
        :style="{ backgroundColor: statusColor || 'var(--muted-foreground)' }"
      />
      <span class="text-xs font-medium truncate">{{ statusName }}</span>
      <span v-if="quantity != null" class="text-xs text-muted-foreground truncate">
        · {{ quantity }} {{ t('inventory.quantity') }}
      </span>
      <span
        v-if="!isVisible"
        class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0"
      >
        <EyeOff class="h-3 w-3 inline-block mr-0.5" />
        {{ t('inventory.hidden') }}
      </span>
    </div>

    <div class="mt-auto flex items-center justify-between gap-2 pt-1.5 pb-0 border-t border-border/30">
      <div class="min-w-0 shrink-0">
        <Button
          v-if="ownerCallSign && operatorId"
          variant="outline"
          size="sm"
          class="h-7 px-2 text-[10px]"
          @click.stop="goToOperator"
        >
          <User class="h-3.5 w-3.5 mr-1.5" />
          <span class="font-mono">{{ ownerCallSign }}</span>
        </Button>
        <span
          v-else-if="ownerCallSign"
          class="text-xs text-muted-foreground inline-flex items-center gap-1"
        >
          <User class="h-3.5 w-3.5 shrink-0" />
          <span class="font-mono font-medium">{{ ownerCallSign }}</span>
        </span>
      </div>
      <div class="flex items-center shrink-0 gap-1">
      <Button
        variant="outline"
        size="sm"
        class="h-7 px-2 text-[10px]"
        @click.stop="emit('click', id)"
      >
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
      <Button
        v-if="showActions"
        variant="outline"
        size="sm"
        class="h-7 px-2 text-[10px]"
        @click.stop="emit('edit', id)"
      >
        <Edit class="h-3.5 w-3.5 mr-1.5" />
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
      </div>
    </div>
  </div>
</template>
