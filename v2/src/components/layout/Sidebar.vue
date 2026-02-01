<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Home, Radio, Users, PanelLeftClose, PanelLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navItems = computed(() => [
  { icon: Home, label: t('nav.dashboard'), route: '/dashboard', restricted: false },
  { icon: Radio, label: t('nav.nets'), route: '/nets', restricted: true },
  { icon: Users, label: t('nav.operators'), route: '/operators', restricted: true },
])

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function isRestricted(item: { restricted: boolean }) {
  return item.restricted && authStore.isGuest
}

function handleNavClick(item: { route: string; restricted: boolean }, event: Event) {
  if (isRestricted(item)) {
    event.preventDefault()
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
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <div
      :class="[
        'flex items-center h-16 border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'justify-between px-3'
      ]"
    >
      <router-link
        to="/dashboard"
        :class="['flex items-center gap-3 overflow-hidden', collapsed ? 'justify-center' : '']"
      >
        <img src="/logo-s.svg" alt="TRAC" class="h-8 w-8 flex-shrink-0" />
        <span v-if="!collapsed" class="font-semibold text-sidebar-foreground truncate">
          {{ t('brand.erzurumBranch') }}
        </span>
      </router-link>
      <Button
        v-if="!collapsed"
        variant="ghost"
        size="icon"
        @click="toggleCollapse"
        class="h-8 w-8 flex-shrink-0"
      >
        <PanelLeftClose class="h-4 w-4" />
      </Button>
    </div>

    <nav class="flex-1 p-2 space-y-1 overflow-y-auto">
      <a
        v-for="item in navItems"
        :key="item.route"
        href="#"
        @click="handleNavClick(item, $event)"
        :class="[
          'flex items-center gap-3 rounded-md transition-colors cursor-pointer',
          collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2',
          isActive(item.route)
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : isRestricted(item)
              ? 'text-sidebar-foreground/50 hover:bg-sidebar-accent/30'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
        ]"
        :title="collapsed ? item.label : undefined"
      >
        <component :is="item.icon" class="h-5 w-5 flex-shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
      </a>
    </nav>

    <div v-if="collapsed" class="p-2 border-t border-sidebar-border">
      <Button
        variant="ghost"
        size="icon"
        @click="toggleCollapse"
        class="w-full h-9"
      >
        <PanelLeft class="h-4 w-4" />
      </Button>
    </div>
  </aside>
</template>
