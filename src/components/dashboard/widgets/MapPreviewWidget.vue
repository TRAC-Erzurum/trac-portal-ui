<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LocatorMapPreview from '@/components/shared/LocatorMapPreview.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const userGrid = computed(() =>
  authStore.user?.operator?.gridSquare?.trim()?.toUpperCase() ?? null
)

function goToMap() {
  if (userGrid.value) {
    router.push({ path: '/map', query: { locator: userGrid.value } })
  } else {
    router.push({ path: '/account', query: { edit: 'operator' } })
  }
}
</script>

<template>
  <div
    role="button"
    tabindex="0"
    class="rounded-lg border border-border bg-background overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :aria-label="userGrid ? t('map.title') : t('dashboard.mapPreviewNoQth')"
    @click="goToMap"
    @keydown.enter="goToMap"
    @keydown.space.prevent="goToMap"
  >
    <div class="px-3 py-2 border-b border-border/50">
      <h3 class="text-sm font-medium text-muted-foreground">
        {{ t('dashboard.mapPreview') }}
      </h3>
    </div>
    <LocatorMapPreview
      :grid-square="userGrid"
      :standalone="false"
      @click="goToMap"
    />
  </div>
</template>
