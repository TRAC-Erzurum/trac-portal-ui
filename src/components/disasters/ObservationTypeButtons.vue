<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getObservationTypeIcon } from '@/lib/observation-icons'
import type { ObservationType } from '@/types/disaster'

const props = withDefaults(
  defineProps<{
    types: ObservationType[]
    label?: string
    variant?: 'pill' | 'card'
  }>(),
  {
    variant: 'pill',
  },
)

const emit = defineEmits<{
  select: [type: ObservationType]
}>()

const { t } = useI18n()

const listboxLabel = computed(() => props.label ?? t('disaster.selectType'))

function iconForType(type: ObservationType) {
  return getObservationTypeIcon(type)
}

function handleSelect(type: ObservationType) {
  emit('select', type)
}
</script>

<template>
  <div>
    <p v-if="label" class="text-xs text-muted-foreground mb-2">{{ label }}</p>

    <div
      v-if="variant === 'card'"
      class="grid grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-2"
      role="listbox"
      :aria-label="listboxLabel"
    >
      <button
        v-for="obsType in types"
        :key="obsType"
        type="button"
        role="option"
        class="w-full h-20 flex flex-col items-center justify-center gap-1 p-1.5 text-center rounded-lg border border-border bg-background hover:bg-muted/50 active:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors"
        :aria-label="t(`disaster.observationType.${obsType}`)"
        @click="handleSelect(obsType)"
      >
        <component
          :is="iconForType(obsType)"
          class="h-5 w-5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span class="text-[10px] font-medium leading-tight">
          {{ t(`disaster.observationType.${obsType}`) }}
        </span>
      </button>
    </div>

    <div
      v-else
      class="flex flex-wrap gap-2"
      role="listbox"
      :aria-label="listboxLabel"
    >
      <button
        v-for="obsType in types"
        :key="obsType"
        type="button"
        role="option"
        class="inline-flex items-center gap-1.5 min-h-9 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted/50 active:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors"
        :aria-label="t(`disaster.observationType.${obsType}`)"
        @click="handleSelect(obsType)"
      >
        <component
          :is="iconForType(obsType)"
          class="h-4 w-4 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <span class="text-xs font-medium leading-tight">
          {{ t(`disaster.observationType.${obsType}`) }}
        </span>
      </button>
    </div>
  </div>
</template>
