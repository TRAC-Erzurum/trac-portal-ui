<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'

const { t } = useI18n()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <h1 class="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8">{{ t('nav.operators') }}</h1>
      <p class="text-muted-foreground">{{ t('common.comingSoon') }}</p>
    </div>
  </AppLayout>
</template>
