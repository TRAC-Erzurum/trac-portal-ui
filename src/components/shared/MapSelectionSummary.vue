<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    district?: string | null
    lat?: number | null
    lng?: number | null
    /** When true, applies rounded-b-lg (e.g. standalone map card). */
    roundedBottom?: boolean
  }>(),
  { district: null, lat: null, lng: null, roundedBottom: false }
)

const { t } = useI18n()

const districtDisplay = computed(() =>
  props.district?.trim() ? props.district.trim() : '—'
)

const latLngDisplay = computed(() => {
  const lat = props.lat
  const lng = props.lng
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
  return '—'
})

const hasContent = computed(
  () =>
    (props.district?.trim()?.length ?? 0) > 0 ||
    (props.lat != null &&
      props.lng != null &&
      Number.isFinite(props.lat) &&
      Number.isFinite(props.lng))
)
</script>

<template>
  <div
    v-if="hasContent"
    class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
    :class="roundedBottom ? 'rounded-b-lg' : ''"
  >
    <span class="font-medium text-foreground">{{ t('form.district') }}:</span>
    <span class="tabular-nums">{{ districtDisplay }}</span>
    <span class="font-medium text-foreground">{{ t('communicationChannels.latitude') }} / {{ t('communicationChannels.longitude') }}:</span>
    <span class="tabular-nums">{{ latLngDisplay }}</span>
  </div>
</template>
