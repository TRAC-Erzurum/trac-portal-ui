<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import AppFooter from '@/components/layout/AppFooter.vue'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm"
    >
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <router-link
          to="/"
          class="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          aria-label="TRAC"
        >
          <img src="/logo-s.svg" alt="TRAC" class="h-10 w-auto" />
        </router-link>
        <nav class="flex items-center gap-2" aria-label="Account">
          <Button
            variant="outline"
            size="sm"
            class="border-primary text-primary hover:text-primary"
            @click="$router.push('/login')"
          >
            {{ t('auth.login') }}
          </Button>
          <Button variant="outline" size="sm" @click="$router.push('/register')">
            {{ t('auth.register') }}
          </Button>
        </nav>
      </div>
    </header>

    <main class="flex-1 pt-16">
      <div class="container mx-auto px-4 py-6">
        <slot />
      </div>
    </main>

    <AppFooter />
  </div>
</template>
