<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import NameTemplateInput from '@/components/nets/NameTemplateInput.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

const SCHEDULER_PLACEHOLDER_KEYS = [
  'branch_name',
  'branch_callsign',
  'day',
  'month',
  'year',
  'day_of_week',
  'time',
  'operator_callsign',
  'operator_name',
] as const

interface Scheduler {
  id: string
  name: string
  startDate: string
  recurrence: string
  endDate: string | null
  scheduledTime: string
  estimatedDurationMinutes: number
  branch?: { name: string }
  branchCallSign?: { callSign?: string } | null
  operator?: { callSign: string; fullName?: string }
}

const props = defineProps<{
  open: boolean
  schedulerId: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const scheduler = ref<Scheduler | null>(null)
const name = ref('')
const scheduledTime = ref('20:00')

const namePreview = computed(() => {
  const s = scheduler.value
  if (!s?.startDate) return name.value.replace(/\{\{[^}]*\}\}/g, '')
  const branchName = s.branch?.name ?? ''
  const branchCallsign = s.branchCallSign?.callSign ?? ''
  const date = new Date(s.startDate + 'T12:00:00')
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('tr-TR', { month: 'long' })
  const year = String(date.getFullYear())
  const dayOfWeek = date.toLocaleDateString('tr-TR', { weekday: 'long' })
  const time = (scheduledTime.value || (s.scheduledTime?.slice(0, 5) ?? '20:00'))
  const operatorCallsign = s.operator?.callSign ?? ''
  const operatorName = s.operator?.fullName ?? ''
  return name.value
    .replace(/\{\{branch_name\}\}/gi, branchName)
    .replace(/\{\{branch_callsign\}\}/gi, branchCallsign)
    .replace(/\{\{day\}\}/g, day)
    .replace(/\{\{month\}\}/g, month)
    .replace(/\{\{year\}\}/g, year)
    .replace(/\{\{day_of_week\}\}/g, dayOfWeek)
    .replace(/\{\{time\}\}/g, time)
    .replace(/\{\{operator_callsign\}\}/g, operatorCallsign)
    .replace(/\{\{operator_name\}\}/g, operatorName)
    .replace(/\{\{[^}]*\}\}/g, '')
})

const estimatedDurationMinutes = ref(30)
const recurrence = ref<'one_time' | 'daily' | 'weekly' | 'monthly'>('one_time')
const endDate = ref('')
const isLoading = ref(false)
const isLoadingDetail = ref(false)

const scheduledTimeDisplay = computed(() => {
  const raw = scheduler.value?.scheduledTime ?? '20:00:00'
  return raw.slice(0, 5)
})

const loadScheduler = async () => {
  if (!props.schedulerId) return
  isLoadingDetail.value = true
  try {
    scheduler.value = await api.get<Scheduler>(`/net-schedulers/${props.schedulerId}`)
    name.value = scheduler.value.name
    scheduledTime.value = scheduledTimeDisplay.value
    estimatedDurationMinutes.value = scheduler.value.estimatedDurationMinutes ?? 30
    recurrence.value = scheduler.value.recurrence as typeof recurrence.value
    endDate.value = scheduler.value.endDate ?? ''
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isLoadingDetail.value = false
  }
}

watch([() => props.open, () => props.schedulerId], () => {
  if (props.open && props.schedulerId) {
    loadScheduler()
  } else {
    scheduler.value = null
  }
})

const isValid = computed(() => name.value.trim().length > 0)

async function handleSubmit() {
  if (!props.schedulerId || !isValid.value) return
  isLoading.value = true
  try {
    await api.patch(`/net-schedulers/${props.schedulerId}`, {
      name: name.value.trim(),
      scheduledTime: scheduledTime.value,
      estimatedDurationMinutes: estimatedDurationMinutes.value,
      recurrence: recurrence.value,
      endDate: recurrence.value !== 'one_time' && endDate.value ? endDate.value : null,
    })
    toast.success(t('common.save'))
    emit('updated')
    emit('update:open', false)
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isLoading.value = false
  }
}

</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('scheduler.edit') }}</SheetTitle>
        <SheetDescription>{{ t('scheduler.editDescription') }}</SheetDescription>
      </SheetHeader>

      <div v-if="isLoadingDetail" class="py-6 text-sm text-muted-foreground">
        {{ t('common.loading') }}
      </div>

      <template v-else-if="scheduler">
        <form @submit.prevent="handleSubmit" class="mt-4 space-y-6 py-2 px-1">
          <div class="space-y-2">
            <Label for="name">{{ t('nets.nameTemplate') }}</Label>
            <NameTemplateInput
              v-model="name"
              :placeholder-keys="SCHEDULER_PLACEHOLDER_KEYS"
            />
            <p class="text-xs text-muted-foreground break-words whitespace-normal min-w-0">
              {{ t('nets.namePreview') }}: {{ namePreview }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="startDate">{{ t('scheduler.startDate') }}</Label>
            <Input
              id="startDate"
              :model-value="scheduler.startDate"
              type="date"
              disabled
              class="w-full bg-muted"
            />
            <p class="text-xs text-muted-foreground">{{ t('error.schedulerStartDateImmutable') }}</p>
          </div>

          <div class="space-y-2">
            <Label for="recurrence">{{ t('scheduler.recurrence') }}</Label>
            <Select v-model="recurrence">
              <SelectTrigger id="recurrence" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">{{ t('scheduler.oneTime') }}</SelectItem>
                <SelectItem value="daily">{{ t('scheduler.daily') }}</SelectItem>
                <SelectItem value="weekly">{{ t('scheduler.weekly') }}</SelectItem>
                <SelectItem value="monthly">{{ t('scheduler.monthly') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="recurrence !== 'one_time'" class="space-y-2">
            <Label for="endDate">{{ t('scheduler.endDate') }}</Label>
            <Input id="endDate" v-model="endDate" type="date" class="w-full" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="scheduledTime">{{ t('nets.scheduledTime') }}</Label>
              <Input id="scheduledTime" v-model="scheduledTime" type="time" class="w-full" />
            </div>
            <div class="space-y-2">
              <Label for="estimatedDuration">{{ t('nets.estimatedDuration') }}</Label>
              <div class="flex items-center gap-2">
                <Input id="estimatedDuration" v-model.number="estimatedDurationMinutes" type="number" min="1" max="480" class="w-full" />
                <span class="text-sm text-muted-foreground shrink-0">{{ t('nets.minutes') }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-4">
            <Button type="submit" variant="outline" :disabled="!isValid || isLoading">
              {{ t('common.save') }}
            </Button>
            <Button type="button" variant="outline" @click="emit('update:open', false)">
              {{ t('common.cancel') }}
            </Button>
          </div>
        </form>
      </template>
    </SheetContent>
  </Sheet>
</template>
