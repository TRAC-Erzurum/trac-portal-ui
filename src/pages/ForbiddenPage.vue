<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ShieldX, Home } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
const router = useRouter()

const goHome = () => {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8 bg-background">
    <div class="text-center max-w-md">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-8">
        <ShieldX class="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 class="text-3xl font-bold mb-2">{{ t('error.forbidden') }}</h1>
      <p class="text-muted-foreground mb-8">{{ t('error.forbiddenDescription') }}</p>
      <Button variant="outline" @click="goHome">
        <Home class="h-4 w-4 mr-2" />
        {{ t('common.goHome') }}
      </Button>
    </div>
  </div>
</template>
