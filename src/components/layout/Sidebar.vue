<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Award, BarChart3, Building2, ClipboardList, Map, MessageSquareText, PanelLeft, PanelLeftClose, Radio, Siren, TowerControl, UserCog, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'

const MOBILE_HIDDEN_ROUTES = ['/dashboard', '/nets', '/map']

const props = defineProps<{
  collapsed: boolean
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'update:mobileOpen': [value: boolean]
}>()

const sidebarHovered = ref(false)
const isMobile = ref(false)
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const feedbackStore = useFeedbackStore()

const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)') : null
function updateIsMobile() {
  isMobile.value = mediaQuery?.matches ?? false
}
onMounted(() => {
  updateIsMobile()
  mediaQuery?.addEventListener('change', updateIsMobile)
})
onUnmounted(() => {
  mediaQuery?.removeEventListener('change', updateIsMobile)
})

const effectiveExpanded = computed(
  () => isMobile.value || !props.collapsed || sidebarHovered.value
)

const allNavItems = computed(() => {
  const operatorId = authStore.user?.operator?.id

  const items = [
    { icon: BarChart3, label: t('nav.insights'), route: '/insights', restricted: true },
    { icon: ClipboardList, label: t('nav.inventory'), route: `/operators/${operatorId}/inventory`, restricted: true },
    { icon: Award, label: t('nav.certificates'), route: '/certificates', restricted: true },
    { icon: Map, label: t('nav.map'), route: '/map', restricted: false },
    { icon: Siren, label: t('nav.disasters'), route: '/disasters', restricted: false },
    { icon: TowerControl, label: t('nav.communicationChannels'), route: '/communication-channels', restricted: false },
    { icon: Radio, label: t('nav.nets'), route: '/nets', restricted: true },
    { icon: Building2, label: t('nav.branches'), route: '/branches', restricted: true },
    { icon: Users, label: t('nav.operators'), route: '/operators', restricted: true },
  ]
  if (authStore.isSuperAdmin) {
    items.push({ icon: ClipboardList, label: t('inventory.inventoryManagement'), route: '/admin/inventory', restricted: false })
    items.push({ icon: UserCog, label: t('nav.userManagement'), route: '/admin/users', restricted: false })
  }
  return items
})

const navItems = computed(() => {
  if (!isMobile.value) return allNavItems.value
  return allNavItems.value.filter((item) => !MOBILE_HIDDEN_ROUTES.includes(item.route))
})

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function isRestricted(item: { restricted: boolean }) {
  return item.restricted && authStore.isGuest
}

function handleNavClick(item: { route: string; restricted: boolean }, event: Event) {
  event.preventDefault()
  if (isRestricted(item)) {
    toast.error(t(authStore.guestRestrictionKey))
    return
  }
  if (isMobile.value) emit('update:mobileOpen', false)
  router.push(item.route)
}

function toggleCollapse() {
  if (isMobile.value) {
    emit('update:mobileOpen', false)
  } else {
    emit('update:collapsed', !props.collapsed)
  }
}

function openFeedbackSheet() {
  feedbackStore.openSheet()
  if (isMobile.value) emit('update:mobileOpen', false)
}
</script>

<template>
  <!-- Mobile backdrop -->
  <div
    v-show="props.mobileOpen && isMobile"
    class="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
    aria-hidden="true"
    @click="emit('update:mobileOpen', false)"
  />
  <aside :class="[
    'flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed top-0 left-0 z-50 lg:z-40',
    props.mobileOpen ? 'flex lg:flex' : 'hidden lg:flex',
    effectiveExpanded ? 'w-64' : 'w-16'
  ]" @mouseenter="sidebarHovered = true" @mouseleave="sidebarHovered = false">
    <div class="h-[57px] lg:h-[65px] flex items-center flex-shrink-0">
      <div :class="['flex items-center gap-3 py-2 text-sm font-medium', effectiveExpanded ? 'px-3' : 'justify-center px-0 w-full']" @click="$router.push('/dashboard')" style="user-select: none; cursor: pointer;">
        <img src="/logo-s.svg" alt="TRAC" class="h-7 w-7 flex-shrink-0" />
        <span v-if="effectiveExpanded" class="text-lg lg:text-xl font-extrabold tracking-wide truncate">TRAC</span>
      </div>
    </div>

    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <a v-for="item in navItems" :key="item.route" href="#" @click="handleNavClick(item, $event)" :class="[
        'flex items-center gap-3 rounded-md transition-colors cursor-pointer',
        effectiveExpanded ? 'px-3 py-2' : 'justify-center px-2 py-2',
        isActive(item.route)
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : isRestricted(item)
            ? 'text-sidebar-foreground/50 hover:bg-sidebar-accent/30'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
      ]" :title="!effectiveExpanded ? item.label : undefined">
        <component :is="item.icon" class="h-5 w-5 flex-shrink-0" />
        <span v-if="effectiveExpanded" class="truncate">{{ item.label }}</span>
      </a>
    </nav>

    <div class="border-t border-sidebar-border flex-shrink-0 p-2 space-y-2">
      <button
        v-if="authStore.isAuthenticated"
        type="button"
        :class="[
          'flex w-full items-center gap-3 rounded-md text-left text-sm font-normal transition-colors cursor-pointer',
          effectiveExpanded ? 'px-3 py-2' : 'justify-center px-2 py-2',
          'text-sidebar-foreground hover:bg-sidebar-accent/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
        ]"
        :aria-label="t('feedback.openSheet')"
        :title="!effectiveExpanded ? t('feedback.openSheet') : undefined"
        @click="openFeedbackSheet"
      >
        <MessageSquareText class="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <span v-if="effectiveExpanded" class="truncate">{{ t('feedback.openSheet') }}</span>
      </button>
      <Button variant="ghost" size="icon" class="w-full h-9" @click="toggleCollapse">
        <component :is="isMobile ? PanelLeftClose : (collapsed ? PanelLeft : PanelLeftClose)" class="h-4 w-4" />
      </Button>
    </div>
  </aside>
</template>