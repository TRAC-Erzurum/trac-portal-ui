<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { CalendarPlus, ChevronRight, Siren } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/formatters'
import type { Disaster } from '@/types/disaster'

const props = defineProps<{
  disaster: Disaster
}>()

const { t, locale } = useI18n()

const isArchived = computed(() => !!props.disaster.archivedAt)

const typeLabel = computed(() => t(`disaster.disasterType.${props.disaster.type}`))

const detailLink = computed(() => `/disasters/${props.disaster.id}`)
</script>

<template>
  <div
    class="w-full text-left p-4 rounded-lg border border-border/50 bg-transparent transition-all flex flex-col"
  >
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="mt-0.5 flex-shrink-0">
        <Siren class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <p class="font-semibold truncate" :title="disaster.name">{{ disaster.name }}</p>
          <span
            v-if="isArchived"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0"
          >
            {{ t('disaster.archived') }}
          </span>
        </div>
        <p class="mt-1 text-sm text-muted-foreground truncate">{{ typeLabel }}</p>
        <p class="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1" :title="t('disaster.createdAt')">
          <CalendarPlus class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {{ formatDateTime(disaster.createdAt, locale) }}
        </p>
      </div>
    </div>
    <div class="mt-auto flex items-center justify-end gap-2 pt-2 border-t border-border/30">
      <Button as-child variant="ghost" size="sm" class="h-7 px-2 text-[10px]">
        <RouterLink :to="detailLink">
          <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.detail') }}
        </RouterLink>
      </Button>
    </div>
  </div>
</template>
