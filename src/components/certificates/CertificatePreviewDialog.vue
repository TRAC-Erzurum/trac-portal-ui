<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Award, Download, Loader2 } from 'lucide-vue-next'
import CertificateFilledPreview from '@/components/certificates/CertificateFilledPreview.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CertificateAssetItem, CertificatePreviewData } from '@/composables/useCertificateAssets'

const props = withDefaults(
  defineProps<{
    open: boolean
    certificate: CertificateAssetItem | null
    preview: CertificatePreviewData | null
    isDownloading?: boolean
    isLoading?: boolean
    maxPreviewHeight?: number
    downloadLabel?: string
  }>(),
  {
    isDownloading: false,
    isLoading: false,
    maxPreviewHeight: 760,
    downloadLabel: undefined,
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  download: []
}>()

const { t } = useI18n()

const title = computed(() => props.certificate?.netName || t('certificates.previewFull'))
const description = computed(() => {
  const branchName = props.certificate?.branchName || ''
  const netDate = props.certificate?.netDate || ''
  return [branchName, netDate].filter(Boolean).join(' · ')
})

const close = () => emit('update:open', false)
</script>

<template>
  <Dialog :open="open" @update:open="(value) => !value && close()">
    <DialogContent class="max-w-6xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>

      <div class="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
        <div v-if="isLoading" class="flex min-h-[420px] items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          {{ t('common.loading') }}
        </div>
        <CertificateFilledPreview
          v-else-if="preview"
          :image-path="preview.imagePath"
          :elements="preview.elements"
          :placeholders="preview.placeholders"
          :max-height="maxPreviewHeight"
          class="w-full"
        />
        <div v-else class="flex min-h-[420px] items-center justify-center px-6 py-10 text-center">
          <div>
            <Award class="mx-auto h-12 w-12 text-primary/70" />
            <p class="mt-4 text-sm font-medium">{{ title }}</p>
            <p class="mt-2 text-xs text-muted-foreground">{{ t('certificates.previewFull') }}</p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          class="w-full gap-2 sm:w-auto"
          :disabled="!certificate || isDownloading"
          @click="emit('download')"
        >
          <Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          {{ downloadLabel || t('certificates.download') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>