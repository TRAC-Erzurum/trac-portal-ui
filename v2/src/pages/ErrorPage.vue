<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { AlertTriangle, Home, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}

const retry = () => {
  window.location.reload()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8 bg-background">
    <div class="text-center max-w-md">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-8">
        <AlertTriangle class="h-10 w-10 text-destructive" />
      </div>
      <h1 class="text-3xl font-bold mb-2">{{ t('error.serverError') }}</h1>
      <p class="text-muted-foreground mb-8">{{ t('error.serverErrorDescription') }}</p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" @click="retry">
          <RefreshCw class="h-4 w-4 mr-2" />
          {{ t('common.retry') }}
        </Button>
        <Button variant="outline" @click="goHome">
          <Home class="h-4 w-4 mr-2" />
          {{ t('common.goHome') }}
        </Button>
      </div>
    </div>
  </div>
</template>
