<script setup lang="ts">
import { Monitor, Server } from 'lucide-vue-next'
import { useAppVersion } from '@/composables'

const { uiVersion, apiVersion } = useAppVersion()

const hasAny = (ui: string, api: string) => ui.trim().length > 0 || api.trim().length > 0
</script>

<template>
  <div
    v-if="hasAny(uiVersion, apiVersion)"
    class="inline-flex items-center rounded-md border border-border bg-muted/30 text-muted-foreground"
    role="img"
    aria-label="UI and API version"
  >
    <span
      class="flex items-center justify-center p-1.5 border-r border-border"
      :title="uiVersion.trim() || undefined"
    >
      <Monitor class="h-3.5 w-3.5" aria-hidden="true" />
    </span>
    <span
      class="flex items-center justify-center p-1.5"
      :title="apiVersion.trim() || undefined"
    >
      <Server class="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  </div>
</template>
