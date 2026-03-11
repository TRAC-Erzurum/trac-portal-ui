<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div class="border rounded-lg p-4 flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Skeleton class="h-2 w-2 rounded-full" />
        <Skeleton class="h-3.5 w-16" />
      </div>
    </div>

    <div class="flex items-start gap-3">
      <div class="flex-1 space-y-1.5">
        <Skeleton class="h-5 w-40" />
        <Skeleton class="h-3.5 w-28" />
      </div>
      <Skeleton class="h-10 w-10 rounded-md shrink-0" />
    </div>

    <div class="space-y-1.5 pt-1">
      <div class="flex items-center gap-2">
        <Skeleton class="h-3.5 w-20" />
        <Skeleton class="h-3.5 w-24" />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton class="h-3.5 w-16" />
        <Skeleton class="h-3.5 w-20" />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton class="h-3.5 w-24" />
        <Skeleton class="h-3.5 w-16" />
      </div>
    </div>
  </div>
</template>
