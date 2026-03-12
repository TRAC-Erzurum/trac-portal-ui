<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Edit, Map, MapPin } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import LocatorMapPreview from '@/components/shared/LocatorMapPreview.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const userGrid = computed(() =>
  authStore.user?.operator?.gridSquare?.trim()?.toUpperCase() ?? null
)

function openMapOrEdit() {
  if (userGrid.value) {
    router.push({ path: '/map', query: { locator: userGrid.value } })
  } else {
    router.push({ path: '/account', query: { edit: 'operator' } })
  }
}
</script>

<template>
  <div class="rounded-lg border border-border bg-background overflow-hidden">
    <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <MapPin class="h-4 w-4 shrink-0" aria-hidden="true" />
        {{ t('dashboard.mapPreview') }}
      </h3>
      <Button
        variant="outline"
        size="sm"
        class="shrink-0"
        :aria-label="userGrid ? t('dashboard.openMap') : t('dashboard.addOrEditQth')"
        @click="openMapOrEdit"
      >
        <Map v-if="userGrid" class="mr-2 h-4 w-4" aria-hidden="true" />
        <Edit v-else class="mr-2 h-4 w-4" aria-hidden="true" />
        {{ userGrid ? t('dashboard.openMap') : t('dashboard.addOrEditQth') }}
      </Button>
    </div>
    <LocatorMapPreview
      :grid-square="userGrid"
      :standalone="false"
      :interactive="false"
    />
  </div>
</template>
