<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Home, Map, Radio } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navItems = computed(() => [
  { icon: Home, label: t('nav.dashboard'), route: '/dashboard', restricted: false },
  { icon: Radio, label: t('nav.nets'), route: '/nets', restricted: true },
  { icon: Map, label: t('nav.map'), route: '/map', restricted: false },
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
    toast.error(t(authStore.guestRestrictionKey))
    return
  }
  router.push(item.route)
}
</script>

<template>
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]"
  >
    <div class="flex h-16 items-center justify-around">
      <a
        v-for="item in navItems"
        :key="item.route"
        href="#"
        @click="handleNavClick(item, $event)"
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full transition-colors cursor-pointer',
          isActive(item.route)
            ? 'text-primary'
            : isRestricted(item)
              ? 'text-muted-foreground/50'
              : 'text-muted-foreground'
        ]"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span class="text-xs mt-1">{{ item.label }}</span>
      </a>
    </div>
  </nav>
</template>
