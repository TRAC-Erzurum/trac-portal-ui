<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen p-8">
    <div class="max-w-3xl mx-auto">
      <Button variant="ghost" class="mb-6" @click="$router.back()">
        ← {{ t('common.back') }}
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle class="text-2xl">{{ t('privacy.title') }}</CardTitle>
        </CardHeader>
        <CardContent class="prose prose-invert max-w-none">
          <p class="text-muted-foreground">
            {{ t('privacy.placeholder') }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
