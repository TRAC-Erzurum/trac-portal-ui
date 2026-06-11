<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MAX_UPLOAD_BYTES } from '@/constants/upload'
import { readFileAsDataUrl } from '@/lib/utils'

const MAX_PHOTOS = 5
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const props = defineProps<{
  modelValue: File[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: File[]]
}>()

const { t } = useI18n()

const previewUrls = ref<string[]>([])

watch(
  () => props.modelValue,
  async (files) => {
    previewUrls.value = await Promise.all(files.map(readFileAsDataUrl))
  },
  { immediate: true },
)

async function handleChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  const newFiles: File[] = []
  for (const file of Array.from(files)) {
    if (!VALID_TYPES.includes(file.type)) {
      toast.error(t('error.invalidFileType'))
      continue
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t('error.fileTooLarge'))
      continue
    }
    newFiles.push(file)
  }

  const combined = [...props.modelValue, ...newFiles]
  if (combined.length > MAX_PHOTOS) {
    toast.error(t('disaster.maxPhotosReached', { count: MAX_PHOTOS }))
  }
  emit('update:modelValue', combined.slice(0, MAX_PHOTOS))
  input.value = ''
}

function removePhoto(index: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="space-y-2">
    <Label>{{ t('disaster.photos') }}</Label>
    <p class="text-xs text-muted-foreground">{{ t('disaster.photosHint', { count: MAX_PHOTOS }) }}</p>

    <div v-if="modelValue.length > 0" class="flex flex-wrap gap-2">
      <div v-for="(_, idx) in modelValue" :key="idx" class="relative w-20 h-20">
        <img
          :src="previewUrls[idx]"
          alt=""
          class="w-20 h-20 rounded-md object-cover border border-border"
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          class="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full"
          :aria-label="t('common.delete')"
          @click="removePhoto(idx)"
        >
          <X class="h-3 w-3" />
        </Button>
      </div>
    </div>

    <label
      v-if="modelValue.length < MAX_PHOTOS"
      class="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <ImagePlus class="h-4 w-4 text-muted-foreground" />
      <span class="text-sm text-muted-foreground">{{ t('disaster.addPhotos') }}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        class="hidden"
        @change="handleChange"
      />
    </label>
  </div>
</template>
