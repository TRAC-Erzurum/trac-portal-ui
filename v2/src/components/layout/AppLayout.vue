<script setup lang="ts">
import { computed, ref } from 'vue'
import Breadcrumb from './Breadcrumb.vue'
import BottomNav from './BottomNav.vue'
import HeaderBranchDropdown from './HeaderBranchDropdown.vue'
import LangToggle from './LangToggle.vue'
import PendingApprovalBanner from './PendingApprovalBanner.vue'
import Sidebar from './Sidebar.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'
import { useAuthStore } from '@/stores/auth'

interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  title?: string
  breadcrumbLabel?: string
  breadcrumbItems?: BreadcrumbItem[]
}>()

const sidebarCollapsed = ref(false)
const logoLoaded = ref(false)
const authStore = useAuthStore()
const showPendingBanner = computed(() => authStore.isGuest)
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
    
    <PendingApprovalBanner v-if="showPendingBanner" />
    
    <main
      :class="[
        'relative transition-all duration-300 pb-16 lg:pb-0',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      ]"
    >
      <div class="p-6 lg:p-8">
        <header class="flex items-center justify-between mb-3 lg:mb-4 gap-4">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="lg:hidden">
              <HeaderBranchDropdown />
            </div>
            <h1 v-if="title" class="text-2xl lg:text-3xl font-bold truncate">{{ title }}</h1>
            <slot v-else name="title" />
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <LangToggle />
            <div class="ml-2">
              <UserMenu />
            </div>
          </div>
        </header>

        <Breadcrumb :items="breadcrumbItems" :current-label="breadcrumbLabel" />
        
        <slot />
      </div>
    </main>

    <BottomNav />
  </div>
</template>
