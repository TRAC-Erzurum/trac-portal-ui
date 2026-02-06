<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes['class']
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative min-w-0 w-full">
    <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    <Input
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="cn('pl-9 w-full', modelValue ? 'pr-9' : '', props.class)"
      @update:model-value="emit('update:modelValue', $event as string)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="t('common.clear')"
      @click="clear"
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
