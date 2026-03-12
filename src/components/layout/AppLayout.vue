<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ClipboardList, Menu } from 'lucide-vue-next'
import AppFooter from './AppFooter.vue'
import Breadcrumb from './Breadcrumb.vue'
import BottomNav from './BottomNav.vue'
import PendingApprovalBanner from './PendingApprovalBanner.vue'
import Sidebar from './Sidebar.vue'
import UserMenu from './UserMenu.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'

interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  title?: string
  breadcrumbLabel?: string
  breadcrumbItems?: BreadcrumbItem[]
}>()

const sidebarCollapsed = ref(true)
const mobileSidebarOpen = ref(false)
const logoLoaded = ref(false)
const authStore = useAuthStore()
const showPendingBanner = computed(() => authStore.isGuest)
const pendingRequestsCount = ref(0)
const { t } = useI18n()
const router = useRouter()

const showRequestsButton = computed(
  () => (authStore.isAdmin || authStore.isSuperAdmin) && pendingRequestsCount.value > 0
)

const fetchPendingRequestsCount = async () => {
  if (!authStore.isAdmin && !authStore.isSuperAdmin) return
  try {
    const data = await api.get<{ total: number }>('/auth/admin/pending-requests/count')
    pendingRequestsCount.value = data.total
  } catch {
    pendingRequestsCount.value = 0
  }
}

const goToRequests = () => {
  router.push('/admin/requests')
}

onMounted(fetchPendingRequestsCount)
router.afterEach(() => {
  if (authStore.isAdmin || authStore.isSuperAdmin) fetchPendingRequestsCount()
})
provide('refreshPendingRequestsCount', fetchPendingRequestsCount)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background relative overflow-hidden">
    <img v-show="logoLoaded" src="/logo-s.svg" alt="" aria-hidden="true" @load="logoLoaded = true"
      @error="logoLoaded = false"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] object-contain opacity-[0.03] pointer-events-none select-none" />

    <Sidebar v-model:collapsed="sidebarCollapsed" v-model:mobile-open="mobileSidebarOpen" />

    <div :class="[
      'relative flex flex-col flex-1 min-h-0 transition-all duration-300',
      sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
    ]">
      <PendingApprovalBanner v-if="showPendingBanner" />
      <header
        :class="[
          'fixed top-0 right-0 z-20 flex items-center justify-between gap-4 px-6 py-4 lg:px-8 lg:py-5 bg-background border-b border-border/50',
          sidebarCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64'
        ]"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="outline"
            size="icon"
            class="lg:hidden shrink-0"
            :aria-label="t('nav.menu')"
            @click="mobileSidebarOpen = true"
          >
            <Menu class="h-4 w-4" />
          </Button>
          <div class="hidden lg:block min-w-0 flex-1">
            <h1 v-if="title" class="text-2xl lg:text-3xl font-bold truncate">{{ title }}</h1>
            <slot v-else name="title" />
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <Button v-if="showRequestsButton" variant="outline" size="sm"
            class="border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1.5"
            @click="goToRequests">
            <ClipboardList class="h-4 w-4" />
            <span class="hidden sm:inline">{{ t('admin.pendingRequests') }}</span>
            <span class="tabular-nums">({{ pendingRequestsCount }})</span>
          </Button>
          <UserMenu />
        </div>
      </header>

      <main class="relative flex-1 min-h-0 overflow-y-auto pb-16 lg:pb-0 pt-[57px] lg:pt-[65px]">
        <div class="px-6 lg:px-8 pt-5">
          <Breadcrumb :items="breadcrumbItems" :current-label="breadcrumbLabel" class="mb-4" />

          <slot />

          <AppFooter class="mt-6 pt-4 pb-6 lg:pb-8" />
        </div>
      </main>
    </div>

    <BottomNav />
  </div>
</template>
