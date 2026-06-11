<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Radio, UserCog } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center"
    role="status"
    aria-live="polite"
  >
    <div class="flex min-w-0 flex-1 items-start gap-3 text-amber-800 dark:text-amber-200">
      <UserCog class="h-5 w-5 shrink-0" aria-hidden="true" />
      <div class="min-w-0 space-y-0.5">
        <p class="font-medium">{{ t('dashboard.noOperatorBanner.title') }}</p>
        <p class="text-amber-800/90 dark:text-amber-200/90">
          {{ t('dashboard.noOperatorBanner.description') }}
        </p>
      </div>
    </div>
    <Button
      variant="outline"
      size="sm"
      class="shrink-0"
      :title="t('dashboard.noOperatorBanner.action')"
      :aria-label="t('dashboard.noOperatorBanner.action')"
      @click="router.push('/account?edit=operator')"
    >
      <Radio class="h-4 w-4 mr-2" aria-hidden="true" />
      {{ t('dashboard.noOperatorBanner.action') }}
    </Button>
  </div>
</template>
