<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Building2, Home, Map, PanelLeft, PanelLeftClose, Radio, TowerControl, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import HeaderBranchDropdown from './HeaderBranchDropdown.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const sidebarHovered = ref(false)
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const effectiveExpanded = computed(() => !props.collapsed || sidebarHovered.value)

const navItems = computed(() => [
  { icon: Home, label: t('nav.dashboard'), route: '/dashboard', restricted: false },
  { icon: Radio, label: t('nav.nets'), route: '/nets', restricted: true },
  { icon: Map, label: t('nav.map'), route: '/map', restricted: false },
  { icon: Building2, label: t('nav.branches'), route: '/branches', restricted: true },
  { icon: Users, label: t('nav.operators'), route: '/operators', restricted: true },
  { icon: TowerControl, label: t('nav.communicationChannels'), route: '/communication-channels', restricted: false },
])

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function isRestricted(item: { restricted: boolean }) {
  return item.restricted && authStore.isGuest
}

function handleNavClick(item: { route: string; restricted: boolean }, event: Event) {
  event.preventDefault()
  if (isRestricted(item)) {
    toast.error(t('error.guestRestriction'))
    return
  }
  router.push(item.route)
}

function toggleCollapse() {
  emit('update:collapsed', !props.collapsed)
}
</script>

<template>
  <aside
    :class="[
      'hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed top-0 left-0 z-40',
      effectiveExpanded ? 'w-64' : 'w-16'
    ]"
    @mouseenter="sidebarHovered = true"
    @mouseleave="sidebarHovered = false"
  >
    <div
      v-if="effectiveExpanded"
      class="h-16 border-b border-sidebar-border flex items-center flex-shrink-0"
    >
      <HeaderBranchDropdown />
    </div>

    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <a
        v-for="item in navItems"
        :key="item.route"
        href="#"
        @click="handleNavClick(item, $event)"
        :class="[
          'flex items-center gap-3 rounded-md transition-colors cursor-pointer',
          effectiveExpanded ? 'px-3 py-2' : 'justify-center px-2 py-2',
          isActive(item.route)
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : isRestricted(item)
              ? 'text-sidebar-foreground/50 hover:bg-sidebar-accent/30'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
        ]"
        :title="!effectiveExpanded ? item.label : undefined"
      >
        <component :is="item.icon" class="h-5 w-5 flex-shrink-0" />
        <span v-if="effectiveExpanded" class="truncate">{{ item.label }}</span>
      </a>
    </nav>

    <div class="p-2 border-t border-sidebar-border flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        @click="toggleCollapse"
        class="w-full h-9"
      >
        <component :is="collapsed ? PanelLeft : PanelLeftClose" class="h-4 w-4" />
      </Button>
    </div>
  </aside>
</template>
