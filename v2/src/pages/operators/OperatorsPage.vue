<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'

const { t } = useI18n()
</script>

<template>
  <AppLayout :title="t('nav.operators')">
    <p class="text-muted-foreground">{{ t('common.comingSoon') }}</p>
  </AppLayout>
</template>
