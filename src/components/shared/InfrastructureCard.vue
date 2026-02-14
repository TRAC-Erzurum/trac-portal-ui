<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  TowerControl,
  Globe,
  Navigation,
  MapPin,
  Mountain,
} from 'lucide-vue-next'

export type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs'

const DESCRIPTION_MAX_LENGTH = 500

interface Props {
  id: string
  name: string
  type: InfrastructureType
  isActive: boolean
  branchName?: string
  branchCity?: string
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
  hfFrequencyRange?: string
  hfMode?: string
  repeaterMode?: string
  dmrColorCode?: number | string
  dmrNetwork?: string
  dmrRepeaterId?: number | string
  talkgroups?: Array<{
    talkgroupId: number
    talkgroupName?: string
    timeslot: number
    isStatic: boolean
  }>
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
    default:
      return TowerControl
  }
})

const iconBgClasses = computed(() => {
  switch (props.type) {
    case 'vhf_uhf_repeater':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    case 'echolink':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    case 'aprs':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
})

const typeLabel = computed(() => {
  if (props.type === 'vhf_uhf_repeater' && band.value) {
    const suffix = t('communicationChannels.types.vhf_uhf_repeater').split(' ').pop()
    if (props.repeaterMode === 'digital') return `${band.value} DMR`
    if (props.repeaterMode === 'mixed') return `${band.value} ${suffix} + DMR`
    return `${band.value} ${suffix}`
  }
  if (props.type === 'aprs' && aprsStationType.value) {
    return `APRS ${aprsStationType.value}`
  }
  return t(`communicationChannels.types.${props.type}`)
})

const displayDescription = computed(() => {
  if (!props.description?.trim()) return ''
  const text = props.description.trim()
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text
  return text.slice(0, DESCRIPTION_MAX_LENGTH) + '…'
})

const isDigital = computed(() => {
  return props.repeaterMode === 'digital' || props.repeaterMode === 'mixed'
})

const dmrNetworkLabel = computed(() => {
  if (!props.dmrNetwork) return null
  const labels: Record<string, string> = {
    brandmeister: 'BM',
    tgif: 'TGIF',
    freedmr: 'FreeDMR',
    other: t('common.other'),
  }
  return labels[props.dmrNetwork] || props.dmrNetwork
})

const repeaterConnectionDisplay = computed(() => {
  if (props.type !== 'vhf_uhf_repeater') return null
  const formatFreq = (freq: number | string | undefined) => {
    if (freq == null || freq === '') return null
    const num = Number(freq)
    return Number.isFinite(num) ? num.toFixed(3) : null
  }
  const txFreq = formatFreq(props.txFrequency)
  const rxFreq = formatFreq(props.rxFrequency)
  if (!txFreq && !rxFreq) return null

  const txTone =
    props.txCtcssTone != null && props.txCtcssTone !== ''
      ? `${props.txCtcssTone} Hz`
      : props.txDcsCode?.trim()
        ? `D${props.txDcsCode.trim()}`
        : null
  const rxTone =
    props.rxCtcssTone != null && props.rxCtcssTone !== ''
      ? `${props.rxCtcssTone} Hz`
      : props.rxDcsCode?.trim()
        ? `D${props.rxDcsCode.trim()}`
        : null
  const offset = props.offset?.trim() || null

  let dmrLine: string | null = null
  if (isDigital.value && dmrNetworkLabel.value) {
    const parts = [dmrNetworkLabel.value]
    if (props.dmrColorCode != null && props.dmrColorCode !== '') parts.push(`CC${props.dmrColorCode}`)
    if (props.dmrRepeaterId != null && props.dmrRepeaterId !== '') parts.push(`ID ${props.dmrRepeaterId}`)
    dmrLine = parts.join(' · ')
  }

  let talkgroupsLine: string | null = null
  if (props.talkgroups?.length) {
    const tgList = props.talkgroups.slice(0, 5).map(tg => `TG${tg.talkgroupId}`).join(', ')
    talkgroupsLine = props.talkgroups.length > 5 ? `${tgList} +${props.talkgroups.length - 5}` : tgList
  }

  return {
    txFreq,
    rxFreq,
    txTone,
    rxTone,
    offset,
    dmrLine,
    talkgroupsLine,
  }
})

const echolinkConnectionDisplay = computed(() => {
  if (props.type !== 'echolink') return null
  const node = props.echolinkNode?.trim() || null
  const name = props.echolinkName?.trim() || null
  if (!node && !name) return null
  return { node, name }
})

const aprsConnectionDisplay = computed(() => {
  if (props.type !== 'aprs') return null
  let frequency: string | null = null
  if (props.aprsFrequency != null && props.aprsFrequency !== '') {
    const freq = Number(props.aprsFrequency)
    frequency = Number.isFinite(freq) ? String(freq) : String(props.aprsFrequency)
  }
  const types: string[] = []
  if (props.aprsIsIgate) types.push(props.aprsIgateMode === 'tx_rx' ? 'IGate (TX/RX)' : 'IGate (RX)')
  if (props.aprsIsDigipeater) types.push(props.aprsDigipeaterType === 'wide' ? 'Digipeater (Wide)' : 'Digipeater (Fill-in)')
  const stationType = types.length ? types.join(' · ') : null
  const path = props.aprsPath?.trim() || null
  const server = props.aprsServer?.trim() || null
  if (!frequency && !stationType && !path && !server) return null
  return { frequency, stationType, path, server }
})

const aprsStationType = computed(() => {
  if (props.type !== 'aprs') return null
  const types: string[] = []
  if (props.aprsIsIgate) types.push('IGate')
  if (props.aprsIsDigipeater) types.push('Digipeater')
  return types.length > 0 ? types.join(' + ') : null
})

const locationParts = computed(() => {
  const parts: string[] = []
  if (props.location?.trim()) parts.push(props.location.trim())
  if (props.district?.trim()) parts.push(props.district.trim())
  if (props.branchCity?.trim() && props.district?.trim()) parts.push(props.branchCity.trim())
  return parts
})

const hasLocation = computed(() => {
  return locationParts.value.length > 0 || (props.altitude != null && props.altitude !== '')
})

const googleMapsUrl = computed(() => {
  if (props.latitude != null && props.longitude != null) {
    const lat = Number(props.latitude)
    const lng = Number(props.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
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
      <div
        class="flex-shrink-0 p-2 rounded-md"
        :class="iconBgClasses"
        aria-hidden="true"
      >
        <component :is="typeIcon" class="h-4 w-4" />
      </div>

      <div class="flex-1 min-w-0 space-y-1.5">
        <p class="text-sm font-medium text-muted-foreground">
          {{ typeLabel }}
          <span v-if="!isActive" class="ml-1.5 text-xs font-normal text-red-600 dark:text-red-400">
            · {{ t('common.inactive') }}
          </span>
        </p>

        <h3 class="font-semibold text-sm leading-tight">{{ name }}</h3>

        <p v-if="branchName" class="text-xs text-muted-foreground">
          {{ branchName }}
        </p>

        <p
          v-if="displayDescription"
          class="text-xs text-muted-foreground leading-relaxed line-clamp-3 break-words"
        >
          {{ displayDescription }}
        </p>

        <!-- Bağlantı bilgisi: tüm tipler aynı sub-card stili -->
        <div
          v-if="repeaterConnectionDisplay"
          class="connection-block rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-xs"
        >
          <div class="space-y-1.5">
            <div v-if="repeaterConnectionDisplay.txFreq" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">TX</span>
              <span class="tabular-nums text-foreground">{{ repeaterConnectionDisplay.txFreq }} MHz</span>
              <span v-if="repeaterConnectionDisplay.txTone" class="text-muted-foreground tabular-nums">
                {{ repeaterConnectionDisplay.txTone }}
              </span>
            </div>
            <div v-if="repeaterConnectionDisplay.rxFreq" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">RX</span>
              <span class="tabular-nums text-foreground">{{ repeaterConnectionDisplay.rxFreq }} MHz</span>
              <span v-if="repeaterConnectionDisplay.offset" class="text-muted-foreground tabular-nums">
                Shift {{ repeaterConnectionDisplay.offset }}
              </span>
              <span v-if="repeaterConnectionDisplay.rxTone" class="text-muted-foreground tabular-nums">
                {{ repeaterConnectionDisplay.rxTone }}
              </span>
            </div>
          </div>
          <div v-if="repeaterConnectionDisplay.dmrLine" class="mt-1.5 pt-1.5 border-t border-border/40 text-muted-foreground">
            {{ repeaterConnectionDisplay.dmrLine }}
          </div>
          <div v-if="repeaterConnectionDisplay.talkgroupsLine" class="mt-1 pt-1 border-t border-border/40 text-muted-foreground">
            {{ repeaterConnectionDisplay.talkgroupsLine }}
          </div>
        </div>

        <div
          v-else-if="echolinkConnectionDisplay"
          class="connection-block rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-xs"
        >
          <div class="space-y-1.5">
            <div v-if="echolinkConnectionDisplay.node" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.echolinkNode') }}</span>
              <span class="tabular-nums text-foreground">{{ echolinkConnectionDisplay.node }}</span>
            </div>
            <div v-if="echolinkConnectionDisplay.name" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.echolinkName') }}</span>
              <span class="text-foreground break-words">{{ echolinkConnectionDisplay.name }}</span>
            </div>
          </div>
        </div>

        <div
          v-else-if="aprsConnectionDisplay"
          class="connection-block rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 font-mono text-xs"
        >
          <div class="space-y-1.5">
            <div v-if="aprsConnectionDisplay.frequency" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.frequency') }}</span>
              <span class="tabular-nums text-foreground">{{ aprsConnectionDisplay.frequency }} MHz</span>
            </div>
            <div v-if="aprsConnectionDisplay.stationType" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.aprsStationType') }}</span>
              <span class="text-foreground">{{ aprsConnectionDisplay.stationType }}</span>
            </div>
            <div v-if="aprsConnectionDisplay.path" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.aprsPath') }}</span>
              <span class="text-foreground tabular-nums font-mono text-[10px]">{{ aprsConnectionDisplay.path }}</span>
            </div>
            <div v-if="aprsConnectionDisplay.server" class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span class="shrink-0 min-w-14 text-muted-foreground text-[10px] uppercase tracking-wide">{{ t('communicationChannels.aprsServer') }}</span>
              <span class="text-foreground text-[10px] break-all">{{ aprsConnectionDisplay.server }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="hasLocation"
          class="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-xs text-muted-foreground"
        >
          <template v-if="locationParts.length > 0">
            <button
              v-if="googleMapsUrl"
              type="button"
              class="inline-flex items-center gap-1 hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              @click.stop="openMaps"
            >
              <MapPin class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{{ locationParts.join(', ') }}</span>
            </button>
            <span v-else class="inline-flex items-center gap-1">
              <MapPin class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{{ locationParts.join(', ') }}</span>
            </span>
          </template>
          <span
            v-if="altitude != null && altitude !== ''"
            class="inline-flex items-center gap-1"
          >
            <Mountain class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{{ altitude }} m</span>
          </span>
        </div>
      </div>
    </div>

    <div v-if="$slots.actions" class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
    </div>
  </div>
</template>
