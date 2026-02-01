<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Globe } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useLocaleStore, type LocaleMode } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()

const locales: { value: LocaleMode; label: string; isSystem?: boolean }[] = [
  { value: 'system', label: 'A', isSystem: true },
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
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
    <Globe v-if="currentLocale?.isSystem" class="h-4 w-4" />
    <span v-else class="text-xs font-semibold">{{ currentLocale?.label }}</span>
  </Button>
</template>
