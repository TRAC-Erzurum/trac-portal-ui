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
    class="inline-flex items-center gap-1.5 text-muted-foreground cursor-help"
    role="img"
    :aria-label="versionAriaLabel"
  >
    <template v-if="versionsMatch">
      <Tag class="h-3.5 w-3.5 shrink-0" aria-hidden="true" :title="uiVersion" />
    </template>
    <template v-else>
      <Monitor
        class="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
        :title="t('common.appVersionTooltipUi', { version: uiVersion })"
      />
      <Server
        class="h-3.5 w-3.5 shrink-0"
        aria-hidden="true"
        :title="t('common.appVersionTooltipApi', { version: apiVersion })"
      />
    </template>
  </div>
</template>
