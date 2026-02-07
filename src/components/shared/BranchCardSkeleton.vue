<script setup lang="ts">
interface Props {
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false
})
</script>

<template>
  <div class="p-4 rounded-lg border border-border/50 space-y-2" :class="{ 'space-y-3': !compact }">
    <div class="flex items-start gap-3">
      <div class="h-5 w-5 bg-muted animate-pulse rounded" />
      <div class="flex-1 space-y-2">
        <div class="h-5 w-48 bg-muted animate-pulse rounded" />
        <div class="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    </div>
  </div>
</template>
