<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  title: string
  loading?: boolean
  error?: boolean
  icon?: Component
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
})
</script>

<template>
  <section class="rounded-lg border border-border/50 bg-background p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <component :is="icon" v-if="icon" class="h-4 w-4" />
        {{ title }}
      </h3>
      <slot name="actions" />
    </div>
    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-8 w-3/4 rounded bg-muted" />
      <div class="h-4 w-1/2 rounded bg-muted" />
    </div>
    <div v-else-if="error" class="text-sm text-muted-foreground py-2">
      {{ $t('common.error') }}
    </div>
    <slot v-else />
  </section>
</template>
