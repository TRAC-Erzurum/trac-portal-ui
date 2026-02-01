<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ThemeToggle from './ThemeToggle.vue'
import LangToggle from './LangToggle.vue'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex">
    <div class="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12 relative">
      <div class="max-w-md text-center">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="h-20 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-4xl font-bold mb-4">{{ t('brand.portalTitle') }}</h1>
        <p class="text-lg text-muted-foreground">
          {{ t('brand.tracFull') }}<br>
          {{ t('brand.erzurumBranch') }}
        </p>
        <div class="mt-8 text-8xl font-bold text-primary/10">73</div>
      </div>
      <div class="absolute bottom-6 left-6 flex items-center gap-1">
        <ThemeToggle />
        <LangToggle />
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex flex-col overflow-y-auto">
      <div class="lg:hidden flex items-center justify-end p-4 gap-1 flex-shrink-0">
        <ThemeToggle />
        <LangToggle />
      </div>
      <div class="flex-1 flex items-center justify-center p-6 md:p-8">
        <slot />
      </div>
    </div>
  </div>
</template>
