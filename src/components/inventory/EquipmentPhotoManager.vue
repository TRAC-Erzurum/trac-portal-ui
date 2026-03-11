<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Loader2, Trash2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface EquipmentPhoto {
  id: string
  filePath: string
  sortOrder: number
}

interface Props {
  equipmentId: string
  photos: EquipmentPhoto[]
  maxPhotos?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxPhotos: 5,
})

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const API_BASE = import.meta.env.VITE_API_URL

const isUploading = ref(false)
const showDeleteDialog = ref(false)
const deletingPhoto = ref<EquipmentPhoto | null>(null)
const isDeleting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function photoUrl(photo: EquipmentPhoto): string {
  return `${API_BASE}/uploads/${photo.filePath}`
}

function triggerUpload() {
  if (props.photos.length >= props.maxPhotos) {
    toast.error(t('inventory.maxPhotosReached'))
    return
  }
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('error.invalidFileType'))
    input.value = ''
    return
  }

  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('photos', file)
    await api.post(`/equipment/${props.equipmentId}/photos`, formData)
    toast.success(t('inventory.photoUploaded'))
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

function openDeleteDialog(photo: EquipmentPhoto) {
  deletingPhoto.value = photo
  showDeleteDialog.value = true
}

async function handleDelete() {
  if (!deletingPhoto.value || isDeleting.value) return

  isDeleting.value = true
  try {
    await api.delete(`/equipment/${props.equipmentId}/photos/${deletingPhoto.value.id}`)
    toast.success(t('inventory.photoDeleted'))
    showDeleteDialog.value = false
    deletingPhoto.value = null
    emit('updated')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <ImagePlus class="h-4 w-4" />
        {{ t('inventory.photos') }}
      </h4>
      <span class="text-xs text-muted-foreground">
        {{ photos.length }} / {{ maxPhotos }}
      </span>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="relative group h-20 w-20 rounded-md overflow-hidden border border-border"
      >
        <img
          :src="photoUrl(photo)"
          alt=""
          class="h-full w-full object-cover"
        />
        <Button
          variant="outline"
          size="sm"
          class="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          @click="openDeleteDialog(photo)"
          :aria-label="t('inventory.deletePhoto')"
        >
          <X class="h-3 w-3" />
        </Button>
      </div>

      <button
        v-if="photos.length < maxPhotos"
        type="button"
        class="flex flex-col items-center justify-center h-20 w-20 rounded-md border border-dashed border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
        :disabled="isUploading"
        @click="triggerUpload"
      >
        <Loader2 v-if="isUploading" class="h-5 w-5 animate-spin" />
        <ImagePlus v-else class="h-5 w-5" />
        <span class="text-[10px] mt-1">{{ t('inventory.uploadPhoto') }}</span>
      </button>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleFileChange"
    />

    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('inventory.deletePhoto') }}</DialogTitle>
          <DialogDescription>{{ t('inventory.photos') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="handleDelete"
            :disabled="isDeleting"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ isDeleting ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
