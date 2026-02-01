<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Home, Radio, Users } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()

const navItems = computed(() => [
  { icon: Home, label: t('nav.dashboard'), route: '/dashboard' },
  { icon: Radio, label: t('nav.nets'), route: '/nets' },
  { icon: Users, label: t('nav.operators'), route: '/operators' },
])

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
    <div class="flex items-center justify-around h-16">
      <router-link
        v-for="item in navItems"
        :key="item.route"
        :to="item.route"
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full transition-colors',
          isActive(item.route)
            ? 'text-primary'
            : 'text-muted-foreground'
        ]"
      >
        <component :is="item.icon" class="h-5 w-5" />
        <span class="text-xs mt-1">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>
