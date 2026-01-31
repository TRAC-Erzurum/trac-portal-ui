<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">{{ t('dashboard.title') }}</h1>
      
      <div class="grid gap-4 md:grid-cols-3">
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
      
      <div class="mt-8">
        <Button variant="outline" @click="handleLogout">
          {{ t('auth.logout') }}
        </Button>
      </div>
    </div>
  </div>
</template>
