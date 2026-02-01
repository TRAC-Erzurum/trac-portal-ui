<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

const themes: ThemeMode[] = ['system', 'dark', 'light']

function cycleTheme() {
  const currentIndex = themes.indexOf(themeStore.mode)
  const nextIndex = (currentIndex + 1) % themes.length
  themeStore.setMode(themes[nextIndex])
}

const currentLabel = computed(() => t(`theme.${themeStore.mode}`))
</script>

<template>
  <Button variant="ghost" size="icon" @click="cycleTheme" :title="currentLabel">
    <Monitor v-if="themeStore.mode === 'system'" class="h-4 w-4" />
    <Moon v-else-if="themeStore.mode === 'dark'" class="h-4 w-4" />
    <Sun v-else class="h-4 w-4" />
  </Button>
</template>
