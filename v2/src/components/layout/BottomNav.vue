<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Home, Radio, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

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
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
    <div class="flex items-center justify-around h-16">
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
