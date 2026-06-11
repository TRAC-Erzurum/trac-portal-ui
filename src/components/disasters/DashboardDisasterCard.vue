<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { AlertTriangle, ChevronRight, Clock, Siren } from 'lucide-vue-next'
import ObservationTypeButtons from '@/components/disasters/ObservationTypeButtons.vue'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/formatters'
import { ROOT_OBSERVATION_TYPES } from '@/lib/observation-hierarchy'
import type { DisasterWithStats, ObservationType } from '@/types/disaster'

const props = defineProps<{
  disaster: DisasterWithStats
}>()

const emit = defineEmits<{
  'add-observation': [disasterId: string, type: ObservationType]
}>()

const { t, locale } = useI18n()

const typeLabel = computed(() => t(`disaster.disasterType.${props.disaster.type}`))

const detailLink = computed(() => `/disasters/${props.disaster.id}`)

const stats = computed(() => props.disaster.stats)

const lastUpdateLabel = computed(() => {
  if (stats.value.lastObservationAt) {
    return formatDateTime(stats.value.lastObservationAt, locale.value)
  }
  return t('disaster.observationsEmpty')
})

function handleTypeSelect(type: ObservationType) {
  emit('add-observation', props.disaster.id, type)
}
</script>

<template>
  <div class="w-full p-4 rounded-lg border border-border/50 bg-transparent flex flex-col">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-x-4 gap-y-2">
      <div class="flex items-start gap-3 min-w-0">
        <Siren class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
        <div class="min-w-0">
          <p class="font-semibold truncate" :title="disaster.name">{{ disaster.name }}</p>
          <p class="mt-0.5 text-sm text-muted-foreground truncate">{{ typeLabel }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <Clock class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{{ t('disaster.lastUpdate') }}:</span>
        <span class="text-foreground">{{ lastUpdateLabel }}</span>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      <div class="flex items-baseline gap-1.5">
        <span class="text-lg font-semibold leading-none tabular-nums">{{ stats.rootCount }}</span>
        <span class="text-xs text-muted-foreground">{{ t('disaster.statIncidents') }}</span>
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-lg font-semibold leading-none tabular-nums">{{ stats.observationCount }}</span>
        <span class="text-xs text-muted-foreground">{{ t('disaster.statReports') }}</span>
      </div>
      <div v-if="stats.severityCounts.CRITICAL > 0" class="flex items-baseline gap-1.5">
        <span class="text-lg font-semibold leading-none tabular-nums text-red-600 dark:text-red-400">{{ stats.severityCounts.CRITICAL }}</span>
        <span class="text-xs text-muted-foreground">{{ t('disaster.severityLevel.CRITICAL') }}</span>
      </div>
      <div v-if="stats.severityCounts.HIGH > 0" class="flex items-baseline gap-1.5">
        <span class="text-lg font-semibold leading-none tabular-nums text-orange-600 dark:text-orange-400">{{ stats.severityCounts.HIGH }}</span>
        <span class="text-xs text-muted-foreground">{{ t('disaster.severityLevel.HIGH') }}</span>
      </div>
      <div
        v-if="stats.conflictingCount > 0"
        class="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"
        :title="t('disaster.conflictingInfo')"
      >
        <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span class="text-lg font-semibold leading-none tabular-nums">{{ stats.conflictingCount }}</span>
        <span class="text-xs">{{ t('disaster.statConflicting') }}</span>
      </div>
    </div>

    <div class="mt-4">
      <ObservationTypeButtons
        :types="ROOT_OBSERVATION_TYPES"
        :label="t('disaster.createObservationPrompt')"
        variant="card"
        @select="handleTypeSelect"
      />
    </div>

    <div class="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-border/30">
      <Button as-child variant="ghost" size="sm" class="h-7 px-2 text-[10px]">
        <RouterLink :to="detailLink">
          <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.detail') }}
        </RouterLink>
      </Button>
    </div>
  </div>
</template>
