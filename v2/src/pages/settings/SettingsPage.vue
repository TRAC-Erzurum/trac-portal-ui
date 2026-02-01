<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AppLayout from '@/components/layout/AppLayout.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import LangToggle from '@/components/layout/LangToggle.vue'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'

const { t } = useI18n()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()
</script>

<template>
  <AppLayout>
    <div class="p-6 lg:p-8">
      <h1 class="text-2xl lg:text-3xl font-bold mb-6 lg:mb-8">{{ t('nav.settings') }}</h1>
      
      <div class="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{{ t('settings.appearance') }}</CardTitle>
            <CardDescription>{{ t('settings.appearanceDesc') }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">{{ t('settings.theme') }}</div>
                <div class="text-sm text-muted-foreground">{{ t(`theme.${themeStore.mode}`) }}</div>
              </div>
              <ThemeToggle />
            </div>
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">{{ t('settings.language') }}</div>
                <div class="text-sm text-muted-foreground">{{ t(`locale.${localeStore.mode}`) }}</div>
              </div>
              <LangToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
