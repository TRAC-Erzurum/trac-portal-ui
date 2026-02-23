<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronRight } from 'lucide-vue-next'

interface BreadcrumbItem {
  label: string
  to?: string
}

const props = defineProps<{
  items?: BreadcrumbItem[]
  currentLabel?: string
}>()

const { t } = useI18n()
const route = useRoute()

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (props.items && props.items.length > 0) {
    return props.items
  }

  const items: BreadcrumbItem[] = []
  const path = route.path

  if (path === '/dashboard') {
    return []
  }

  items.push({ label: t('nav.home'), to: '/dashboard' })

  if (path.startsWith('/nets/')) {
    items.push({ label: t('nav.nets'), to: '/nets' })
  } else if (path.startsWith('/operators/')) {
    items.push({ label: t('nav.operators'), to: '/operators' })
  } else if (path.startsWith('/branches/')) {
    items.push({ label: t('nav.branches'), to: '/branches' })
  } else if (path.startsWith('/communication-channels')) {
    items.push({ label: t('nav.communicationChannels'), to: '/communication-channels' })
  }

  return items
})

const currentPageLabel = computed(() => {
  if (props.currentLabel) {
    return props.currentLabel
  }

  const path = route.path
  
  if (path === '/nets') return t('nav.nets')
  if (path === '/operators') return t('nav.operators')
  if (path === '/branches') return t('nav.branches')
  if (path === '/communication-channels') return t('nav.communicationChannels')
  if (path === '/account') return t('nav.account')
  
  return null
})

const showBreadcrumb = computed(() => {
  return breadcrumbItems.value.length > 0
})

/** Do not repeat label when last item already links to current page (e.g. /communication-channels) */
const displayCurrentLabel = computed(() => {
  if (!currentPageLabel.value) return null
  const items = breadcrumbItems.value
  if (items.length === 0) return currentPageLabel.value
  const last = items[items.length - 1]
  if (last?.to === route.path) return null
  return currentPageLabel.value
})
</script>

<template>
  <nav v-if="showBreadcrumb" class="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
    <template v-for="(item, index) in breadcrumbItems" :key="index">
      <router-link
        :to="item.to!"
        class="hover:text-foreground transition-colors"
      >
        {{ item.label }}
      </router-link>
      <ChevronRight
        v-if="index < breadcrumbItems.length - 1 || displayCurrentLabel"
        class="h-3 w-3 sm:h-3.5 sm:w-3.5"
      />
    </template>
    <span v-if="displayCurrentLabel" class="text-foreground truncate max-w-[200px] sm:max-w-none">{{ displayCurrentLabel }}</span>
  </nav>
</template>
