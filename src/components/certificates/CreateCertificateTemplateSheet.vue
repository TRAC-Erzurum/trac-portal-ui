<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import CertificateTemplateCanvasEditor from '@/components/certificates/CertificateTemplateCanvasEditor.vue'
import { DEFAULT_SERIAL_ELEMENT } from '@/components/certificates/certificate-template-defaults'
import type { CertificateTemplateElement } from '@/components/certificates/certificate-template-defaults'
import { MAX_UPLOAD_BYTES } from '@/constants/upload'
import { translateError } from '@/i18n'
import { api, API_BASE, type ApiError } from '@/lib/api'

const props = defineProps<{
  open: boolean
  branchId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { t } = useI18n()

const name = ref('')
const imagePath = ref('')
const elements = ref<CertificateTemplateElement[]>([])
const isUploading = ref(false)
const isLoading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

watch(
  () => props.open,
  (open) => {
    if (open) {
      name.value = ''
      imagePath.value = ''
      elements.value = [{ ...DEFAULT_SERIAL_ELEMENT }]
    }
  }
)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const onFileSelected = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error(t('error.invalidFileType'))
    input.value = ''
    return
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    toast.error(t('error.fileTooLarge'))
    input.value = ''
    return
  }
  isUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(
      `${API_BASE}/branches/${props.branchId}/certificate-templates/upload`,
      {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }
    )
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      toast.error(translateError(err.message || 'error.somethingWentWrong'))
      input.value = ''
      return
    }
    const data = await response.json()
    imagePath.value = data.imagePath ?? ''
  } catch {
    toast.error(t('error.somethingWentWrong'))
    input.value = ''
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

const handleSubmit = async () => {
  const trimmedName = name.value?.trim()
  if (!trimmedName) {
    toast.error(t('error.somethingWentWrong'))
    return
  }
  if (!imagePath.value) {
    toast.error(t('error.somethingWentWrong'))
    return
  }
  isLoading.value = true
  try {
    await api.post(`/branches/${props.branchId}/certificate-templates`, {
      name: trimmedName,
      imagePath: imagePath.value,
      elements: elements.value,
    })
    toast.success(t('certificates.createSuccess'))
    emit('created')
    emit('update:open', false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-lg overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('certificates.create') }}</SheetTitle>
        <SheetDescription>{{ t('certificates.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="py-6 px-1 space-y-6">
        <div class="space-y-2">
          <Label for="cert-name">{{ t('certificates.name') }}</Label>
          <Input
            id="cert-name"
            v-model="name"
            type="text"
            :placeholder="t('certificates.name')"
            required
          />
        </div>

        <div class="space-y-2">
          <Label>{{ t('certificates.image') }} ({{ t('common.maxUploadSize') }})</Label>
          <input
            ref="fileInputRef"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFileSelected"
          />
          <Button
            type="button"
            variant="outline"
            class="w-full"
            :disabled="isUploading"
            @click="triggerFileInput"
          >
            {{ isUploading ? t('common.loading') : t('certificates.uploadImage') }}
          </Button>
          <p v-if="imagePath" class="text-xs text-muted-foreground truncate">
            {{ imagePath }}
          </p>
        </div>

        <Separator class="my-8" />

        <CertificateTemplateCanvasEditor
          v-model="elements"
          :image-path="imagePath"
          :disabled="isLoading"
        />

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            type="submit"
            class="trac-sheet-btn"
            :disabled="isLoading || !name?.trim() || !imagePath"
          >
            <Check class="h-4 w-4 mr-2" />
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
