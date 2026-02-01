<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import BottomNav from './BottomNav.vue'

const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="min-h-screen bg-background">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    
    <main
      :class="[
        'transition-all duration-300 pb-16 lg:pb-0',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      ]"
    >
      <slot />
    </main>

    <BottomNav />
  </div>
</template>
