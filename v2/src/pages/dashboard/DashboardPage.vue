<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout.vue'

const { t } = useI18n()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <h1 class="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8">{{ t('dashboard.title') }}</h1>
      
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
    </div>
  </AppLayout>
</template>
