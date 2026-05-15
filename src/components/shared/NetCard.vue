<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Award, Building2, CheckCircle2, ChevronRight, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useDateFormat } from '@/composables'

type NetStatus = 'active' | 'pending' | 'completed' | 'cancelled'

interface Props {
  id: string
  name: string
  status: NetStatus
  attendeeCount?: number
  durationMinutes?: number
  startedAt?: string | null
  endedAt?: string | null
  branchLabel?: string
  scheduledAt?: string | null
  estimatedDurationMinutes?: number | null
  hasCertificate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasCertificate: false,
})

const emit = defineEmits<{
  click: [id: string]
}>()

const { t } = useI18n()

const netDetailLink = computed(() => `/nets/${props.id}`)
const { formatDateShort } = useDateFormat()

const footerStatusLabel = computed(() => {
  if (props.status === 'active' && calculatedDuration.value) {
    return formatDuration()
  }

  if ((props.status === 'completed' || props.status === 'cancelled') && props.endedAt) {
    return formatDateShort(props.endedAt)
  }

  if (props.status === 'pending') {
    if (scheduledLabel.value) {
      const parts = [scheduledLabel.value]
      if (props.estimatedDurationMinutes) {
        parts.push(`~${props.estimatedDurationMinutes} ${t('nets.minutes')}`)
      }
      return parts.join(' · ')
    }

    return t('nets.notStarted')
  }

  return ''
})

const calculatedDuration = computed(() => {
  if (props.durationMinutes) return props.durationMinutes
  if (!props.startedAt) return 0
  const start = new Date(props.startedAt)
  const end = props.endedAt ? new Date(props.endedAt) : new Date()
  return Math.round((end.getTime() - start.getTime()) / 60000)
})

const formatDuration = (minutes?: number) => {
  const mins = minutes ?? calculatedDuration.value
  if (!mins) return ''
  if (mins < 60) return `${mins} dk`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}s ${remainingMins}dk` : `${hours}s`
}

const scheduledLabel = computed(() => {
  if (!props.scheduledAt) return ''
  const d = new Date(props.scheduledAt)
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
})

</script>

<template>
  <div class="w-full text-left p-4 rounded-lg border border-border/50 bg-background transition-all flex flex-col relative">
    <Award
      v-if="hasCertificate"
      class="absolute top-2.5 right-2.5 h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0"
      :title="t('certificates.template')"
      aria-hidden
    />
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="mt-0.5 flex-shrink-0">
        <span v-if="status === 'active'" class="relative flex h-2.5 w-2.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span class="relative inline-flex rounded-full bg-green-500 h-2.5 w-2.5"></span>
        </span>
        <span v-else-if="status === 'pending'" class="relative flex h-2.5 w-2.5">
          <span class="relative inline-flex rounded-full bg-blue-500 h-2.5 w-2.5"></span>
        </span>
        <span v-else-if="status === 'cancelled'" class="relative flex h-2.5 w-2.5">
          <span class="relative inline-flex rounded-full bg-amber-500 h-2.5 w-2.5"></span>
        </span>
        <template v-else>
          <CheckCircle2 class="h-3 w-3 text-muted-foreground" />
        </template>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="truncate font-semibold" :title="name">{{ name }}</p>
            <div v-if="branchLabel" class="mt-1 flex items-center gap-2 min-w-0">
              <Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate text-sm font-medium text-muted-foreground" :title="branchLabel">
                {{ branchLabel }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span v-if="attendeeCount !== undefined" class="flex items-center gap-1" :title="`${attendeeCount} ${t('nets.attendees')}`">
            <Users class="h-3 w-3" />
            <span>{{ attendeeCount }}</span>
          </span>
          <span v-if="footerStatusLabel" class="truncate" :title="footerStatusLabel">{{ footerStatusLabel }}</span>
        </div>
      </div>
    </div>
    <div class="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border/30">
      <slot name="actions" />
      <div class="flex items-center gap-1 ml-auto">
        <Button
          as-child
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-[10px]"
        >
          <RouterLink :to="netDetailLink" @click="emit('click', props.id)">
            <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
            {{ t('common.detail') }}
          </RouterLink>
        </Button>
      </div>
    </div>
  </div>
</template>
