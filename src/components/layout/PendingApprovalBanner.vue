<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Clock } from 'lucide-vue-next'

const { t } = useI18n()
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 text-sm border-b border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    role="status"
    aria-live="polite"
  >
    <Clock class="h-4 w-4 shrink-0" />
    <p class="font-medium">
      {{ t('auth.pendingApprovalBanner') }}
    </p>
  </div>
</template>
