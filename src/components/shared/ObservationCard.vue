<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Clock, MapPin, ThumbsDown, ThumbsUp, User, X } from 'lucide-vue-next'
import ObservationTypeButtons from '@/components/disasters/ObservationTypeButtons.vue'
import { getUploadedFileUrl } from '@/composables'
import { formatDateTime } from '@/lib/formatters'
import { getAllowedChildTypes } from '@/lib/observation-hierarchy'
import { getObservationTypeIcon } from '@/lib/observation-icons'
import type {
  Observation,
  ObservationFeedbackType,
  ObservationPhoto,
  ObservationSeverity,
  ObservationType,
  RankedObservation,
} from '@/types/disaster'

interface TimelineEntry {
  id: string
  type: ObservationType
  eventTime: string
  severity: ObservationSeverity | null
  description: string | null
  reporter: string
  isOwn: boolean
  supportCount: number
  contradictCount: number
  photos: ObservationPhoto[]
}

const props = defineProps<{
  observation: RankedObservation
  children: Observation[]
  readOnly?: boolean
  userFeedbackMap?: Record<string, ObservationFeedbackType | null>
  highlighted?: boolean
  currentUserId?: string
}>()

const emit = defineEmits<{
  support: [observationId: string]
  contradict: [observationId: string]
  addInformation: [type: ObservationType]
  showOnMap: []
}>()

const { t, locale } = useI18n()

const typeLabel = computed(() => t(`disaster.observationType.${props.observation.type}`))

const allowedChildTypes = computed(() => getAllowedChildTypes(props.observation.type))

const showActionRow = computed(
  () => !props.readOnly && allowedChildTypes.value.length > 0,
)

function reporterFor(o: Observation): string {
  return o.reporterCallSign || o.reporterEmail || o.createdBy || ''
}

function canVoteEntry(entry: TimelineEntry): boolean {
  return !props.readOnly && !entry.isOwn
}

function feedbackFor(id: string): ObservationFeedbackType | null {
  return props.userFeedbackMap?.[id] ?? null
}

const locationSummary = computed(() => {
  if (props.observation.locationLabel) return props.observation.locationLabel
  return `${props.observation.lat.toFixed(4)}, ${props.observation.lng.toFixed(4)}`
})

function severityDotClass(severity: ObservationSeverity | null): string {
  if (!severity) return 'bg-muted-foreground'
  const map: Record<ObservationSeverity, string> = {
    LOW: 'bg-blue-500',
    MEDIUM: 'bg-amber-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
  }
  return map[severity]
}

const timeline = computed((): TimelineEntry[] => {
  const toEntry = (o: Observation): TimelineEntry => ({
    id: o.id,
    type: o.type,
    eventTime: o.eventTime,
    severity: o.severity ?? null,
    description: o.description ?? null,
    reporter: reporterFor(o),
    isOwn:
      props.currentUserId != null && o.createdByUserId === props.currentUserId,
    supportCount: o.supportCount,
    contradictCount: o.contradictCount,
    photos: o.photos ?? [],
  })
  const entries: TimelineEntry[] = [toEntry(props.observation)]
  const sorted = [...props.children].sort(
    (a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime(),
  )
  for (const child of sorted) {
    entries.push(toEntry(child))
  }
  return entries
})

const enlargedPhotoUrl = ref<string | null>(null)
const photoOverlayRef = ref<HTMLElement | null>(null)

watch(enlargedPhotoUrl, (url) => {
  if (url) {
    nextTick(() => photoOverlayRef.value?.focus())
  }
})
</script>

<template>
  <article
    :id="`observation-${observation.id}`"
    class="p-4 rounded-lg border bg-background transition-all"
    :class="[
      highlighted ? 'border-primary ring-1 ring-primary/30' : 'border-border/50',
    ]"
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="font-semibold inline-flex items-center gap-1.5">
            <component :is="getObservationTypeIcon(observation.type)" class="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            {{ typeLabel }}
          </h3>
          <span
            v-if="observation.conflicting"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1"
          >
            <AlertTriangle class="h-3 w-3" aria-hidden="true" />
            {{ t('disaster.conflictingInfo') }}
          </span>
        </div>
        <button
          type="button"
          class="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm"
          :title="t('disaster.showOnMap')"
          @click="emit('showOnMap')"
        >
          <MapPin class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span class="text-left">{{ locationSummary }}</span>
        </button>
        <p v-if="observation.description" class="mt-2 text-sm">{{ observation.description }}</p>
      </div>
    </div>

    <div v-if="timeline.length > 0" class="mt-4">
      <p class="text-sm font-medium text-muted-foreground mb-3">{{ t('disaster.timeline') }}</p>
      <ol class="relative border-s border-border ms-2 space-y-4">
        <li v-for="(entry, idx) in timeline" :key="idx" class="ms-4">
          <span
            class="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border border-background"
            :class="severityDotClass(entry.severity)"
            :title="entry.severity ? t(`disaster.severityLevel.${entry.severity}`) : undefined"
          />
          <p class="text-sm font-medium inline-flex items-center gap-1.5">
            <component :is="getObservationTypeIcon(entry.type)" class="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            {{ t(`disaster.observationType.${entry.type}`) }}
          </p>
          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1" :title="t('disaster.lastUpdate')">
              <Clock class="h-3 w-3 shrink-0" aria-hidden="true" />
              {{ formatDateTime(entry.eventTime, locale) }}
            </span>
            <span
              v-if="entry.isOwn"
              class="inline-flex items-center gap-1 font-medium text-primary"
              :title="t('disaster.reportedBy')"
            >
              <User class="h-3 w-3 shrink-0" aria-hidden="true" />
              {{ t('disaster.yourObservation') }}
            </span>
            <span v-else-if="entry.reporter" class="inline-flex items-center gap-1" :title="t('disaster.reportedBy')">
              <User class="h-3 w-3 shrink-0" aria-hidden="true" />
              {{ entry.reporter }}
            </span>
          </div>
          <p v-if="entry.description" class="mt-1 text-sm">{{ entry.description }}</p>
          <div class="mt-1.5 flex items-center gap-1">
            <button
              type="button"
              :disabled="!canVoteEntry(entry)"
              :aria-pressed="feedbackFor(entry.id) === 'SUPPORT'"
              :title="t('disaster.observedToo')"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default"
              :class="[
                feedbackFor(entry.id) === 'SUPPORT' ? 'text-primary' : 'text-muted-foreground',
                canVoteEntry(entry) ? 'hover:bg-muted hover:text-foreground' : '',
              ]"
              @click="canVoteEntry(entry) && emit('support', entry.id)"
            >
              <ThumbsUp class="h-4 w-4" aria-hidden="true" />
              {{ entry.supportCount }}
            </button>
            <button
              type="button"
              :disabled="!canVoteEntry(entry)"
              :aria-pressed="feedbackFor(entry.id) === 'CONTRADICT'"
              :title="t('disaster.observationDifferent')"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:cursor-default"
              :class="[
                feedbackFor(entry.id) === 'CONTRADICT' ? 'text-primary' : 'text-muted-foreground',
                canVoteEntry(entry) ? 'hover:bg-muted hover:text-foreground' : '',
              ]"
              @click="canVoteEntry(entry) && emit('contradict', entry.id)"
            >
              <ThumbsDown class="h-4 w-4" aria-hidden="true" />
              {{ entry.contradictCount }}
            </button>
          </div>
          <div v-if="entry.photos.length > 0" class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="photo in entry.photos"
              :key="photo.id"
              type="button"
              class="rounded-md border border-border overflow-hidden h-16 w-16 shrink-0 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              :aria-label="t('disaster.photos')"
              @click="enlargedPhotoUrl = getUploadedFileUrl(photo.filePath)"
            >
              <img
                :src="getUploadedFileUrl(photo.filePath)"
                :alt="t('disaster.photos')"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          </div>
        </li>
      </ol>
    </div>

    <div v-if="showActionRow" class="mt-4 flex flex-col gap-3 pt-3 border-t border-border/30">
      <ObservationTypeButtons
        :types="allowedChildTypes"
        :label="t('disaster.addInformationPrompt')"
        @select="emit('addInformation', $event)"
      />
    </div>
  </article>

  <Teleport to="body">
    <div
      v-if="enlargedPhotoUrl"
      ref="photoOverlayRef"
      tabindex="-1"
      class="fixed inset-0 z-[950] flex items-center justify-center bg-black/80 p-4 outline-none"
      role="dialog"
      :aria-label="t('disaster.photos')"
      @click.self="enlargedPhotoUrl = null"
      @keydown.escape="enlargedPhotoUrl = null"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-sm p-1 text-white opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        :aria-label="t('common.close')"
        @click="enlargedPhotoUrl = null"
      >
        <X class="h-5 w-5" />
      </button>
      <img
        :src="enlargedPhotoUrl"
        :alt="t('disaster.photos')"
        class="max-h-[85vh] max-w-full w-auto object-contain rounded-md shadow-lg"
        @click.stop
      />
    </div>
  </Teleport>
</template>
