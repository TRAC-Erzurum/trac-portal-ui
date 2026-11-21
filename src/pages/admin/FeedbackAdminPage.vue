<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Send } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import FeedbackDetailSheet from '@/components/feedback/FeedbackDetailSheet.vue'
import FeedbackGithubStatusBadge from '@/components/feedback/FeedbackGithubStatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAsyncStaleGuard } from '@/composables'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type {
  FeedbackCategory,
  FeedbackForwardPendingResult,
  FeedbackGithubStatus,
  FeedbackListResponse,
  FeedbackRecord,
} from '@/types/feedback'

const PAGE_SIZE = 50
const CATEGORIES: FeedbackCategory[] = ['bug', 'enhancement', 'improvement', 'question', 'security']
const GITHUB_STATUSES: FeedbackGithubStatus[] = ['pending', 'sent', 'failed', 'skipped']

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const items = ref<FeedbackRecord[]>([])
const total = ref(0)
const hasMore = ref(false)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const isForwardingPending = ref(false)
const categoryFilter = ref<FeedbackCategory | 'all'>('all')
const statusFilter = ref<FeedbackGithubStatus | 'all'>('all')

const listGuard = useAsyncStaleGuard()

/** The detail sheet is driven by the URL: `/admin/feedback/:id`. */
const selectedId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))

async function fetchFeedback(append = false) {
  const token = append ? listGuard.beginAppend() : listGuard.beginReplace()
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(append ? items.value.length : 0),
    })
    if (categoryFilter.value !== 'all') params.set('category', categoryFilter.value)
    if (statusFilter.value !== 'all') params.set('githubStatus', statusFilter.value)

    const response = await api.get<FeedbackListResponse>(`/feedback?${params.toString()}`)
    if (!listGuard.isCurrent(token)) return

    items.value = append ? [...items.value, ...response.data] : response.data
    total.value = response.total
    hasMore.value = items.value.length < response.total
  } catch (e) {
    if (!listGuard.isCurrent(token)) return
    toast.error(translateError((e as ApiError).message))
    if (!append) {
      items.value = []
      total.value = 0
      hasMore.value = false
    }
  } finally {
    if (listGuard.isCurrent(token)) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

async function forwardPending() {
  if (isForwardingPending.value) return
  isForwardingPending.value = true
  try {
    const result = await api.post<FeedbackForwardPendingResult>('/feedback/forward-pending')
    toast.success(
      t('feedback.admin.forwardPendingDone', {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
      }),
    )
    await fetchFeedback()
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isForwardingPending.value = false
  }
}

function openRecord(item: FeedbackRecord) {
  router.push({ name: 'admin-feedback-detail', params: { id: item.id } })
}

function onSheetOpenChange(open: boolean) {
  if (!open) router.push({ name: 'admin-feedback' })
}

function onRecordUpdated(updated: FeedbackRecord) {
  items.value = items.value.map((item) => (item.id === updated.id ? updated : item))
}

watch([categoryFilter, statusFilter], () => {
  fetchFeedback()
})

onMounted(() => {
  fetchFeedback()
})
</script>

<template>
  <AppLayout :title="t('nav.feedback')">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-wrap items-center gap-2">
          <Select v-model="categoryFilter">
            <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[140px]" :aria-label="t('feedback.admin.categoryFilter')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('feedback.admin.all') }}</SelectItem>
              <SelectItem v-for="category in CATEGORIES" :key="category" :value="category">
                {{ t(`feedback.categories.${category}.title`) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="statusFilter">
            <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[140px]" :aria-label="t('feedback.admin.statusFilter')">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('feedback.admin.all') }}</SelectItem>
              <SelectItem v-for="status in GITHUB_STATUSES" :key="status" :value="status">
                {{ t(`feedback.admin.status.${status}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="trac-top-actions">
          <Button
            variant="outline"
            class="trac-page-action-btn"
            :disabled="isForwardingPending"
            @click="forwardPending"
          >
            <Send class="h-4 w-4" aria-hidden="true" />
            {{ t('feedback.admin.forwardPending') }}
          </Button>
        </div>
      </div>

      <p v-if="!isLoading" class="text-sm text-muted-foreground">
        {{ items.length }}/{{ total }} {{ t('feedback.admin.countLabel') }}
      </p>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3" aria-busy="true">
        <div v-for="i in 6" :key="i" class="h-32 rounded-lg border border-border bg-muted/30 animate-pulse" />
      </div>

      <div v-else-if="items.length === 0" class="py-8 text-center text-muted-foreground">
        {{ t('feedback.admin.empty') }}
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div
          v-for="item in items"
          :key="item.id"
          class="rounded-lg border border-border p-4 space-y-3"
        >
          <button
            type="button"
            class="block w-full text-left space-y-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="openRecord(item)"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="font-medium break-words min-w-0">{{ item.summary }}</p>
              <span class="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
                {{ t(`feedback.categories.${item.category}.title`) }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ formatDateTime(item.createdAt, locale) }}
              <span aria-hidden="true">·</span>
              <span class="font-mono">{{ item.callSign || '—' }}</span>
            </p>
          </button>

          <div class="flex flex-wrap items-center gap-2">
            <FeedbackGithubStatusBadge
              :status="item.githubStatus"
              :issue-number="item.githubIssueNumber"
              :issue-url="item.githubIssueUrl"
            />
          </div>
        </div>
      </div>

      <div v-if="hasMore && !isLoading" class="pt-4 pb-16 lg:pb-0">
        <Button
          variant="outline"
          class="w-full lg:w-auto lg:px-8"
          :disabled="isLoadingMore"
          @click="fetchFeedback(true)"
        >
          {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
        </Button>
      </div>

      <FeedbackDetailSheet
        :open="!!selectedId"
        :feedback-id="selectedId"
        @update:open="onSheetOpenChange"
        @updated="onRecordUpdated"
      />
    </div>
  </AppLayout>
</template>
