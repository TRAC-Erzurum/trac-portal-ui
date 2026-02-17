<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ClipboardList } from 'lucide-vue-next'
import Breadcrumb from './Breadcrumb.vue'
import BottomNav from './BottomNav.vue'
import HeaderBranchDropdown from './HeaderBranchDropdown.vue'
import LangToggle from './LangToggle.vue'
import PendingApprovalBanner from './PendingApprovalBanner.vue'
import Sidebar from './Sidebar.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'
import { AppVersionBox } from '@/components/shared'
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

const sidebarCollapsed = ref(false)
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
    
    <div
      :class="[
        'relative flex flex-col flex-1 min-h-0 transition-all duration-300',
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
      ]"
    >
      <PendingApprovalBanner v-if="showPendingBanner" />
      <main class="relative flex flex-col flex-1 min-h-0 pb-16 lg:pb-0">
      <div class="p-6 lg:p-8 flex flex-col flex-1 min-h-0">
        <header class="flex items-center justify-between mb-3 lg:mb-4 gap-4 flex-shrink-0">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="lg:hidden">
              <HeaderBranchDropdown />
            </div>
            <div class="hidden lg:block min-w-0 flex-1">
              <h1 v-if="title" class="text-2xl lg:text-3xl font-bold truncate">{{ title }}</h1>
              <slot v-else name="title" />
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <Button
              v-if="showRequestsButton"
              variant="outline"
              size="sm"
              class="border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1.5"
              @click="goToRequests"
            >
              <ClipboardList class="h-4 w-4" />
              <span class="hidden sm:inline">{{ t('admin.pendingRequests') }}</span>
              <span class="tabular-nums">({{ pendingRequestsCount }})</span>
            </Button>
            <UserMenu />
          </div>
        </header>

        <Breadcrumb :items="breadcrumbItems" :current-label="breadcrumbLabel" class="flex-shrink-0" />
        
        <div class="flex-1">
          <slot />
        </div>

        <footer class="border-t border-border/20 mt-6 pt-4 flex-shrink-0">
          <div class="flex justify-between items-center text-xs text-muted-foreground/80 gap-2 flex-wrap">
            <p class="shrink-0">© {{ new Date().getFullYear() }} {{ t('brand.erzurumBranch') }}</p>
            <div class="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <LangToggle />
              <AppVersionBox />
              <span>73!</span>
            </div>
          </div>
        </footer>
      </div>
      </main>
    </div>

    <BottomNav />
  </div>
</template>
