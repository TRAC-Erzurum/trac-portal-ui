<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="text-center">
      <h1 class="text-8xl font-bold text-primary/20">404</h1>
      <h2 class="text-2xl font-semibold mt-4">{{ t('notFound.title') }}</h2>
      <p class="text-muted-foreground mt-2">{{ t('notFound.description') }}</p>
      <Button class="mt-6" @click="$router.push('/')">
        {{ t('notFound.backHome') }}
      </Button>
    </div>
  </div>
</template>
