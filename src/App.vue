<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import { useThemeStore } from '@/stores/theme'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import CookieConsent from '@/components/shared/CookieConsent.vue'
import FeedbackSheet from '@/components/feedback/FeedbackSheet.vue'
import { useAuthStore } from '@/stores/auth'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
const toasterTheme = computed(() => {
  if (themeStore.mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeStore.mode
})
</script>

<template>
  <router-view />
  <FeedbackSheet v-if="isAuthenticated" />
  <CookieConsent />
  <Toaster position="bottom-right" :theme="toasterTheme" rich-colors />
</template>
