<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import type { Component, PropType } from 'vue'
import { Button } from '@/components/ui/button'

defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  to: {
    type: [String, Object] as PropType<RouteLocationRaw>,
    required: true,
  },
  buttonText: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <component :is="icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
        {{ title }}
      </h3>
      <RouterLink :to="to">
        <Button variant="outline" size="sm" class="gap-1.5">
          {{ buttonText }}
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </RouterLink>
    </div>
    <slot />
  </section>
</template>
