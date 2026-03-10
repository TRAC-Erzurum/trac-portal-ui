<script setup lang="ts">
import { Monitor, Server } from 'lucide-vue-next'
import { useAppVersion } from '@/composables'

const { uiVersion, apiVersion } = useAppVersion()
</script>

<template>
  <div class="inline-flex items-center gap-2 text-muted-foreground text-xs" role="img" aria-label="UI and API version">
    <span class="flex items-center gap-1">
      <Monitor class="h-3 w-3 shrink-0" aria-hidden="true" />
      <span class="font-medium tabular-nums">{{ uiVersion }}</span>
    </span>
    <span class="flex items-center gap-1">
      <Server class="h-3 w-3 shrink-0" aria-hidden="true" />
      <span class="font-medium tabular-nums">{{ apiVersion }}</span>
    </span>
  </div>
</template>
