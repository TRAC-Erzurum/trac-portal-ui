<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import type { DisasterPublishing } from '@/types/publishing'

interface Props {
  open: boolean
  disasterId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const state = ref<DisasterPublishing | null>(null)
const enabled = ref(false)
const targetId = ref<string | undefined>(undefined)
const isLoading = ref(false)
const isSaving = ref(false)

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
    if (isOpen) void load()
  },
)

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

        <div class="space-y-2">
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
          <p class="text-xs text-muted-foreground">{{ t('publishing.disaster.photosNotSent') }}</p>
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
