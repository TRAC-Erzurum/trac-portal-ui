<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Share2 } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  shareUrl: string
  shareQrDataUrl: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const copyLink = async () => {
  const url = props.shareUrl
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      toast.success(t('netDetail.linkCopied'))
      return
    }
  } catch {
    // fallback below
  }
  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (ok) toast.success(t('netDetail.linkCopied'))
    else toast.error(t('error.serverError'))
  } catch {
    toast.error(t('error.serverError'))
  } finally {
    document.body.removeChild(textarea)
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6 py-6">
      <SheetHeader>
        <SheetTitle>{{ t('netDetail.shareQRTitle') }}</SheetTitle>
        <SheetDescription>
          {{ t('netDetail.shareQRDescription') }}
        </SheetDescription>
      </SheetHeader>
      <div class="flex justify-center bg-muted/30 rounded-lg p-4 mt-4 mb-4">
        <img
          v-if="shareQrDataUrl"
          :src="shareQrDataUrl"
          alt="QR Code"
          class="w-64 h-64 object-contain"
        />
      </div>
      <Separator class="my-4" />
      <p class="text-xs text-muted-foreground text-center mb-4">
        {{ t('common.or') }}
      </p>
      <Button
        variant="outline"
        size="sm"
        class="w-full gap-2"
        @click="copyLink"
      >
        <Share2 class="h-4 w-4" />
        {{ t('netDetail.copyLink') }}
      </Button>
      <p class="text-xs text-muted-foreground text-right mt-6">
        {{ t('netDetail.shareQRExpiry') }}
      </p>
    </SheetContent>
  </Sheet>
</template>
