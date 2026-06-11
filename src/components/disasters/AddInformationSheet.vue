<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import ObservationPhotoInput from '@/components/disasters/ObservationPhotoInput.vue'
import SeverityRadioGroup from '@/components/disasters/SeverityRadioGroup.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { translateError } from '@/i18n'
import { getAllowedChildTypes } from '@/lib/observation-hierarchy'
import { api, type ApiError } from '@/lib/api'
import type { Observation, ObservationSeverity, ObservationType } from '@/types/disaster'

const props = defineProps<{
  open: boolean
  disasterId: string
  parentObservation: Observation | null
  initialType?: ObservationType
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { t } = useI18n()

const type = ref<ObservationType | ''>('')
const severity = ref<ObservationSeverity | 'NONE'>('NONE')
const description = ref('')
const eventTime = ref('')
const photoFiles = ref<File[]>([])
const isLoading = ref(false)

const allowedTypes = computed(() => {
  if (!props.parentObservation) return []
  return getAllowedChildTypes(props.parentObservation.type)
})

function toLocalDatetimeValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const showTypeSelect = computed(
  () => !props.initialType,
)

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const preset =
      props.initialType && allowedTypes.value.includes(props.initialType)
        ? props.initialType
        : allowedTypes.value[0] ?? ''
    type.value = preset
    severity.value = 'NONE'
    description.value = ''
    eventTime.value = toLocalDatetimeValue()
    photoFiles.value = []
  }
})

async function handleSubmit() {
  if (!props.parentObservation || !type.value) {
    toast.error(t('form.validation.required'))
    return
  }

  isLoading.value = true
  try {
    const created = await api.post<Observation>(
      `/disaster/${props.disasterId}/observations`,
      {
        parentObservationId: props.parentObservation.id,
        type: type.value,
        severity: severity.value === 'NONE' ? undefined : severity.value,
        description: description.value.trim() || undefined,
        eventTime: eventTime.value ? new Date(eventTime.value).toISOString() : undefined,
      },
    )
    if (photoFiles.value.length > 0) {
      const formData = new FormData()
      for (const file of photoFiles.value) {
        formData.append('photos', file)
      }
      await api.post(`/observation/${created.id}/photos`, formData)
    }
    toast.success(t('disaster.addInformationSuccess'))
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
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('disaster.addInformation') }}</SheetTitle>
        <SheetDescription>{{ t('disaster.addInformationDescription') }}</SheetDescription>
      </SheetHeader>

      <form class="space-y-4 py-4 px-1" @submit.prevent="handleSubmit">
        <div v-if="showTypeSelect" class="space-y-2">
          <Label for="add-info-type">{{ t('disaster.typeLabel') }}</Label>
          <Select v-model="type">
            <SelectTrigger id="add-info-type" class="w-full">
              <SelectValue :placeholder="t('disaster.selectType')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in allowedTypes" :key="opt" :value="opt">
                {{ t(`disaster.observationType.${opt}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label id="add-info-severity-label">{{ t('disaster.severity') }}</Label>
          <SeverityRadioGroup v-model="severity" label-id="add-info-severity-label" />
        </div>

        <div class="space-y-2">
          <Label for="add-info-event-time">{{ t('disaster.eventTime') }}</Label>
          <input
            id="add-info-event-time"
            v-model="eventTime"
            type="datetime-local"
            class="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div class="space-y-2">
          <Label for="add-info-description">{{ t('disaster.description') }}</Label>
          <Textarea
            id="add-info-description"
            v-model="description"
            :placeholder="t('disaster.descriptionPlaceholder')"
            rows="3"
          />
        </div>

        <ObservationPhotoInput v-model="photoFiles" />

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" class="trac-sheet-btn" :disabled="isLoading">
            <Check class="h-4 w-4 mr-2" />
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
