<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Edit, Globe, MapPin, Mountain, Navigation, Power, PowerOff, Tag, TowerControl, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { CommunicationChannel } from '@/types/communication-channel'

const props = withDefaults(
  defineProps<{
    channel: CommunicationChannel
    canManage: boolean
    branchName?: string
    branchCity?: string
  }>(),
  {}
)

const emit = defineEmits<{
  edit: [channel: CommunicationChannel]
  delete: [channel: CommunicationChannel]
  toggleStatus: [channel: CommunicationChannel]
  openTutorial: [channel: CommunicationChannel]
}>()

const { t } = useI18n()

const c = computed(() => props.channel)
const branchName = computed(() => props.branchName ?? props.channel.branch?.name)
const branchCity = computed(() => props.branchCity ?? props.channel.branch?.city)

const band = computed(() => {
  if (c.value.type !== 'vhf_uhf_repeater' || !c.value.rxFrequency) return null
  const freq = Number(c.value.rxFrequency)
  if (freq >= 144 && freq <= 148) return 'VHF (2m)'
  if (freq >= 430 && freq <= 440) return 'UHF (70cm)'
  if (freq >= 50 && freq <= 54) return '6m'
  if (freq >= 1240 && freq <= 1300) return '23cm'
  return null
})

const typeIcon = computed(() => {
  switch (c.value.type) {
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
  switch (c.value.type) {
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
  if (c.value.type === 'vhf_uhf_repeater' && band.value) {
    const suffix = t('communicationChannels.types.vhf_uhf_repeater').split(' ').pop()
    if (c.value.repeaterMode === 'digital') return `${band.value} DMR`
    if (c.value.repeaterMode === 'mixed') return `${band.value} ${suffix} + DMR`
    return `${band.value} ${suffix}`
  }
  if (c.value.type === 'aprs' && aprsStationType.value) {
    return `APRS ${aprsStationType.value}`
  }
  return t(`communicationChannels.types.${c.value.type}`)
})

const displayDescription = computed(() => c.value.description?.trim() ?? '')

const isDigital = computed(() => c.value.repeaterMode === 'digital' || c.value.repeaterMode === 'mixed')

const dmrNetworkLabel = computed(() => {
  if (!c.value.dmrNetwork) return null
  const labels: Record<string, string> = {
    brandmeister: 'BM',
    tgif: 'TGIF',
    freedmr: 'FreeDMR',
    other: t('common.other'),
  }
  return labels[c.value.dmrNetwork] || c.value.dmrNetwork
})

const repeaterConnectionDisplay = computed(() => {
  if (c.value.type !== 'vhf_uhf_repeater') return null
  const formatFreq = (freq: number | string | undefined) => {
    if (freq == null || freq === '') return null
    const num = Number(freq)
    return Number.isFinite(num) ? num.toFixed(3) : null
  }
  const txFreq = formatFreq(c.value.txFrequency)
  const rxFreq = formatFreq(c.value.rxFrequency)
  if (!txFreq && !rxFreq) return null

  const txTone =
    c.value.txCtcssTone != null
      ? `${c.value.txCtcssTone} Hz`
      : c.value.txDcsCode?.trim()
        ? `D${c.value.txDcsCode.trim()}`
        : null
  const rxTone =
    c.value.rxCtcssTone != null
      ? `${c.value.rxCtcssTone} Hz`
      : c.value.rxDcsCode?.trim()
        ? `D${c.value.rxDcsCode.trim()}`
        : null
  const offset = c.value.offset?.trim() || null

  let dmrLine: string | null = null
  if (isDigital.value && dmrNetworkLabel.value) {
    const parts = [dmrNetworkLabel.value]
    if (c.value.dmrColorCode != null) parts.push(`CC${c.value.dmrColorCode}`)
    if (c.value.dmrRepeaterId != null) parts.push(`ID ${c.value.dmrRepeaterId}`)
    dmrLine = parts.join(' · ')
  }

  let talkgroupsLine: string | null = null
  if (c.value.talkgroups?.length) {
    const tgList = c.value.talkgroups.slice(0, 5).map(tg => `TG${tg.talkgroupId}`).join(', ')
    talkgroupsLine = c.value.talkgroups.length > 5 ? `${tgList} +${c.value.talkgroups.length - 5}` : tgList
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
  if (c.value.type !== 'echolink') return null
  const node = c.value.echolinkNode?.trim() || null
  const name = c.value.echolinkName?.trim() || null
  if (!node && !name) return null
  return { node, name }
})

const aprsConnectionDisplay = computed(() => {
  if (c.value.type !== 'aprs') return null
  let frequency: string | null = null
  if (c.value.aprsFrequency != null) {
    const freq = Number(c.value.aprsFrequency)
    frequency = Number.isFinite(freq) ? String(freq) : String(c.value.aprsFrequency)
  }
  const types: string[] = []
  if (c.value.aprsIsIgate) types.push(c.value.aprsIgateMode === 'tx_rx' ? 'IGate (TX/RX)' : 'IGate (RX)')
  if (c.value.aprsIsDigipeater) types.push(c.value.aprsDigipeaterType === 'wide' ? 'Digipeater (Wide)' : 'Digipeater (Fill-in)')
  const stationType = types.length ? types.join(' · ') : null
  const path = c.value.aprsPath?.trim() || null
  const server = c.value.aprsServer?.trim() || null
  if (!frequency && !stationType && !path && !server) return null
  return { frequency, stationType, path, server }
})

const aprsStationType = computed(() => {
  if (c.value.type !== 'aprs') return null
  const types: string[] = []
  if (c.value.aprsIsIgate) types.push('IGate')
  if (c.value.aprsIsDigipeater) types.push('Digipeater')
  return types.length > 0 ? types.join(' + ') : null
})

const locationParts = computed(() => {
  const parts: string[] = []
  if (c.value.location?.trim()) parts.push(c.value.location.trim())
  if (c.value.district?.trim()) parts.push(c.value.district.trim())
  if (branchCity.value?.trim() && c.value.district?.trim()) parts.push(branchCity.value.trim())
  return parts
})

const hasLocation = computed(() => {
  return locationParts.value.length > 0 || c.value.altitude != null
})

const googleMapsUrl = computed(() => {
  if (c.value.latitude != null && c.value.longitude != null) {
    const lat = Number(c.value.latitude)
    const lng = Number(c.value.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `https://www.google.com/maps?q=${lat},${lng}`
    }
  }
  return null
})

function openMaps(event: Event) {
  event.stopPropagation()
  if (googleMapsUrl.value) {
    window.open(googleMapsUrl.value, '_blank')
  }
}

const hasTechnicalInfo = computed(
  () => !!repeaterConnectionDisplay.value || !!echolinkConnectionDisplay.value || !!aprsConnectionDisplay.value
)
const showActions = computed(() => c.value.isActive || props.canManage)
</script>

<template>
  <div
    class="relative w-full text-left p-3 rounded-lg border flex flex-col"
    :class="[
      c.isActive
        ? 'border-border/50'
        : 'border-red-500/30 bg-red-500/5 opacity-60'
    ]"
  >
    <!-- Header: icon + type left, branch name top-right; content area stretches so location can sit at bottom -->
    <div class="flex items-stretch gap-3 flex-1 min-w-0">
      <div
        class="flex-shrink-0 p-2 rounded-md self-start"
        :class="iconBgClasses"
        aria-hidden="true"
      >
        <component :is="typeIcon" class="h-4 w-4" />
      </div>

      <div class="flex-1 min-w-0 flex flex-col gap-2 min-h-0 overflow-hidden">
        <div class="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <p class="text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{{ typeLabel }}</span>
            <span v-if="!c.isActive" class="text-xs font-normal text-red-600 dark:text-red-400">
              · {{ t('common.inactive') }}
            </span>
            <span
              v-if="c.type === 'vhf_uhf_repeater' && c.brand?.trim()"
              class="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground/90"
              :title="t('communicationChannels.brand')"
            >
              <Tag class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{{ c.brand.trim() }}</span>
            </span>
          </p>
          <p v-if="branchName" class="text-xs text-muted-foreground text-right shrink-0 max-w-[60%] truncate" :title="branchName">
            {{ branchName }}
          </p>
        </div>

        <!-- 1) Technical info – uniform table-like layout for all types -->
        <div
          v-if="hasTechnicalInfo"
          class="space-y-1.5 text-xs grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-2 gap-y-1 items-baseline"
        >
          <template v-if="repeaterConnectionDisplay">
            <template v-if="repeaterConnectionDisplay.txFreq">
              <span class="text-muted-foreground uppercase tracking-wide">TX</span>
              <span class="tabular-nums font-medium">
                {{ repeaterConnectionDisplay.txFreq }} MHz
                <span v-if="repeaterConnectionDisplay.txTone" class="text-muted-foreground font-normal">
                  {{ repeaterConnectionDisplay.txTone }}
                </span>
              </span>
            </template>
            <template v-if="repeaterConnectionDisplay.rxFreq">
              <span class="text-muted-foreground uppercase tracking-wide">RX</span>
              <span class="tabular-nums font-medium">
                {{ repeaterConnectionDisplay.rxFreq }} MHz
                <span v-if="repeaterConnectionDisplay.offset" class="text-muted-foreground font-normal">
                  {{ repeaterConnectionDisplay.offset }}
                </span>
                <span v-if="repeaterConnectionDisplay.rxTone" class="text-muted-foreground font-normal">
                  {{ repeaterConnectionDisplay.rxTone }}
                </span>
              </span>
            </template>
            <template v-if="repeaterConnectionDisplay.dmrLine">
              <span class="text-muted-foreground col-span-2">{{ repeaterConnectionDisplay.dmrLine }}</span>
            </template>
            <template v-if="repeaterConnectionDisplay.talkgroupsLine">
              <span class="text-muted-foreground col-span-2">{{ repeaterConnectionDisplay.talkgroupsLine }}</span>
            </template>
          </template>
          <template v-else-if="echolinkConnectionDisplay">
            <template v-if="echolinkConnectionDisplay.node">
              <span class="text-muted-foreground">{{ t('communicationChannels.echolinkNode') }}</span>
              <span class="font-medium tabular-nums">{{ echolinkConnectionDisplay.node }}</span>
            </template>
            <template v-if="echolinkConnectionDisplay.name">
              <span class="text-muted-foreground">{{ t('communicationChannels.echolinkName') }}</span>
              <span class="font-medium break-words">{{ echolinkConnectionDisplay.name }}</span>
            </template>
          </template>
          <template v-else-if="aprsConnectionDisplay">
            <template v-if="aprsConnectionDisplay.frequency">
              <span class="text-muted-foreground">{{ t('communicationChannels.frequency') }}</span>
              <span class="font-medium tabular-nums">{{ aprsConnectionDisplay.frequency }} MHz</span>
            </template>
            <template v-if="aprsConnectionDisplay.stationType">
              <span class="text-muted-foreground">{{ t('communicationChannels.aprsStationType') }}</span>
              <span class="font-medium">{{ aprsConnectionDisplay.stationType }}</span>
            </template>
            <template v-if="aprsConnectionDisplay.path">
              <span class="text-muted-foreground">{{ t('communicationChannels.aprsPath') }}</span>
              <span class="font-mono text-[11px] break-all font-medium">{{ aprsConnectionDisplay.path }}</span>
            </template>
            <template v-if="aprsConnectionDisplay.server">
              <span class="text-muted-foreground">{{ t('communicationChannels.aprsServer') }}</span>
              <span class="text-[11px] break-all font-medium">{{ aprsConnectionDisplay.server }}</span>
            </template>
          </template>
        </div>

        <!-- 2) Description (separator before section) -->
        <Separator v-if="displayDescription" class="my-1 h-px bg-border/50" />
        <p
          v-if="displayDescription"
          class="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap"
        >
          {{ displayDescription }}
        </p>

        <!-- 3) Location – block (separator + content) at bottom; space grows before it -->
        <div v-if="hasLocation" class="mt-auto flex flex-col pb-0.5">
          <Separator class="my-1 h-px bg-border/50" />
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
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
              v-if="c.altitude != null"
              class="inline-flex items-center gap-1"
            >
              <Mountain class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{{ c.altitude }} m</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showActions" class="mt-auto flex items-center justify-between gap-2 flex-wrap pt-1.5 pb-0 border-t border-border/30">
      <Button
        v-if="c.isActive"
        variant="ghost"
        size="icon"
        class="h-7 w-7 shrink-0"
        :title="t('communicationChannels.howToConnect')"
        @click.stop="emit('openTutorial', c)"
      >
        <BookOpen class="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      <div v-else class="w-7" aria-hidden="true" />
      <div v-if="canManage" class="flex items-center justify-end gap-1 flex-wrap">
        <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click.stop="emit('edit', c)">
          <Edit class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.edit') }}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          @click.stop="emit('toggleStatus', c)"
        >
          <Power v-if="c.isActive" class="h-3.5 w-3.5 mr-1.5" />
          <PowerOff v-else class="h-3.5 w-3.5 mr-1.5" />
          {{ c.isActive ? t('communicationChannels.deactivate') : t('communicationChannels.activate') }}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          @click.stop="emit('delete', c)"
        >
          <Trash2 class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </div>
  </div>
</template>
