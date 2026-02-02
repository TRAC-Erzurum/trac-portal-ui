<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')

onErrorCaptured((err, instance, info) => {
  error.value = err
  errorInfo.value = info
  console.error('ErrorBoundary caught:', err, info)
  return false
})

const handleRetry = () => {
  error.value = null
  errorInfo.value = ''
  window.location.reload()
}
</script>

<template>
  <div v-if="error" class="min-h-[400px] flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
        <AlertTriangle class="h-8 w-8 text-destructive" />
      </div>
      <h2 class="text-xl font-semibold mb-2">{{ t('error.somethingWentWrong') }}</h2>
      <p class="text-muted-foreground mb-6">{{ t('error.tryAgainLater') }}</p>
      <Button variant="outline" @click="handleRetry">
        <RefreshCw class="h-4 w-4 mr-2" />
        {{ t('common.retry') }}
      </Button>
    </div>
  </div>
  <slot v-else />
</template>
