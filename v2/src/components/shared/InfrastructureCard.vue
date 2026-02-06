<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  TowerControl, 
  Globe, 
  Navigation, 
  Waves,
  MapPin,
  Mountain
} from 'lucide-vue-next'

export type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs' | 'hf'

interface Props {
  id: string
  name: string
  type: InfrastructureType
  isActive: boolean
  branchName?: string
  description?: string
  location?: string
  district?: string
  latitude?: number | string
  longitude?: number | string
  altitude?: number | string
  coverage?: string
  rxFrequency?: number | string
  txFrequency?: number | string
  offset?: string
  txCtcssTone?: number | string
  rxCtcssTone?: number | string
  txDcsCode?: string
  rxDcsCode?: string
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number | string
  aprsIsIgate?: boolean
  aprsIsDigipeater?: boolean
  aprsIgateMode?: string
  aprsDigipeaterType?: string
  aprsPath?: string
  aprsServer?: string
  digipeater?: string
  hfFrequencyRange?: string
  hfMode?: string
}

const props = defineProps<Props>()

const { t } = useI18n()

const band = computed(() => {
  if (props.type !== 'vhf_uhf_repeater' || !props.rxFrequency) return null
  const freq = Number(props.rxFrequency)
  if (freq >= 144 && freq <= 148) return 'VHF (2m)'
  if (freq >= 430 && freq <= 440) return 'UHF (70cm)'
  if (freq >= 50 && freq <= 54) return '6m'
  if (freq >= 1240 && freq <= 1300) return '23cm'
  return null
})

const typeIcon = computed(() => {
  switch (props.type) {
    case 'vhf_uhf_repeater':
      return TowerControl
    case 'echolink':
      return Globe
    case 'aprs':
      return Navigation
    case 'hf':
      return Waves
    default:
      return TowerControl
  }
})

const typeLabel = computed(() => {
  if (props.type === 'vhf_uhf_repeater' && band.value) {
    return `${band.value} ${t('communicationChannels.types.vhf_uhf_repeater').split(' ').pop()}`
  }
  if (props.type === 'aprs' && aprsStationType.value) {
    return `APRS ${aprsStationType.value}`
  }
  return t(`communicationChannels.types.${props.type}`)
})

const typeBadgeClasses = computed(() => {
  switch (props.type) {
    case 'vhf_uhf_repeater':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
    case 'echolink':
      return 'bg-green-500/20 text-green-700 dark:text-green-400'
    case 'aprs':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
    case 'hf':
      return 'bg-red-500/20 text-red-700 dark:text-red-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
})

const repeaterFreqInfo = computed(() => {
  if (props.type !== 'vhf_uhf_repeater') return null
  if (!props.txFrequency && !props.rxFrequency) return null
  
  const formatFreq = (freq: number | string | undefined) => {
    if (!freq) return null
    const num = Number(freq)
    return num.toFixed(3)
  }
  
  const formatTone = (ctcss: number | string | undefined, dcs: string | undefined) => {
    if (ctcss) return `${Number(ctcss)} Hz`
    if (dcs) return `D${dcs}`
    return null
  }
  
  return {
    tx: formatFreq(props.txFrequency),
    rx: formatFreq(props.rxFrequency),
    offset: props.offset || null,
    txTone: formatTone(props.txCtcssTone, props.txDcsCode),
    rxTone: formatTone(props.rxCtcssTone, props.rxDcsCode)
  }
})

const aprsStationType = computed(() => {
  if (props.type !== 'aprs') return null
  const types: string[] = []
  if (props.aprsIsIgate) types.push('IGate')
  if (props.aprsIsDigipeater) types.push('Digipeater')
  return types.length > 0 ? types.join(' + ') : null
})

const primaryInfo = computed(() => {
  switch (props.type) {
    case 'echolink':
      if (props.echolinkNode) {
        return props.echolinkName 
          ? `Node: ${props.echolinkNode} (${props.echolinkName})`
          : `Node: ${props.echolinkNode}`
      }
      return ''
    case 'aprs':
      return props.aprsFrequency ? `${props.aprsFrequency} MHz` : ''
    case 'hf':
      return props.hfFrequencyRange || ''
    default:
      return ''
  }
})

const aprsSecondaryInfo = computed(() => {
  if (props.type !== 'aprs') return null
  const parts: string[] = []
  if (props.aprsIsIgate && props.aprsIgateMode) {
    parts.push(props.aprsIgateMode === 'tx_rx' ? 'TX/RX' : 'RX-only')
  }
  if (props.aprsIsDigipeater && props.aprsDigipeaterType) {
    parts.push(props.aprsDigipeaterType === 'wide' ? 'Wide' : 'Fill-in')
  }
  if (props.aprsPath) {
    parts.push(props.aprsPath)
  }
  return parts.length > 0 ? parts.join(' · ') : null
})

const secondaryInfo = computed(() => {
  switch (props.type) {
    case 'hf':
      return props.hfMode ? `Mode: ${props.hfMode}` : ''
    default:
      return ''
  }
})

const googleMapsUrl = computed(() => {
  if (props.latitude && props.longitude) {
    return `https://www.google.com/maps?q=${props.latitude},${props.longitude}`
  }
  return null
})

const openMaps = (event: Event) => {
  event.stopPropagation()
  if (googleMapsUrl.value) {
    window.open(googleMapsUrl.value, '_blank')
  }
}
</script>

<template>
  <div
    class="relative w-full text-left p-3 rounded-lg border flex flex-col"
    :class="[
      isActive 
        ? 'border-border/50' 
        : 'border-red-500/30 bg-red-500/5 opacity-60'
    ]"
  >
    <div class="absolute top-2 right-2">
      <slot name="top-right" />
    </div>

    <div class="flex items-start gap-3 pr-10 flex-1 min-w-0">
      <div class="flex-shrink-0 p-2 rounded-md" :class="typeBadgeClasses.replace('text-', 'bg-').replace('/20', '/10')">
        <component :is="typeIcon" class="h-4 w-4" :class="typeBadgeClasses.split(' ').find(c => c.startsWith('text-'))" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5">
          <span 
            class="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
            :class="typeBadgeClasses"
          >
            {{ typeLabel }}
          </span>
          <span v-if="!isActive" class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400">
            {{ t('common.inactive') }}
          </span>
        </div>
        <p class="font-semibold text-sm">{{ name }}</p>
        <p v-if="branchName" class="text-[10px] text-muted-foreground mt-0.5">{{ branchName }}</p>
        <p v-if="district" class="text-[10px] text-muted-foreground mt-0.5">{{ t('form.district') }}: {{ district }}</p>
        <p v-if="description" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ description }}</p>

        <div v-if="type === 'vhf_uhf_repeater' && repeaterFreqInfo" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono">
          <span class="text-muted-foreground">TX <span class="text-foreground font-medium">{{ repeaterFreqInfo.tx }}</span><span v-if="repeaterFreqInfo.txTone" class="text-muted-foreground/70 ml-1">{{ repeaterFreqInfo.txTone }}</span></span>
          <span class="text-muted-foreground">RX <span class="text-foreground font-medium">{{ repeaterFreqInfo.rx || repeaterFreqInfo.offset }}</span><span v-if="repeaterFreqInfo.rx && repeaterFreqInfo.offset" class="text-muted-foreground/70 ml-1">({{ repeaterFreqInfo.offset }})</span><span v-if="repeaterFreqInfo.rxTone" class="text-muted-foreground/70 ml-1">{{ repeaterFreqInfo.rxTone }}</span></span>
        </div>

        <div v-if="type !== 'vhf_uhf_repeater' && (primaryInfo || aprsSecondaryInfo || secondaryInfo)" class="mt-2 text-xs font-mono">
          <p v-if="primaryInfo">{{ primaryInfo }}</p>
          <p v-if="type === 'aprs' && aprsSecondaryInfo" class="text-orange-600 dark:text-orange-400 text-[10px]">{{ aprsSecondaryInfo }}</p>
          <p v-if="type !== 'aprs' && secondaryInfo" class="text-muted-foreground text-[10px]">{{ secondaryInfo }}</p>
        </div>

        <div v-if="location || googleMapsUrl || altitude" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <button
            v-if="googleMapsUrl"
            @click.stop="openMaps"
            class="flex items-center gap-1 text-primary hover:underline"
          >
            <MapPin class="h-3 w-3" />
            <span>{{ location || `${latitude}, ${longitude}` }}</span>
          </button>
          <span v-else-if="location" class="flex items-center gap-1">
            <MapPin class="h-3 w-3" />
            {{ location }}
          </span>
          <span v-if="altitude" class="flex items-center gap-1">
            <Mountain class="h-3 w-3" />
            {{ altitude }}m
          </span>
        </div>
      </div>
    </div>

    <div v-if="$slots.actions" class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
    </div>
  </div>
</template>
