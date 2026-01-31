<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

const themes: { value: ThemeMode; icon: string }[] = [
  { value: 'system', icon: '💻' },
  { value: 'dark', icon: '🌙' },
  { value: 'light', icon: '☀️' },
]

function cycleTheme() {
  const currentIndex = themes.findIndex(th => th.value === themeStore.mode)
  const nextIndex = (currentIndex + 1) % themes.length
  const nextTheme = themes[nextIndex]
  if (nextTheme) {
    themeStore.setMode(nextTheme.value)
  }
}

const currentTheme = computed(() => themes.find(th => th.value === themeStore.mode))
const currentLabel = computed(() => t(`theme.${themeStore.mode}`))
</script>

<template>
  <Button variant="ghost" size="icon" @click="cycleTheme" :title="currentLabel">
    <span class="text-lg">{{ currentTheme?.icon }}</span>
  </Button>
</template>
