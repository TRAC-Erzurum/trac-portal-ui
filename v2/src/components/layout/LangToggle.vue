<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useLocaleStore, type LocaleMode } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()

const locales: { value: LocaleMode; icon: string }[] = [
  { value: 'system', icon: '🌐' },
  { value: 'tr', icon: '🇹🇷' },
  { value: 'en', icon: '🇬🇧' },
]

function cycleLocale() {
  const currentIndex = locales.findIndex(l => l.value === localeStore.mode)
  const nextIndex = (currentIndex + 1) % locales.length
  const nextLocale = locales[nextIndex]
  if (nextLocale) {
    localeStore.setMode(nextLocale.value)
  }
}

const currentLocale = computed(() => locales.find(l => l.value === localeStore.mode))
const currentLabel = computed(() => t(`locale.${localeStore.mode}`))
</script>

<template>
  <Button variant="ghost" size="icon" @click="cycleLocale" :title="currentLabel">
    <span class="text-lg">{{ currentLocale?.icon }}</span>
  </Button>
</template>
