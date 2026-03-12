<script setup lang="ts">
import LangToggle from '@/components/layout/LangToggle.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import { AppVersionBox } from '@/components/shared'
</script>

<template>
  <footer class="border-t border-border/20 mt-6 pt-4 flex-shrink-0">
    <div class="flex justify-between items-center text-xs text-muted-foreground/80 gap-2 flex-wrap">
      <AppVersionBox />
      <p class="shrink-0">© {{ new Date().getFullYear() }} YM9KE
      </p>
      <div class="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />
        <LangToggle class="hidden" />
        <span>73!</span>
      </div>
    </div>
  </footer>
</template>
