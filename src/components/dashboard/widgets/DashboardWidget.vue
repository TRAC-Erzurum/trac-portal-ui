<script setup lang="ts">
import { type Component, type PropType } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'

interface ActionConfig {
  to?: RouteLocationRaw
  click?: () => void
  text: string
}

defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  action: {
    type: Object as PropType<ActionConfig>,
    default: null,
  },
})

defineSlots<{
  default(): unknown
  footer?(): unknown
}>()
</script>

<template>
  <div class="rounded-lg border border-border bg-background overflow-hidden flex flex-col h-[300px]>">
    <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2">
        <component :is="icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
        <h3 class="text-sm font-medium text-muted-foreground">
          {{ title }}
        </h3>
      </div>
      <div v-if="action" class="shrink-0">
        <RouterLink v-if="action.to" :to="action.to">
          <Button variant="outline" size="sm" class="gap-1.5">
            {{ action.text }}
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </Button>
        </RouterLink>
        <Button v-else-if="action.click" variant="outline" size="sm" class="gap-1.5" @click="action.click">
          {{ action.text }}
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-hidden">
      <slot />
    </div>
    <slot name="footer" />
  </div>
</template>
