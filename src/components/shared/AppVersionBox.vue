<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor, Server, Tag } from 'lucide-vue-next'
import { useAppVersion } from '@/composables'

const { t } = useI18n()
const { uiVersion, apiVersion } = useAppVersion()

const versionsMatch = computed(() => uiVersion.value === apiVersion.value)

const versionAriaLabel = computed(() =>
  versionsMatch.value
    ? t('common.appVersionAriaSingle', { version: uiVersion.value })
    : t('common.appVersionAriaSplit', { ui: uiVersion.value, api: apiVersion.value }),
)
</script>

<template>
  <div
    class="inline-flex items-center gap-2 text-muted-foreground text-xs"
    role="img"
    :aria-label="versionAriaLabel"
  >
    <template v-if="versionsMatch">
      <span class="flex items-center gap-1">
        <Tag class="h-3 w-3 shrink-0" aria-hidden="true" />
        <span class="font-medium tabular-nums">{{ uiVersion }}</span>
      </span>
    </template>
    <template v-else>
      <span class="flex items-center gap-1">
        <Monitor class="h-3 w-3 shrink-0" aria-hidden="true" />
        <span class="font-medium tabular-nums">{{ uiVersion }}</span>
      </span>
      <span class="flex items-center gap-1">
        <Server class="h-3 w-3 shrink-0" aria-hidden="true" />
        <span class="font-medium tabular-nums">{{ apiVersion }}</span>
      </span>
    </template>
  </div>
</template>
