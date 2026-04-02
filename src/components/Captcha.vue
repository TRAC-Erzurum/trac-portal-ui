<script setup lang="ts">
import { computed } from 'vue'
import VueTurnstile from 'vue-turnstile'
import { useThemeStore } from '@/stores/theme'

const model = defineModel<string>({ default: '' })

const themeStore = useThemeStore()

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

const theme = computed(() => {
  if (themeStore.mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeStore.mode
})

defineExpose({ isEnabled: !!siteKey })
</script>

<template>
  <div v-if="!!siteKey" class="w-full min-w-0 max-w-full overflow-x-auto">
    <VueTurnstile
      :site-key="siteKey"
      v-model="model"
      :theme="theme"
      size="flexible"
    />
  </div>
</template>
