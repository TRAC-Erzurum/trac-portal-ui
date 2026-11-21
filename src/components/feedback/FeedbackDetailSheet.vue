<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Send } from 'lucide-vue-next'
import FeedbackGithubStatusBadge from '@/components/feedback/FeedbackGithubStatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getUploadedFileUrl, useAsyncStaleGuard } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type { FeedbackRecord } from '@/types/feedback'

const props = defineProps<{
  open: boolean
  feedbackId: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: [record: FeedbackRecord]
}>()

const { t, locale } = useI18n()

const record = ref<FeedbackRecord | null>(null)
const isLoading = ref(false)
const isForwarding = ref(false)
const detailGuard = useAsyncStaleGuard()

const canForward = computed(() => {
  const current = record.value
  if (!current || current.category === 'security') return false
  return current.githubStatus === 'pending' || current.githubStatus === 'failed'
})

async function load(id: string | null) {
  const token = detailGuard.beginReplace()
  record.value = null
  if (!id) {
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const result = await api.get<FeedbackRecord>(`/feedback/${id}`)
    if (!detailGuard.isCurrent(token)) return
    record.value = result
  } catch (e) {
    if (!detailGuard.isCurrent(token)) return
    toast.error(translateError((e as ApiError).message))
    emit('update:open', false)
  } finally {
    if (detailGuard.isCurrent(token)) isLoading.value = false
  }
}

async function forward() {
  const current = record.value
  if (!current || isForwarding.value) return
  isForwarding.value = true
  try {
    const updated = await api.post<FeedbackRecord>(`/feedback/${current.id}/forward`)
    if (record.value?.id === updated.id) record.value = updated
    emit('updated', updated)
    if (updated.githubStatus === 'sent') {
      toast.success(t('feedback.admin.forwarded'))
    } else {
      toast.error(t('feedback.admin.forwardFailed'))
    }
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isForwarding.value = false
  }
}

watch(() => props.feedbackId, (id) => load(id), { immediate: true })
</script>

<template>
  <Sheet :open="open" @update:open="(value: boolean) => emit('update:open', value)">
    <SheetContent side="right" class="flex h-full w-full flex-col gap-0 overflow-y-auto px-4 sm:max-w-xl sm:px-6">
      <SheetHeader class="text-left pr-8">
        <SheetTitle>{{ t('feedback.admin.detailTitle') }}</SheetTitle>
        <SheetDescription v-if="record">{{ formatDateTime(record.createdAt, locale) }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoading" class="space-y-4 py-6" aria-busy="true">
        <div v-for="i in 4" :key="i" class="h-6 rounded bg-muted animate-pulse" />
      </div>

      <div v-else-if="record" class="space-y-6 py-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <p class="text-xs text-muted-foreground">{{ t('feedback.admin.createdAt') }}</p>
            <p class="font-medium">{{ formatDateTime(record.createdAt, locale) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('feedback.admin.callSign') }}</p>
            <p class="font-medium font-mono">{{ record.callSign || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('feedback.categoryLabel') }}</p>
            <p class="font-medium">{{ t(`feedback.categories.${record.category}.title`) }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ t('feedback.admin.githubStatus') }}</p>
            <div class="mt-1">
              <FeedbackGithubStatusBadge
                :status="record.githubStatus"
                :issue-number="record.githubIssueNumber"
                :issue-url="record.githubIssueUrl"
              />
            </div>
          </div>
        </div>

        <section>
          <h3 class="text-sm font-medium text-muted-foreground mb-2">{{ t('feedback.summaryLabel') }}</h3>
          <p class="font-medium break-words">{{ record.summary }}</p>
        </section>

        <section>
          <h3 class="text-sm font-medium text-muted-foreground mb-2">{{ t('feedback.bodyLabel') }}</h3>
          <p class="whitespace-pre-wrap break-words text-sm">{{ record.body }}</p>
        </section>

        <p
          v-if="record.category === 'security'"
          class="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/40 rounded-md p-3 bg-amber-500/5"
          role="status"
        >
          {{ t('feedback.admin.securityNotForwardable') }}
        </p>

        <section v-if="record.githubError">
          <h3 class="text-sm font-medium text-muted-foreground mb-2">{{ t('feedback.admin.lastError') }}</h3>
          <p class="text-sm break-words text-destructive">{{ record.githubError }}</p>
        </section>

        <div v-if="canForward">
          <Button
            variant="outline"
            class="trac-page-action-btn"
            :disabled="isForwarding"
            @click="forward"
          >
            <Send class="h-4 w-4" aria-hidden="true" />
            {{ isForwarding ? t('feedback.admin.forwarding') : t('feedback.admin.forward') }}
          </Button>
        </div>

        <template v-if="record.attachmentPaths.length">
          <Separator />
          <section>
            <h3 class="text-sm font-medium text-muted-foreground mb-2">{{ t('feedback.admin.attachments') }}</h3>
            <p class="text-xs text-muted-foreground mb-3">{{ t('feedback.admin.openFullSize') }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <a
                v-for="(path, index) in record.attachmentPaths"
                :key="path"
                :href="getUploadedFileUrl(path)"
                target="_blank"
                rel="noopener noreferrer"
                class="block overflow-hidden rounded-md border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  :src="getUploadedFileUrl(path)"
                  :alt="t('feedback.admin.attachmentAlt', { n: index + 1 })"
                  loading="lazy"
                  class="h-32 w-full object-contain"
                />
              </a>
            </div>
          </section>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
