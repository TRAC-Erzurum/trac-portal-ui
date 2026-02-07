<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Radio } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

interface Props {
  activeNetsCount?: number
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeNetsCount: 0,
  isLoading: false,
})

const { t } = useI18n()
const authStore = useAuthStore()

const callSign = computed(() => authStore.user?.operator?.callSign || '')
const hasActiveNets = computed(() => props.activeNetsCount > 0)
</script>

<template>
  <div class="flex items-center justify-between py-2">
    <div class="flex items-center gap-2">
      <span class="text-lg font-semibold">{{ callSign }}</span>
    </div>
    
    <div v-if="isLoading" class="h-6 w-32 bg-muted animate-pulse rounded" />
    <div 
      v-else-if="hasActiveNets" 
      class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
    >
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <Radio class="h-4 w-4" />
      <span>{{ activeNetsCount }} {{ t('dashboard.activeNets') }}</span>
    </div>
  </div>
</template>
