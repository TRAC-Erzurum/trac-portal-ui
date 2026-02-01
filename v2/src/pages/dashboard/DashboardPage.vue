<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout.vue'

const { t } = useI18n()
</script>

<template>
  <AppLayout :title="t('dashboard.title')">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">{{ t('dashboard.totalNets') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-4xl font-bold">128</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">{{ t('dashboard.myNets') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-4xl font-bold">42</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">{{ t('dashboard.activeOperators') }}</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-4xl font-bold">256</div>
        </CardContent>
      </Card>
    </div>
  </AppLayout>
</template>
