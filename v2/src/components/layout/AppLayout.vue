<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import BottomNav from './BottomNav.vue'
import UserMenu from './UserMenu.vue'
import ThemeToggle from './ThemeToggle.vue'
import LangToggle from './LangToggle.vue'

defineProps<{
  title?: string
}>()

const sidebarCollapsed = ref(false)
const logoLoaded = ref(false)
</script>

<template>
  <div class="min-h-screen bg-background relative overflow-hidden">
    <img
      v-show="logoLoaded"
      src="/logo-s.svg"
      alt=""
      aria-hidden="true"
      @load="logoLoaded = true"
      @error="logoLoaded = false"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] object-contain opacity-[0.03] pointer-events-none select-none"
    />
    
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    
    <main
      :class="[
        'relative transition-all duration-300 pb-16 lg:pb-0',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      ]"
    >
      <div class="p-6 lg:p-8">
        <header class="flex items-center justify-between mb-6 lg:mb-8">
          <h1 v-if="title" class="text-2xl lg:text-3xl font-bold">{{ title }}</h1>
          <slot v-else name="title" />
          <div class="flex items-center gap-1">
            <ThemeToggle />
            <LangToggle />
            <div class="ml-2">
              <UserMenu />
            </div>
          </div>
        </header>
        
        <slot />
      </div>
    </main>

    <BottomNav />
  </div>
</template>
