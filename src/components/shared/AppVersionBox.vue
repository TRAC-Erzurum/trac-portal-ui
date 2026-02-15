<script setup lang="ts">
import { Monitor, Server } from 'lucide-vue-next'
import { useAppVersion } from '@/composables'

const { uiVersion, apiVersion } = useAppVersion()

const hasAny = (ui: string, api: string) => ui.trim().length > 0 || api.trim().length > 0
</script>

<template>
  <div
    v-if="hasAny(uiVersion, apiVersion)"
    class="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 text-muted-foreground px-2 py-1.5 text-xs"
    role="img"
    aria-label="UI and API version"
  >
    <span class="flex items-center gap-1.5">
      <Monitor class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span v-if="uiVersion.trim()" class="font-medium tabular-nums">{{ uiVersion }}</span>
    </span>
    <span class="h-3 w-px shrink-0 bg-border" aria-hidden="true" />
    <span class="flex items-center gap-1.5">
      <Server class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span v-if="apiVersion.trim()" class="font-medium tabular-nums">{{ apiVersion }}</span>
    </span>
  </div>
</template>
