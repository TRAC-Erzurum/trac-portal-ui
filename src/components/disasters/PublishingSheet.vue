<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type { DisasterPublishing, DisasterPublishingSync } from '@/types/publishing'

interface Props {
  open: boolean
  disasterId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t, locale } = useI18n()

const state = ref<DisasterPublishing | null>(null)
const enabled = ref(false)
const targetId = ref<string | undefined>(undefined)
const isLoading = ref(false)
const isSaving = ref(false)
const isSyncing = ref(false)

/** While records wait, the counts are refreshed so each one's outcome shows up. */
const REFRESH_MS = 5000
let refreshTimer: ReturnType<typeof setInterval> | null = null

function stopRefreshing() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
}

function startRefreshing() {
  stopRefreshing()
  refreshTimer = setInterval(async () => {
    if (!props.open || isSyncing.value || (state.value?.counts.waiting ?? 0) === 0) return
    try {
      state.value = await api.get<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`)
    } catch {
      // the next tick tries again
    }
  }, REFRESH_MS)
}

onBeforeUnmount(stopRefreshing)

/** Sync needs a saved, switched-on recipient: the form's unsaved choices do not count. */
const canSync = computed(() => !!state.value?.target && state.value.enabled && state.value.target.active)

function observationLabel(issue: { observationType: string | null }): string {
  return issue.observationType ? t(`disaster.observationType.${issue.observationType}`) : '—'
}

/** Active targets, plus the current one even if it has since been deactivated. */
const targetOptions = computed(() => {
  const options = [...(state.value?.availableTargets ?? [])]
  const current = state.value?.target
  if (current && !options.some((o) => o.id === current.id)) {
    options.push({ id: current.id, name: `${current.name} (${t('publishing.targets.inactive')})` })
  }
  return options
})

/** The chosen recipient's own name (without the "inactive" note), for the switch's label. */
const recipientName = computed(() => {
  const current = state.value?.target
  if (current && current.id === targetId.value) return current.name
  return state.value?.availableTargets.find((o) => o.id === targetId.value)?.name ?? null
})

async function load() {
  isLoading.value = true
  try {
    state.value = await api.get<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`)
    enabled.value = state.value.enabled
    targetId.value = state.value.target?.id
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isLoading.value = false
  }
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

async function sync() {
  isSyncing.value = true
  try {
    const result = await api.post<DisasterPublishingSync>(`/disaster/${props.disasterId}/publishing/sync`, {})
    state.value = result
    toast.success(t('publishing.disaster.syncStarted', { queued: result.queued, retried: result.retried }))
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isSyncing.value = false
  }
}

async function save() {
  if (enabled.value && !targetId.value) {
    toast.error(t('error.publishTargetRequired'))
    return
  }
  isSaving.value = true
  try {
    state.value = await api.patch<DisasterPublishing>(`/disaster/${props.disasterId}/publishing`, {
      enabled: enabled.value,
      ...(targetId.value ? { targetId: targetId.value } : {}),
    })
    toast.success(t('publishing.disaster.saved'))
    emit('update:open', false)
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('publishing.disaster.title') }}</SheetTitle>
        <SheetDescription>{{ t('publishing.disaster.description') }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoading || !state" class="space-y-3 py-4">
        <div v-for="i in 3" :key="i" class="h-10 rounded-md bg-muted/40 animate-pulse" />
      </div>

      <form v-else class="space-y-5 py-4 px-1" @submit.prevent="save">
        <div class="space-y-2">
          <Label for="publishing-target">{{ t('publishing.disaster.target') }}</Label>
          <Select v-model="targetId">
            <SelectTrigger id="publishing-target" class="w-full">
              <SelectValue :placeholder="t('publishing.disaster.targetPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in targetOptions" :key="option.id" :value="option.id">
                {{ option.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="targetOptions.length === 0" class="text-xs text-muted-foreground">
            {{ t('publishing.disaster.noTargets') }}
          </p>
          <p v-if="state.target?.authFailing" class="text-xs text-destructive">
            {{ t('publishing.disaster.targetAuthFailing') }}
          </p>
        </div>

        <div class="flex items-start gap-3">
          <Checkbox id="publishing-enabled" v-model="enabled" class="mt-0.5" />
          <div class="space-y-1">
            <Label for="publishing-enabled">
              {{
                recipientName
                  ? t('publishing.disaster.enabledWithName', { name: recipientName })
                  : t('publishing.disaster.enabled')
              }}
            </Label>
            <p class="text-xs text-muted-foreground">{{ t('publishing.disaster.enabledHint') }}</p>
          </div>
        </div>

        <div v-if="state.target" class="space-y-2">
          <p class="text-sm font-medium text-muted-foreground">{{ t('publishing.disaster.status') }}</p>
          <dl class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.counts.delivered }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.disaster.delivered') }}</dt>
            </div>
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.counts.waiting }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.disaster.waiting') }}</dt>
            </div>
            <div class="rounded-md border border-border p-2">
              <dd class="text-lg font-semibold">{{ state.counts.failed }}</dd>
              <dt class="text-xs text-muted-foreground">{{ t('publishing.disaster.failed') }}</dt>
            </div>
          </dl>
          <p v-if="state.counts.alreadyExisted > 0" class="text-xs text-muted-foreground">
            {{ t('publishing.disaster.alreadyExisted', { count: state.counts.alreadyExisted }) }}
          </p>
          <p class="text-xs text-muted-foreground">{{ t('publishing.disaster.photosNotSent') }}</p>
        </div>

        <div v-if="state.target" class="space-y-2">
          <p class="text-sm font-medium text-muted-foreground">{{ t('publishing.disaster.sync') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('publishing.disaster.syncHint') }}</p>
          <p class="text-sm">{{ t('publishing.disaster.notSent', { count: state.notSent }) }}</p>
          <Button type="button" variant="outline" class="w-full" :disabled="!canSync || isSyncing" @click="sync">
            <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': isSyncing }" />
            {{ isSyncing ? t('common.loading') : t('publishing.disaster.syncButton') }}
          </Button>
          <p v-if="!canSync" class="text-xs text-muted-foreground">{{ t('publishing.disaster.syncNeedsEnabled') }}</p>
        </div>

        <div v-if="state.target && state.issues.length > 0" class="space-y-2">
          <p class="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertTriangle class="h-4 w-4" />
            {{ t('publishing.disaster.issues') }}
          </p>
          <ul class="space-y-2">
            <li
              v-for="issue in state.issues"
              :key="issue.observationId"
              class="rounded-md border border-destructive/40 p-2 text-sm space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium">{{ observationLabel(issue) }}</span>
                <span class="text-xs text-muted-foreground">{{ formatDateTime(issue.observedAt, locale) }}</span>
              </div>
              <p v-if="issue.description" class="text-xs text-muted-foreground line-clamp-2">{{ issue.description }}</p>
              <p class="text-xs">
                {{ issue.status === 'FAILED' ? t('publishing.disaster.issueFailed') : t('publishing.disaster.issueRetrying', { count: issue.attempts }) }}
              </p>
              <p v-if="issue.lastResult" class="text-xs text-muted-foreground break-words">{{ issue.lastResult }}</p>
            </li>
          </ul>
          <p v-if="state.counts.failed + state.counts.waiting > state.issues.length" class="text-xs text-muted-foreground">
            {{ t('publishing.disaster.issuesTruncated') }}
          </p>
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
    </SheetContent>
  </Sheet>
</template>
