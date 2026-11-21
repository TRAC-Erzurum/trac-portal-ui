<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { MapPin, Grid3x3 } from 'lucide-vue-next'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuthStore } from '@/stores/auth'
import { formatCallSign } from '@/lib/formatters'

const { t } = useI18n()
const authStore = useAuthStore()

const operator = computed(() => authStore.user?.operator ?? null)

const fullName = computed(() => authStore.user?.fullName || operator.value?.fullName || '')

const displayName = computed(() => fullName.value || authStore.user?.email || '')

const callSignLabel = computed(() => {
  const op = operator.value
  if (!op) return ''
  return formatCallSign({ prefix: op.prefix, callSign: op.callSign, suffix: op.suffix })
})

const qthLabel = computed(() => {
  const parts = [operator.value?.district, operator.value?.city].filter(Boolean)
  return parts.join(', ')
})
</script>

<template>
  <RouterLink
    to="/account"
    class="block rounded-lg border border-border bg-background p-4 transition-colors hover:border-border/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div class="flex items-center gap-3 min-w-0">
      <UserAvatar :picture="authStore.user?.picture" class="h-14 w-14 shrink-0" />
      <div class="min-w-0">
        <p class="font-semibold truncate" :title="displayName">{{ displayName }}</p>
        <template v-if="operator">
          <p class="text-sm font-medium text-muted-foreground truncate">{{ callSignLabel }}</p>
        </template>
        <p v-else-if="fullName" class="text-sm text-muted-foreground truncate">{{ authStore.user?.email }}</p>
      </div>
    </div>

    <div v-if="operator && (qthLabel || operator.gridSquare)" class="mt-3 pt-3 border-t border-border/50 space-y-1.5 text-sm">
      <p v-if="qthLabel" class="flex items-center gap-2 min-w-0">
        <MapPin class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="truncate" :title="qthLabel">{{ qthLabel }}</span>
      </p>
      <p v-if="operator.gridSquare" class="flex items-center gap-2 min-w-0">
        <Grid3x3 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span class="truncate">{{ operator.gridSquare }}</span>
      </p>
    </div>
    <span class="sr-only">{{ t('nav.account') }}</span>
  </RouterLink>
</template>
