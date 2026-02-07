<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div class="w-full p-4 rounded-lg border border-border/50">
    <div class="flex items-start gap-3">
      <Skeleton class="h-8 w-8 rounded-lg flex-shrink-0" />

      <div class="flex-1 min-w-0 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <Skeleton class="h-5 w-32" />
          <Skeleton class="h-4 w-16 rounded" />
        </div>
        <Skeleton class="h-4 w-48" />
        <Skeleton class="h-3 w-24" />
      </div>
    </div>
  </div>
</template>
