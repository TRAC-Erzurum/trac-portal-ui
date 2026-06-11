<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ObservationSeverity } from '@/types/disaster'

type SeverityValue = ObservationSeverity | 'NONE'

const props = defineProps<{
  modelValue: SeverityValue
  labelId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SeverityValue]
}>()

const { t } = useI18n()

const options: {
  value: SeverityValue
  labelKey: string
  colorClass?: string
  ringClass?: string
}[] = [
  { value: 'NONE', labelKey: 'disaster.severityNone', ringClass: 'ring-border' },
  {
    value: 'LOW',
    labelKey: 'disaster.severityLevel.LOW',
    colorClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    ringClass: 'ring-blue-500',
  },
  {
    value: 'MEDIUM',
    labelKey: 'disaster.severityLevel.MEDIUM',
    colorClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    ringClass: 'ring-amber-500',
  },
  {
    value: 'HIGH',
    labelKey: 'disaster.severityLevel.HIGH',
    colorClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    ringClass: 'ring-orange-500',
  },
  {
    value: 'CRITICAL',
    labelKey: 'disaster.severityLevel.CRITICAL',
    colorClass: 'bg-red-500/15 text-red-700 dark:text-red-300',
    ringClass: 'ring-red-500',
  },
]

function select(value: SeverityValue) {
  emit('update:modelValue', value)
}

function optionClass(opt: (typeof options)[number]): string {
  const selected = props.modelValue === opt.value
  if (selected) {
    if (opt.colorClass) {
      return `${opt.colorClass} ring-2 ring-offset-1 ${opt.ringClass}`
    }
    return 'bg-muted text-foreground ring-2 ring-offset-1 ring-border'
  }
  return 'border border-border text-muted-foreground hover:bg-muted/50'
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-labelledby="labelId"
    class="flex flex-wrap gap-2"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="optionClass(opt)"
      @click="select(opt.value)"
    >
      {{ t(opt.labelKey) }}
    </button>
  </div>
</template>
