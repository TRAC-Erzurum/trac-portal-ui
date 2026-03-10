<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import { useThemeStore } from '@/stores/theme'
import { computed } from 'vue'
import CookieConsent from '@/components/shared/CookieConsent.vue'

const themeStore = useThemeStore()
const toasterTheme = computed(() => {
  if (themeStore.mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeStore.mode
})
</script>

<template>
  <router-view />
  <CookieConsent />
  <Toaster position="bottom-right" :theme="toasterTheme" rich-colors />
</template>
