<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { useVModel } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import { normalizeCallSign } from '@/lib/callsign'

const { t } = useI18n()

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  id?: string
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

/**
 * Use provided placeholder or default to i18n translated call sign placeholder
 */
const finalPlaceholder = computed(() => {
  return props.placeholder ?? t('form.callSignPlaceholder')
})

/**
 * Handle input change and normalize the call sign.
 * This ensures:
 * - All input is converted to uppercase
 * - Turkish characters are converted to their ASCII equivalents
 */
function handleInput(event: Event) {
  const inputElement = event.target as HTMLInputElement
  const normalized = normalizeCallSign(inputElement.value)
  modelValue.value = normalized
  // Update the input element's value to reflect normalization immediately
  inputElement.value = normalized
}
</script>

<template>
  <input
    :value="modelValue"
    @input="handleInput"
    data-slot="input"
    type="text"
    :id="id"
    :placeholder="finalPlaceholder"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :class="cn(
      'file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      'uppercase placeholder:normal-case placeholder:text-muted-foreground',
      props.class,
    )"
  />
</template>
