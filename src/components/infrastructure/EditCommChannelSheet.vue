<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { useFormValidation } from '@/composables'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { LocationMapPicker, type LocationSelection } from '@/components/shared'
import { Plus, TowerControl, Globe, Navigation, X } from 'lucide-vue-next'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { WGS84ToMaidenhead } from '@/lib/maidenhead'
import type { CommunicationChannel } from '@/types/communication-channel'

type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs'
type RepeaterMode = 'analog' | 'digital' | 'mixed'
type DmrNetwork = 'brandmeister' | 'tgif' | 'freedmr' | 'other'

interface TalkgroupEntry {
  talkgroupId: number | undefined
  talkgroupName: string
  timeslot: number
  isStatic: boolean
}

const TYPE_OPTIONS = [
  { 
    value: 'vhf_uhf_repeater' as const, 
    icon: TowerControl, 
    activeClasses: 'border-blue-500 bg-blue-500/10',
    iconActiveClasses: 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
  },
  { 
    value: 'echolink' as const, 
    icon: Globe, 
    activeClasses: 'border-green-500 bg-green-500/10',
    iconActiveClasses: 'bg-green-500/20 text-green-600 dark:text-green-400'
  },
  { 
    value: 'aprs' as const, 
    icon: Navigation, 
    activeClasses: 'border-orange-500 bg-orange-500/10',
    iconActiveClasses: 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
  },
]

const props = defineProps<{
  open: boolean
  channel: CommunicationChannel
  branchCity?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const type = ref<InfrastructureType>('vhf_uhf_repeater')
const description = ref('')
const location = ref('')
const district = ref('')

const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const altitude = ref<number | undefined>()
const coverage = ref('')

const locationSelection = computed({
  get(): LocationSelection | null {
    const lat = latitude.value
    const lng = longitude.value
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
      gridSquare: WGS84ToMaidenhead({ lat, lng }, 6),
      city: props.branchCity ?? props.channel.branch?.city ?? '',
      district: district.value?.trim() ?? '',
      lat,
      lng,
      altitude: altitude.value ?? null
    }
  },
  set(val: LocationSelection | null) {
    if (!val) {
      latitude.value = undefined
      longitude.value = undefined
      altitude.value = undefined
      return
    }
    latitude.value = val.lat
    longitude.value = val.lng
    altitude.value = val.altitude ?? undefined
    district.value = val.district
  }
})

const rxFrequency = ref('')
const txFrequency = ref('')
const offset = ref<number | undefined>()

const formatFreq = (val: number | string | undefined): string => {
  if (val === undefined || val === null || val === '') return ''
  const num = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(num) ? '' : num.toFixed(3)
}

const parseFreq = (val: string): number | undefined => {
  if (!val || val.trim() === '') return undefined
  const num = parseFloat(val)
  return isNaN(num) ? undefined : num
}

type ToneType = 'none' | 'ctcss' | 'dcs'
const txToneType = ref<ToneType>('none')
const rxToneType = ref<ToneType>('none')
const txCtcssTone = ref<number | undefined>()
const rxCtcssTone = ref<number | undefined>()
const txDcsCode = ref('')
const txDcsPolarity = ref<'N' | 'I'>('N')
const rxDcsCode = ref('')
const rxDcsPolarity = ref<'N' | 'I'>('N')

const CTCSS_TONES = [
  67.0, 69.3, 71.9, 74.4, 77.0, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8,
  100.0, 103.5, 107.2, 110.9, 114.8, 118.8, 123.0, 127.3, 131.8, 136.5,
  141.3, 146.2, 151.4, 156.7, 162.2, 167.9, 173.8, 179.9, 186.2, 192.8,
  203.5, 210.7, 218.1, 225.7, 233.6, 241.8, 250.3, 254.1
]

const DCS_CODES = [
  '023', '025', '026', '031', '032', '036', '043', '047', '051', '053', '054',
  '065', '071', '072', '073', '074', '114', '115', '116', '122', '125', '131',
  '132', '134', '143', '145', '152', '155', '156', '162', '165', '172', '174',
  '205', '212', '214', '223', '225', '226', '243', '244', '245', '246', '251',
  '252', '255', '261', '263', '265', '266', '271', '274', '306', '311', '315',
  '325', '331', '332', '343', '346', '351', '356', '364', '365', '371', '411',
  '412', '413', '423', '431', '432', '445', '446', '452', '454', '455', '462',
  '464', '465', '466', '503', '506', '516', '523', '526', '532', '546', '565',
  '606', '612', '624', '627', '631', '632', '654', '662', '664', '703', '712',
  '723', '731', '732', '734', '743', '754'
]

const isCalculating = ref(false)
const skipFreqWatch = ref(false)

const hasTxFrequency = computed(() => {
  const freq = parseFreq(txFrequency.value)
  return freq !== undefined && freq > 0
})

watch(offset, (newVal, oldVal) => {
  if (isCalculating.value || skipFreqWatch.value || newVal === oldVal) return
  const txFreq = parseFreq(txFrequency.value)
  if (!txFreq || newVal === undefined) return
  
  isCalculating.value = true
  const rxVal = Math.round((txFreq + (newVal / 1000)) * 1000) / 1000
  rxFrequency.value = formatFreq(rxVal)
  isCalculating.value = false
})

watch(rxFrequency, (newVal, oldVal) => {
  if (isCalculating.value || skipFreqWatch.value || newVal === oldVal) return
  const txFreq = parseFreq(txFrequency.value)
  const rxFreq = parseFreq(newVal)
  if (!txFreq || rxFreq === undefined) return
  
  isCalculating.value = true
  offset.value = Math.round((rxFreq - txFreq) * 1000 * 10) / 10
  isCalculating.value = false
})

const offsetDisplay = computed(() => {
  if (offset.value === undefined) return ''
  const sign = offset.value >= 0 ? '+' : ''
  return `${sign}${offset.value} kHz`
})

const echolinkNode = ref('')
const echolinkName = ref('')

const aprsFrequency = ref('')
const aprsIsIgate = ref(false)
const aprsIsDigipeater = ref(false)
const aprsIgateMode = ref<'rx_only' | 'tx_rx'>('rx_only')
const aprsDigipeaterType = ref<'fill_in' | 'wide'>('wide')
const aprsPath = ref('')
const aprsServer = ref('')


// DMR fields
const repeaterMode = ref<RepeaterMode>('analog')
const brand = ref('')
const dmrColorCode = ref<number | undefined>()
const dmrNetwork = ref<DmrNetwork | undefined>()
const dmrRepeaterId = ref<number | undefined>()
const talkgroups = ref<TalkgroupEntry[]>([])

const isLoading = ref(false)
const isSubmitted = ref(false)

// Form validation setup
const validators = computed(() => ({
  description: [
    (_value: string) => description.value.trim() ? true : t('form.validation.required')
  ]
}))

const { validateForm, getFieldError, shouldShowError, fieldErrors } = useFormValidation(
  validators.value,
  { description: description }
)

const showDistrictField = computed(() => type.value !== 'echolink')

const showLocationFields = computed(() => {
  return type.value === 'vhf_uhf_repeater' || type.value === 'aprs'
})

const showRepeaterFields = computed(() => {
  return type.value === 'vhf_uhf_repeater'
})

const showAnalogFields = computed(() => {
  return showRepeaterFields.value && (repeaterMode.value === 'analog' || repeaterMode.value === 'mixed')
})

const showDmrFields = computed(() => {
  return showRepeaterFields.value && (repeaterMode.value === 'digital' || repeaterMode.value === 'mixed')
})

const showEcholinkFields = computed(() => {
  return type.value === 'echolink'
})

const showAprsFields = computed(() => {
  return type.value === 'aprs'
})

function parseOffset(offsetStr?: string): number | undefined {
  if (!offsetStr) return undefined
  const match = offsetStr.match(/([+-]?\d+(?:\.\d+)?)\s*kHz/i)
  return match && match[1] ? parseFloat(match[1]) : undefined
}

function loadForm() {
  if (!props.channel) return

  skipFreqWatch.value = true
  
  type.value = props.channel.type as InfrastructureType
  description.value = props.channel.description || ''
  location.value = props.channel.location || ''
  district.value = props.channel.district || ''
  latitude.value = props.channel.latitude ? Number(props.channel.latitude) : undefined
  longitude.value = props.channel.longitude ? Number(props.channel.longitude) : undefined
  altitude.value = props.channel.altitude ? Number(props.channel.altitude) : undefined
  coverage.value = props.channel.coverage || ''
  
  rxFrequency.value = formatFreq(props.channel.rxFrequency)
  txFrequency.value = formatFreq(props.channel.txFrequency)
  offset.value = parseOffset(props.channel.offset)
  
  if (props.channel.txCtcssTone) {
    txToneType.value = 'ctcss'
    txCtcssTone.value = Number(props.channel.txCtcssTone)
    txDcsCode.value = ''
    txDcsPolarity.value = 'N'
  } else if (props.channel.txDcsCode) {
    txToneType.value = 'dcs'
    txDcsCode.value = props.channel.txDcsCode
    txDcsPolarity.value = (props.channel.txDcsPolarity as 'N' | 'I') || 'N'
    txCtcssTone.value = undefined
  } else {
    txToneType.value = 'none'
    txCtcssTone.value = undefined
    txDcsCode.value = ''
    txDcsPolarity.value = 'N'
  }
  
  if (props.channel.rxCtcssTone) {
    rxToneType.value = 'ctcss'
    rxCtcssTone.value = Number(props.channel.rxCtcssTone)
    rxDcsCode.value = ''
    rxDcsPolarity.value = 'N'
  } else if (props.channel.rxDcsCode) {
    rxToneType.value = 'dcs'
    rxDcsCode.value = props.channel.rxDcsCode
    rxDcsPolarity.value = (props.channel.rxDcsPolarity as 'N' | 'I') || 'N'
    rxCtcssTone.value = undefined
  } else {
    rxToneType.value = 'none'
    rxCtcssTone.value = undefined
    rxDcsCode.value = ''
    rxDcsPolarity.value = 'N'
  }
  
  echolinkNode.value = props.channel.echolinkNode || ''
  echolinkName.value = props.channel.echolinkName || ''
  
  aprsFrequency.value = formatFreq(props.channel.aprsFrequency)
  aprsIsIgate.value = !!props.channel.aprsIsIgate
  aprsIsDigipeater.value = !!props.channel.aprsIsDigipeater
  aprsIgateMode.value = (props.channel.aprsIgateMode as 'rx_only' | 'tx_rx') || 'rx_only'
  aprsDigipeaterType.value = (props.channel.aprsDigipeaterType as 'fill_in' | 'wide') || 'wide'
  aprsPath.value = props.channel.aprsPath || ''
  aprsServer.value = props.channel.aprsServer || ''

  // DMR fields
  repeaterMode.value = (props.channel.repeaterMode as RepeaterMode) || 'analog'
  brand.value = props.channel.brand || ''
  dmrColorCode.value = props.channel.dmrColorCode ?? undefined
  dmrNetwork.value = (props.channel.dmrNetwork as DmrNetwork | undefined) ?? undefined
  dmrRepeaterId.value = props.channel.dmrRepeaterId ?? undefined
  talkgroups.value = (props.channel.talkgroups || []).map(tg => ({
    talkgroupId: tg.talkgroupId,
    talkgroupName: tg.talkgroupName || '',
    timeslot: tg.timeslot,
    isStatic: tg.isStatic,
  }))
  
  setTimeout(() => {
    skipFreqWatch.value = false
  }, 100)
}

function addTalkgroup() {
  talkgroups.value.push({
    talkgroupId: undefined,
    talkgroupName: '',
    timeslot: 1,
    isStatic: true,
  })
}

function removeTalkgroup(index: number) {
  talkgroups.value.splice(index, 1)
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    isSubmitted.value = false
    fieldErrors.value = {}
    if (props.channel) loadForm()
  }
}, { immediate: true })

watch(() => props.channel, (channel) => {
  if (props.open && channel) {
    loadForm()
  }
}, { immediate: true })

async function handleSubmit() {
  isSubmitted.value = true

  // Validate form
  const isFormValid = validateForm()
  if (!isFormValid) {
    return
  }

  isLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      type: type.value,
      description: description.value.trim() || null,
      district: showDistrictField.value ? district.value.trim() || null : null,
    }

    if (showLocationFields.value) {
      payload.location = location.value.trim() || null
      payload.latitude = latitude.value ?? null
      payload.longitude = longitude.value ?? null
      payload.altitude = altitude.value ?? null
      payload.coverage = coverage.value.trim() || null
    }

    if (showRepeaterFields.value) {
      payload.repeaterMode = repeaterMode.value
      payload.brand = brand.value.trim() || null
      payload.rxFrequency = parseFreq(rxFrequency.value) ?? null
      payload.txFrequency = parseFreq(txFrequency.value) ?? null
      payload.offset = offset.value !== undefined ? offsetDisplay.value : null
      if (showAnalogFields.value) {
        if (txToneType.value === 'ctcss' && txCtcssTone.value) {
          payload.txCtcssTone = txCtcssTone.value
          payload.txDcsCode = null
          payload.txDcsPolarity = null
        } else if (txToneType.value === 'dcs' && txDcsCode.value) {
          payload.txDcsCode = txDcsCode.value
          payload.txDcsPolarity = txDcsPolarity.value
          payload.txCtcssTone = null
        } else {
          payload.txCtcssTone = null
          payload.txDcsCode = null
          payload.txDcsPolarity = null
        }
        
        if (rxToneType.value === 'ctcss' && rxCtcssTone.value) {
          payload.rxCtcssTone = rxCtcssTone.value
          payload.rxDcsCode = null
          payload.rxDcsPolarity = null
        } else if (rxToneType.value === 'dcs' && rxDcsCode.value) {
          payload.rxDcsCode = rxDcsCode.value
          payload.rxDcsPolarity = rxDcsPolarity.value
          payload.rxCtcssTone = null
        } else {
          payload.rxCtcssTone = null
          payload.rxDcsCode = null
          payload.rxDcsPolarity = null
        }
      } else {
        // Clear analog tones when in digital-only mode
        payload.txCtcssTone = null
        payload.txDcsCode = null
        payload.txDcsPolarity = null
        payload.rxCtcssTone = null
        payload.rxDcsCode = null
        payload.rxDcsPolarity = null
      }

      if (showDmrFields.value) {
        payload.dmrColorCode = dmrColorCode.value ?? null
        payload.dmrNetwork = dmrNetwork.value ?? null
        payload.dmrRepeaterId = dmrRepeaterId.value ?? null
        payload.talkgroups = talkgroups.value
          .filter(tg => tg.talkgroupId)
          .map(tg => ({
            talkgroupId: tg.talkgroupId,
            talkgroupName: tg.talkgroupName || undefined,
            timeslot: tg.timeslot,
            isStatic: tg.isStatic,
          }))
      } else {
        // Clear DMR fields when in analog-only mode
        payload.dmrColorCode = null
        payload.dmrNetwork = null
        payload.dmrRepeaterId = null
        payload.talkgroups = []
      }
    }

    if (showEcholinkFields.value) {
      payload.echolinkNode = echolinkNode.value.trim() || null
      payload.echolinkName = echolinkName.value.trim() || null
    }

    if (showAprsFields.value) {
      payload.aprsFrequency = parseFreq(aprsFrequency.value) ?? null
      payload.aprsIsIgate = aprsIsIgate.value
      payload.aprsIsDigipeater = aprsIsDigipeater.value
      payload.aprsIgateMode = aprsIsIgate.value ? aprsIgateMode.value : null
      payload.aprsServer = aprsIsIgate.value ? (aprsServer.value.trim() || null) : null
      payload.aprsDigipeaterType = aprsIsDigipeater.value ? aprsDigipeaterType.value : null
      payload.aprsPath = aprsIsDigipeater.value ? (aprsPath.value.trim() || null) : null
    }

    await api.patch(`/communication-channel/${props.channel.id}`, payload)

    toast.success(t('communicationChannels.updateSuccess'))
    emit('updated')
    emit('update:open', false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-lg overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('communicationChannels.edit') }}</SheetTitle>
        <SheetDescription>{{ t('communicationChannels.editDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
        <div class="space-y-2">
          <Label>{{ t('communicationChannels.type') }}</Label>
          <div 
            v-if="TYPE_OPTIONS.find(opt => opt.value === type)"
            class="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
          >
            <div 
              class="p-2 rounded-md"
              :class="TYPE_OPTIONS.find(opt => opt.value === type)?.iconActiveClasses"
            >
              <component :is="TYPE_OPTIONS.find(opt => opt.value === type)?.icon" class="h-4 w-4" />
            </div>
            <span class="text-sm font-medium">{{ t(`communicationChannels.types.${type}`) }}</span>
          </div>
        </div>

        <div v-if="showRepeaterFields" class="space-y-2">
          <Label for="edit-brand" class="text-xs">{{ t('communicationChannels.brand') }}</Label>
          <Input
            id="edit-brand"
            v-model="brand"
            type="text"
            :placeholder="t('communicationChannels.brandPlaceholder')"
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <Label for="edit-description">{{ t('communicationChannels.description') }}</Label>
          <textarea
            id="edit-description"
            v-model="description"
            rows="3"
            maxlength="500"
            :placeholder="t('communicationChannels.descriptionPlaceholder')"
            :class="[
              'flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
              shouldShowError('description', isSubmitted) ? 'border-destructive' : 'border-input'
            ]"
          />
          <p v-if="shouldShowError('description', isSubmitted)" class="text-xs text-destructive">{{ getFieldError('description') }}</p>
          <p v-else class="text-xs text-muted-foreground">{{ description.length }}/500</p>
        </div>

        <Separator />

        <template v-if="showLocationFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('communicationChannels.locationSection') }}</h4>

            <div class="space-y-2">
              <Label>{{ t('communicationChannels.selectLocationOnMap') }}</Label>
              <LocationMapPicker
                v-model="locationSelection"
                :allowed-province="branchCity ?? channel?.branch?.city"
                :standalone="false"
              />
            </div>

            <div class="space-y-2">
              <Label for="edit-location">{{ t('communicationChannels.location') }}</Label>
              <Input
                id="edit-location"
                v-model="location"
                type="text"
                :placeholder="t('communicationChannels.locationPlaceholder')"
              />
            </div>

            <div class="space-y-2">
              <Label for="edit-coverage">{{ t('communicationChannels.coverage') }}</Label>
              <Input
                id="edit-coverage"
                v-model="coverage"
                type="text"
                :placeholder="t('communicationChannels.coveragePlaceholder')"
              />
            </div>
          </div>

          <Separator />
        </template>

        <template v-if="showRepeaterFields">
          <div class="space-y-2">
            <Label>{{ t('communicationChannels.repeaterMode') }}</Label>
            <div class="flex rounded-lg border border-border overflow-hidden">
              <button
                v-for="mode in (['analog', 'digital', 'mixed'] as const)"
                :key="mode"
                type="button"
                @click="repeaterMode = mode"
                class="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                :class="[
                  repeaterMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                ]"
              >
                {{ t(`communicationChannels.repeaterModes.${mode}`) }}
              </button>
            </div>
          </div>

          <template v-if="showDmrFields">
            <div class="space-y-4">
              <h4 class="text-sm font-medium text-muted-foreground">{{ t('communicationChannels.dmrSection') }}</h4>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="edit-dmrColorCode">{{ t('communicationChannels.dmrColorCode') }}</Label>
                  <Select v-model="dmrColorCode">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="t('communicationChannels.dmrColorCodePlaceholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="cc in 16" :key="cc - 1" :value="cc - 1">
                        CC {{ cc - 1 }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="edit-dmrNetwork">{{ t('communicationChannels.dmrNetwork') }}</Label>
                  <Select v-model="dmrNetwork">
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="t('communicationChannels.dmrNetworkPlaceholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brandmeister">BrandMeister</SelectItem>
                      <SelectItem value="tgif">TGIF</SelectItem>
                      <SelectItem value="freedmr">FreeDMR</SelectItem>
                      <SelectItem value="other">{{ t('common.other') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div class="space-y-2">
                <Label for="edit-dmrRepeaterId">{{ t('communicationChannels.dmrRepeaterId') }}</Label>
                <Input
                  id="edit-dmrRepeaterId"
                  v-model.number="dmrRepeaterId"
                  type="number"
                  placeholder="286001"
                />
              </div>

              <Separator />

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-sm font-medium text-muted-foreground">{{ t('communicationChannels.talkgroups') }}</h4>
                  <Button type="button" variant="outline" size="sm" @click="addTalkgroup">
                    <Plus class="h-3 w-3 mr-1" />
                    {{ t('common.add') }}
                  </Button>
                </div>

                <div v-if="talkgroups.length === 0" class="text-center py-4">
                  <p class="text-xs text-muted-foreground">{{ t('communicationChannels.noTalkgroups') }}</p>
                </div>

                <div v-for="(tg, index) in talkgroups" :key="index" class="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/10">
                  <Input
                    v-model.number="tg.talkgroupId"
                    type="number"
                    placeholder="TG ID"
                    class="w-20 h-8 text-xs"
                  />
                  <Input
                    v-model="tg.talkgroupName"
                    type="text"
                    :placeholder="t('communicationChannels.talkgroupName')"
                    class="flex-1 h-8 text-xs"
                  />
                  <Select v-model="tg.timeslot" class="w-16">
                    <SelectTrigger class="h-8 text-xs w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="1">TS1</SelectItem>
                      <SelectItem :value="2">TS2</SelectItem>
                    </SelectContent>
                  </Select>
                  <label class="flex items-center gap-1 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      :checked="tg.isStatic"
                      class="h-4 w-4 rounded border-input"
                      @change="tg.isStatic = ($event.target as HTMLInputElement).checked"
                    />
                    <span class="text-[10px]">{{ t('communicationChannels.static') }}</span>
                  </label>
                  <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0 shrink-0" @click="removeTalkgroup(index)">
                    <X class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Separator />
          </template>

          <template v-if="showAnalogFields">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- TX Card -->
            <div class="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </div>
                <h4 class="text-sm font-semibold">TX</h4>
                <span class="text-xs text-muted-foreground">{{ t('communicationChannels.txLabel') }}</span>
              </div>

              <div class="space-y-2">
                <Label for="edit-txFrequency" class="text-xs">{{ t('communicationChannels.frequency') }} <span class="text-destructive">*</span></Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="edit-txFrequency"
                    v-model="txFrequency"
                    type="text"
                    inputmode="decimal"
                    placeholder="439.125"
                    class="flex-1"
                  />
                  <span class="text-xs text-muted-foreground">MHz</span>
                </div>
              </div>

              <Separator class="my-2" />
              <div class="space-y-3">
                <Label class="text-xs">{{ t('communicationChannels.tone') }}</Label>
                <Select v-model="txToneType">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{{ t('communicationChannels.toneTypes.none') }}</SelectItem>
                    <SelectItem value="ctcss">CTCSS</SelectItem>
                    <SelectItem value="dcs">DCS</SelectItem>
                  </SelectContent>
                </Select>

                <Select v-if="txToneType === 'ctcss'" v-model="txCtcssTone">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue :placeholder="t('communicationChannels.selectCtcssTone')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="tone in CTCSS_TONES" :key="tone" :value="tone">
                      {{ tone }} Hz
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div v-if="txToneType === 'dcs'" class="flex gap-2">
                  <Select v-model="txDcsCode" class="flex-1">
                    <SelectTrigger class="w-full h-8 text-xs">
                      <SelectValue :placeholder="t('communicationChannels.selectDcsCode')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="code in DCS_CODES" :key="code" :value="code">
                        D{{ code }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select v-model="txDcsPolarity">
                    <SelectTrigger class="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">N</SelectItem>
                      <SelectItem value="I">I</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <!-- RX Card -->
            <div class="p-4 rounded-lg border border-border bg-muted/20 space-y-4" :class="{ 'opacity-50': !hasTxFrequency }">
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                </div>
                <h4 class="text-sm font-semibold">RX</h4>
                <span class="text-xs text-muted-foreground">{{ t('communicationChannels.rxLabel') }}</span>
              </div>

              <div class="space-y-2">
                <Label for="edit-offset" class="text-xs">{{ t('communicationChannels.offset') }}</Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="edit-offset"
                    v-model.number="offset"
                    type="number"
                    step="1"
                    placeholder="-600"
                    :disabled="!hasTxFrequency"
                    class="flex-1"
                  />
                  <span class="text-xs text-muted-foreground">kHz</span>
                </div>
              </div>

              <div class="space-y-2">
                <Label for="edit-rxFrequency" class="text-xs">{{ t('communicationChannels.frequency') }}</Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="edit-rxFrequency"
                    v-model="rxFrequency"
                    type="text"
                    inputmode="decimal"
                    placeholder="439.725"
                    :disabled="!hasTxFrequency"
                    class="flex-1"
                  />
                  <span class="text-xs text-muted-foreground">MHz</span>
                </div>
                <p class="text-[10px] text-muted-foreground">{{ t('communicationChannels.offsetOrRxHint') }}</p>
              </div>

              <Separator class="my-2" />
              <div class="space-y-3">
                <Label class="text-xs">{{ t('communicationChannels.tone') }}</Label>
                <Select v-model="rxToneType" :disabled="!hasTxFrequency">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{{ t('communicationChannels.toneTypes.none') }}</SelectItem>
                    <SelectItem value="ctcss">CTCSS</SelectItem>
                    <SelectItem value="dcs">DCS</SelectItem>
                  </SelectContent>
                </Select>

                <Select v-if="rxToneType === 'ctcss'" v-model="rxCtcssTone" :disabled="!hasTxFrequency">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue :placeholder="t('communicationChannels.selectCtcssTone')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="tone in CTCSS_TONES" :key="tone" :value="tone">
                      {{ tone }} Hz
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div v-if="rxToneType === 'dcs'" class="flex gap-2">
                  <Select v-model="rxDcsCode" class="flex-1" :disabled="!hasTxFrequency">
                    <SelectTrigger class="w-full h-8 text-xs">
                      <SelectValue :placeholder="t('communicationChannels.selectDcsCode')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="code in DCS_CODES" :key="code" :value="code">
                        D{{ code }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select v-model="rxDcsPolarity" :disabled="!hasTxFrequency">
                    <SelectTrigger class="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N">N</SelectItem>
                      <SelectItem value="I">I</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <p v-if="!hasTxFrequency" class="text-xs text-muted-foreground text-center">{{ t('communicationChannels.enterTxFirst') }}</p>

          <Separator />
          </template>
        </template>

        <template v-if="showEcholinkFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('communicationChannels.echolinkSection') }}</h4>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="edit-echolinkNode">{{ t('communicationChannels.echolinkNode') }}</Label>
                <Input
                  id="edit-echolinkNode"
                  v-model="echolinkNode"
                  type="text"
                  placeholder="123456"
                />
              </div>
              <div class="space-y-2">
                <Label for="edit-echolinkName">{{ t('communicationChannels.echolinkName') }}</Label>
                <Input
                  id="edit-echolinkName"
                  v-model="echolinkName"
                  type="text"
                  placeholder="TA3ABC-L"
                />
              </div>
            </div>
          </div>

          <Separator />
        </template>

        <template v-if="showAprsFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('communicationChannels.aprsSection') }}</h4>

            <div class="space-y-2">
              <Label for="edit-aprsFrequency">{{ t('communicationChannels.aprsFrequency') }}</Label>
              <Input
                id="edit-aprsFrequency"
                v-model="aprsFrequency"
                type="text"
                inputmode="decimal"
                placeholder="144.800"
              />
            </div>

            <div class="space-y-3">
              <Label>{{ t('communicationChannels.aprsStationType') }}</Label>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="aprsIsIgate"
                    type="checkbox"
                    class="h-4 w-4 rounded border-input"
                  />
                  <span class="text-sm">{{ t('communicationChannels.aprsIgate') }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="aprsIsDigipeater"
                    type="checkbox"
                    class="h-4 w-4 rounded border-input"
                  />
                  <span class="text-sm">{{ t('communicationChannels.aprsDigipeater') }}</span>
                </label>
              </div>
            </div>

            <div v-if="aprsIsIgate" class="p-3 rounded-lg border border-border/50 space-y-3">
              <h5 class="text-xs font-medium">{{ t('communicationChannels.aprsIgateSettings') }}</h5>
              
              <div class="space-y-2">
                <Label>{{ t('communicationChannels.aprsIgateMode') }}</Label>
                <Select v-model="aprsIgateMode">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rx_only">{{ t('communicationChannels.aprsIgateModes.rx_only') }}</SelectItem>
                    <SelectItem value="tx_rx">{{ t('communicationChannels.aprsIgateModes.tx_rx') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="edit-aprsServer">{{ t('communicationChannels.aprsServer') }}</Label>
                <Input
                  id="edit-aprsServer"
                  v-model="aprsServer"
                  type="text"
                  placeholder="rotate.aprs2.net:14580"
                />
              </div>
            </div>

            <div v-if="aprsIsDigipeater" class="p-3 rounded-lg border border-border/50 space-y-3">
              <h5 class="text-xs font-medium">{{ t('communicationChannels.aprsDigipeaterSettings') }}</h5>
              
              <div class="space-y-2">
                <Label>{{ t('communicationChannels.aprsDigipeaterType') }}</Label>
                <Select v-model="aprsDigipeaterType">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fill_in">{{ t('communicationChannels.aprsDigipeaterTypes.fill_in') }}</SelectItem>
                    <SelectItem value="wide">{{ t('communicationChannels.aprsDigipeaterTypes.wide') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="edit-aprsPath">{{ t('communicationChannels.aprsPath') }}</Label>
                <Input
                  id="edit-aprsPath"
                  v-model="aprsPath"
                  type="text"
                  placeholder="WIDE1-1, WIDE2-2"
                />
                <p class="text-xs text-muted-foreground">{{ t('communicationChannels.aprsPathHint') }}</p>
              </div>
            </div>
          </div>

          <Separator />
        </template>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isLoading">
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
