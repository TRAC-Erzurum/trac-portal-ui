<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, RefreshCw, RotateCcw, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type {
  DisasterPublishing,
  DisasterPublishingSync,
  PublicationHistoryItem,
  PublicationHistoryPage,
  SaveDisasterPublishing,
} from '@/types/publishing'

interface Props {
  open: boolean
  disasterId: string
  /** An archived disaster is sent without the sharing switch. */
  archived?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t, locale } = useI18n()

const PAGE_SIZE = 20
const REFRESH_MS = 5000

const state = ref<DisasterPublishing | null>(null)
const history = ref<PublicationHistoryItem[]>([])
const historyTotal = ref(0)
const historyPage = ref(1)

const name = ref('')
const intakeUrl = ref('')
const sharedSecret = ref('')
const enabled = ref(true)

const isLoading = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)
const isLoadingMore = ref(false)
const retryingId = ref<string | null>(null)

let refreshTimer: ReturnType<typeof setInterval> | null = null

const hasTarget = computed(() => !!state.value?.target)
/** Sending needs a saved recipient with sharing on — or an archived disaster, which has no "live" sharing. */
const canSend = computed(() => hasTarget.value && (!!state.value?.enabled || !!props.archived))
const hasMore = computed(() => history.value.length < historyTotal.value)

function fillForm(view: DisasterPublishing) {
  name.value = view.target?.name ?? ''
  intakeUrl.value = view.target?.intakeUrl ?? ''
  sharedSecret.value = ''
  enabled.value = view.target ? view.enabled : true
}

async function loadHistory(page = 1, append = false) {
  const res = await api.get<PublicationHistoryPage>(
    `/disaster/${props.disasterId}/publishing/history?page=${page}&limit=${PAGE_SIZE}`,
  )
  history.value = append ? [...history.value, ...res.items] : res.items
  historyTotal.value = res.total
  historyPage.value = res.page
}

/** Reloads the counts and the pages already on screen. */
async function refresh() {
  const view = await api.get<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`)
  state.value = view
  if (!view.target) return
  const shown = Math.max(historyPage.value, 1)
  const res = await api.get<PublicationHistoryPage>(
    `/disaster/${props.disasterId}/publishing/history?page=1&limit=${shown * PAGE_SIZE}`,
  )
  history.value = res.items
  historyTotal.value = res.total
}

async function load() {
  isLoading.value = true
  try {
    const view = await api.get<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`)
    state.value = view
    fillForm(view)
    historyPage.value = 1
    if (view.target) await loadHistory()
    else {
      history.value = []
      historyTotal.value = 0
    }
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isLoading.value = false
  }
}

function stopRefreshing() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
}

/** While records are waiting, the page refreshes so each one's outcome shows up. */
function startRefreshing() {
  stopRefreshing()
  refreshTimer = setInterval(async () => {
    if (!props.open || isSyncing.value || isSaving.value || (state.value?.counts.waiting ?? 0) === 0) return
    try {
      await refresh()
    } catch {
      // the next tick tries again
    }
  }, REFRESH_MS)
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void load()
      startRefreshing()
    } else {
      stopRefreshing()
    }
  },
)

onBeforeUnmount(stopRefreshing)

async function save() {
  if (!state.value?.target && !sharedSecret.value.trim()) {
    toast.error(t('error.publishTargetKeyRequired'))
    return
  }
  isSaving.value = true
  try {
    const body: SaveDisasterPublishing = {
      name: name.value,
      intakeUrl: intakeUrl.value,
      enabled: enabled.value,
      ...(sharedSecret.value.trim() ? { sharedSecret: sharedSecret.value.trim() } : {}),
    }
    const view = await api.put<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`, body)
    state.value = view
    fillForm(view)
    toast.success(t('publishing.disaster.saved'))
    await loadHistory()
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isSaving.value = false
  }
}

async function syncAll() {
  isSyncing.value = true
  try {
    const result = await api.post<DisasterPublishingSync>(`/disaster/${props.disasterId}/publishing/sync`, {})
    state.value = result
    toast.success(t('publishing.history.syncStarted', { queued: result.queued, retried: result.retried }))
    await loadHistory()
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isSyncing.value = false
  }
}

async function retryOne(item: PublicationHistoryItem) {
  retryingId.value = item.id
  try {
    await api.post(`/disaster/${props.disasterId}/publishing/history/${item.id}/retry`, {})
    await refresh()
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    retryingId.value = null
  }
}

async function loadMore() {
  isLoadingMore.value = true
  try {
    await loadHistory(historyPage.value + 1, true)
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isLoadingMore.value = false
  }
}

function typeLabel(item: PublicationHistoryItem): string {
  return item.observationType ? t(`disaster.observationType.${item.observationType}`) : '—'
}

function statusLabel(item: PublicationHistoryItem): string {
  if (item.status === 'FAILED') return t('publishing.history.statusFailed')
  if (item.status === 'PENDING') return t('publishing.history.statusWaiting')
  return item.alreadyExisted ? t('publishing.history.statusAlreadyExisted') : t('publishing.history.statusDelivered')
}

function statusClass(item: PublicationHistoryItem): string {
  if (item.status === 'FAILED') return 'bg-destructive/10 text-destructive'
  if (item.status === 'PENDING') return 'bg-muted text-muted-foreground'
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('publishing.disaster.title') }}</SheetTitle>
        <SheetDescription>{{ t('publishing.disaster.description') }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoading || !state" class="space-y-3 py-4">
        <div v-for="i in 4" :key="i" class="h-10 rounded-md bg-muted/40 animate-pulse" />
      </div>

      <div v-else class="space-y-8 py-4 px-1">
        <form class="space-y-5" @submit.prevent="save">
          <h3 class="text-base font-semibold">{{ t('publishing.settings.title') }}</h3>

          <div class="space-y-2">
            <Label for="publishing-name">{{ t('publishing.settings.name') }}</Label>
            <Input id="publishing-name" v-model="name" maxlength="200" required />
          </div>

          <div class="space-y-2">
            <Label for="publishing-url">{{ t('publishing.settings.address') }}</Label>
            <Input
              id="publishing-url"
              v-model="intakeUrl"
              type="url"
              inputmode="url"
              placeholder="https://…/api/ingest/observations/1"
              required
            />
            <p class="text-xs text-muted-foreground">{{ t('publishing.settings.addressHint') }}</p>
          </div>

          <div class="space-y-2">
            <Label for="publishing-key">{{ t('publishing.settings.key') }}</Label>
            <Input
              id="publishing-key"
              v-model="sharedSecret"
              type="password"
              autocomplete="off"
              :required="!hasTarget"
            />
            <p class="text-xs text-muted-foreground">
              {{ hasTarget ? t('publishing.settings.keyKeepHint') : t('publishing.settings.keyHint') }}
            </p>
          </div>

          <div class="flex items-start gap-3">
            <Checkbox id="publishing-enabled" v-model="enabled" class="mt-0.5" />
            <div class="space-y-1">
              <Label for="publishing-enabled">{{ t('publishing.settings.enabled') }}</Label>
              <p class="text-xs text-muted-foreground">{{ t('publishing.settings.enabledHint') }}</p>
            </div>
          </div>

          <div class="trac-sheet-actions">
            <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
              <X class="h-4 w-4 mr-2" />
              {{ t('common.cancel') }}
            </Button>
            <Button type="submit" variant="outline" class="trac-sheet-btn" :disabled="isSaving">
              <Check class="h-4 w-4 mr-2" />
              {{ isSaving ? t('common.loading') : t('common.save') }}
            </Button>
          </div>
        </form>

        <section v-if="hasTarget" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-semibold">{{ t('publishing.history.title') }}</h3>
            <Button type="button" variant="outline" size="sm" :disabled="!canSend || isSyncing" @click="syncAll">
              <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': isSyncing }" />
              {{ t('publishing.history.syncAll') }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">{{ t('publishing.history.syncHint') }}</p>
          <p v-if="!canSend" class="text-xs text-muted-foreground">{{ t('publishing.history.needsEnabled') }}</p>

          <dl class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.counts.delivered }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.history.statusDelivered') }}</dt>
            </div>
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.counts.failed }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.history.statusFailed') }}</dt>
            </div>
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.notSent + state.counts.waiting }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.history.notSent') }}</dt>
            </div>
          </dl>
          <p v-if="state.counts.alreadyExisted > 0" class="text-xs text-muted-foreground">
            {{ t('publishing.history.alreadyExistedCount', { count: state.counts.alreadyExisted }) }}
          </p>

          <p v-if="history.length === 0" class="text-sm text-muted-foreground">{{ t('publishing.history.empty') }}</p>
          <ul v-else class="space-y-2">
            <li v-for="item in history" :key="item.id" class="rounded-md border border-border p-2 text-sm space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">{{ typeLabel(item) }}</span>
                <span class="text-xs text-muted-foreground">{{ formatDateTime(item.observedAt, locale) }}</span>
              </div>
              <p v-if="item.description" class="text-xs text-muted-foreground line-clamp-2">{{ item.description }}</p>
              <div class="flex items-center justify-between gap-2">
                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(item)">
                  {{ statusLabel(item) }}
                </span>
                <Button
                  v-if="item.status === 'FAILED'"
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="!canSend || retryingId === item.id"
                  @click="retryOne(item)"
                >
                  <RotateCcw class="h-4 w-4 mr-2" />
                  {{ t('publishing.history.retry') }}
                </Button>
              </div>
              <p v-if="item.status === 'FAILED' && item.lastResult" class="text-xs text-muted-foreground break-words">
                {{ item.lastResult }}
              </p>
            </li>
          </ul>
          <div v-if="hasMore" class="flex justify-center">
            <Button type="button" variant="outline" size="sm" :disabled="isLoadingMore" @click="loadMore">
              {{ isLoadingMore ? t('common.loading') : t('publishing.history.loadMore') }}
            </Button>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
