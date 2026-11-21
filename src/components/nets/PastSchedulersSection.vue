<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SchedulerCard from '@/components/nets/SchedulerCard.vue'
import { useAsyncStaleGuard } from '@/composables'
import { api } from '@/lib/api'
import type { NetSchedulerStatus } from '@/types/net-scheduler'

interface Scheduler {
  id: string
  name: string
  startDate: string
  endDate?: string | null
  recurrence: string
  scheduledTime?: string
  status?: NetSchedulerStatus
  branch?: { name?: string; isHeadquarters?: boolean } | null
  branchCallSign?: { callSign?: string } | null
  operator?: { callSign?: string; fullName?: string } | null
  certificateTemplateId?: string | null
}

interface SchedulerPage {
  data: Scheduler[]
  total: number
  limit: number
  offset: number
}

/**
 * Collapsed section for paused and ended net plans (`status=inactive`).
 * `query` carries the parent's filters (branch, search) without status/limit/offset.
 * Bump `refreshKey` after any plan change so the section reloads.
 */
const props = defineProps<{
  query: string
  refreshKey: number
  showEditButton?: boolean
}>()

const emit = defineEmits<{
  edit: [id: string]
  updated: []
}>()

const { t } = useI18n()

const PAGE_SIZE = 6
const PANEL_ID = 'past-schedulers-panel'

const expanded = ref(false)
const total = ref(0)
const items = ref<Scheduler[]>([])
const hasMore = ref(false)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const listLoaded = ref(false)

const totalGuard = useAsyncStaleGuard()
const listGuard = useAsyncStaleGuard()

const baseQuery = () => (props.query ? `${props.query}&` : '')

const fetchTotal = async () => {
  const token = totalGuard.beginReplace()
  try {
    const res = await api.get<SchedulerPage>(
      `/net-schedulers?${baseQuery()}status=inactive&limit=1&offset=0`,
    )
    if (!totalGuard.isCurrent(token)) return
    total.value = res.total
  } catch {
    if (!totalGuard.isCurrent(token)) return
    total.value = 0
  }
}

const fetchList = async (append = false) => {
  const token = append ? listGuard.beginAppend() : listGuard.beginReplace()
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }
  try {
    const offset = append ? items.value.length : 0
    const res = await api.get<SchedulerPage>(
      `/net-schedulers?${baseQuery()}status=inactive&limit=${PAGE_SIZE}&offset=${offset}`,
    )
    if (!listGuard.isCurrent(token)) return
    items.value = append ? [...items.value, ...res.data] : res.data
    total.value = res.total
    hasMore.value = items.value.length < res.total
    listLoaded.value = true
  } catch {
    if (!listGuard.isCurrent(token)) return
    if (!append) items.value = []
    hasMore.value = false
  } finally {
    if (listGuard.isCurrent(token)) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const toggle = () => {
  expanded.value = !expanded.value
  if (expanded.value && !listLoaded.value) fetchList()
}

watch(
  () => [props.query, props.refreshKey] as const,
  () => {
    listLoaded.value = false
    fetchTotal()
    if (expanded.value) fetchList()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="total > 0" class="mt-6">
    <button
      type="button"
      class="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      :aria-expanded="expanded"
      :aria-controls="PANEL_ID"
      @click="toggle"
    >
      <ChevronRight
        class="h-4 w-4 shrink-0 transition-transform"
        :class="{ 'rotate-90': expanded }"
        aria-hidden="true"
      />
      {{ t('scheduler.pastPlansSection', { total }) }}
    </button>

    <div v-show="expanded" :id="PANEL_ID" class="mt-3">
      <div v-if="isLoading" class="py-4 text-sm text-muted-foreground">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="items.length === 0" class="py-4 text-sm text-muted-foreground">
        {{ t('common.noResults') }}
      </div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        <SchedulerCard
          v-for="s in items"
          :key="s.id"
          :scheduler="s"
          :show-edit-button="showEditButton"
          @edit="emit('edit', $event)"
          @updated="emit('updated')"
        />
      </div>
      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-4">
        <p v-if="items.length > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ items.length }}/{{ total }} {{ t('scheduler.name') }}
        </p>
        <div v-if="hasMore" class="order-1 lg:order-2 w-full lg:w-auto">
          <Button
            variant="outline"
            class="trac-load-more-btn"
            :disabled="isLoadingMore"
            @click="fetchList(true)"
          >
            <ChevronDown v-if="!isLoadingMore" class="h-4 w-4 mr-2" />
            {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
