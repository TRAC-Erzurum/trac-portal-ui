<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MapPin } from 'lucide-vue-next'
import DashboardWidget from './DashboardWidget.vue'
import LocatorMapPreview from '@/components/shared/LocatorMapPreview.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const userGrid = computed(() =>
  authStore.user?.operator?.gridSquare?.trim()?.toUpperCase() ?? null
)

const userCity = computed(() =>
  authStore.user?.operator?.city?.trim() ?? ''
)

const userDistrict = computed(() =>
  authStore.user?.operator?.district?.trim() ?? ''
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
  <DashboardWidget :icon="MapPin" :title="t('dashboard.mapPreview')"
    :action="{ click: openMapOrEdit, text: userGrid ? t('dashboard.openMap') : t('dashboard.addOrEditQth') }">
    <LocatorMapPreview :grid-square="userGrid" :city="userCity" :district="userDistrict" variant="dashboard"
      :standalone="false" :interactive="false" class="w-full h-full" />
  </DashboardWidget>
</template>
