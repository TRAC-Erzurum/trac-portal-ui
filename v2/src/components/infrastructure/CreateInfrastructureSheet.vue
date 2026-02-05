<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { TowerControl, Globe, Navigation, Waves } from 'lucide-vue-next'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs' | 'hf'

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
  { 
    value: 'hf' as const, 
    icon: Waves, 
    activeClasses: 'border-red-500 bg-red-500/10',
    iconActiveClasses: 'bg-red-500/20 text-red-600 dark:text-red-400'
  },
]

const props = defineProps<{
  open: boolean
  branchId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()

const name = ref('')
const type = ref<InfrastructureType>('vhf_uhf_repeater')
const description = ref('')
const location = ref('')
const latitude = ref<number | undefined>()
const longitude = ref<number | undefined>()
const altitude = ref<number | undefined>()
const coverage = ref('')

const rxFrequency = ref<number | undefined>()
const txFrequency = ref<number | undefined>()
const offset = ref<number | undefined>()

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

const hasTxFrequency = computed(() => txFrequency.value !== undefined && txFrequency.value > 0)

watch(offset, (newVal, oldVal) => {
  if (isCalculating.value || newVal === oldVal) return
  if (!hasTxFrequency.value || newVal === undefined) return
  
  isCalculating.value = true
  rxFrequency.value = Math.round((txFrequency.value! + (newVal / 1000)) * 10000) / 10000
  isCalculating.value = false
})

watch(rxFrequency, (newVal, oldVal) => {
  if (isCalculating.value || newVal === oldVal) return
  if (!hasTxFrequency.value || newVal === undefined) return
  
  isCalculating.value = true
  offset.value = Math.round((newVal - txFrequency.value!) * 1000 * 10) / 10
  isCalculating.value = false
})

const offsetDisplay = computed(() => {
  if (offset.value === undefined) return ''
  const sign = offset.value >= 0 ? '+' : ''
  return `${sign}${offset.value} kHz`
})

const echolinkNode = ref('')
const echolinkName = ref('')

const aprsFrequency = ref<number | undefined>()
const aprsIsIgate = ref(false)
const aprsIsDigipeater = ref(false)
const aprsIgateMode = ref<'rx_only' | 'tx_rx'>('rx_only')
const aprsDigipeaterType = ref<'fill_in' | 'wide'>('wide')
const aprsPath = ref('')
const aprsServer = ref('')
const digipeater = ref('')

const hfFrequencyRange = ref('')
const hfMode = ref('')

const isLoading = ref(false)

const isValid = computed(() => {
  if (!name.value.trim() || !type.value) return false
  return true
})

const showLocationFields = computed(() => {
  return type.value === 'vhf_uhf_repeater' || type.value === 'aprs'
})

const showRepeaterFields = computed(() => {
  return type.value === 'vhf_uhf_repeater'
})

const showEcholinkFields = computed(() => {
  return type.value === 'echolink'
})

const showAprsFields = computed(() => {
  return type.value === 'aprs'
})

const showHfFields = computed(() => {
  return type.value === 'hf'
})

function resetForm() {
  name.value = ''
  type.value = 'vhf_uhf_repeater'
  description.value = ''
  location.value = ''
  latitude.value = undefined
  longitude.value = undefined
  altitude.value = undefined
  coverage.value = ''
  rxFrequency.value = undefined
  txFrequency.value = undefined
  offset.value = undefined
  txToneType.value = 'none'
  rxToneType.value = 'none'
  txCtcssTone.value = undefined
  rxCtcssTone.value = undefined
  txDcsCode.value = ''
  txDcsPolarity.value = 'N'
  rxDcsCode.value = ''
  rxDcsPolarity.value = 'N'
  echolinkNode.value = ''
  echolinkName.value = ''
  aprsFrequency.value = undefined
  aprsIsIgate.value = false
  aprsIsDigipeater.value = false
  aprsIgateMode.value = 'rx_only'
  aprsDigipeaterType.value = 'wide'
  aprsPath.value = ''
  aprsServer.value = ''
  digipeater.value = ''
  hfFrequencyRange.value = ''
  hfMode.value = ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})

async function handleSubmit() {
  if (!isValid.value) return

  isLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      branchId: props.branchId,
      name: name.value.trim(),
      type: type.value,
      description: description.value.trim() || undefined,
    }

    if (showLocationFields.value) {
      payload.location = location.value.trim() || undefined
      payload.latitude = latitude.value
      payload.longitude = longitude.value
      payload.altitude = altitude.value
      payload.coverage = coverage.value.trim() || undefined
    }

    if (showRepeaterFields.value) {
      payload.repeaterMode = 'analog'
      payload.rxFrequency = rxFrequency.value
      payload.txFrequency = txFrequency.value
      payload.offset = offset.value !== undefined ? offsetDisplay.value : undefined
      if (txToneType.value === 'ctcss' && txCtcssTone.value) {
        payload.txCtcssTone = txCtcssTone.value
      }
      if (txToneType.value === 'dcs' && txDcsCode.value) {
        payload.txDcsCode = txDcsCode.value
        payload.txDcsPolarity = txDcsPolarity.value
      }
      if (rxToneType.value === 'ctcss' && rxCtcssTone.value) {
        payload.rxCtcssTone = rxCtcssTone.value
      }
      if (rxToneType.value === 'dcs' && rxDcsCode.value) {
        payload.rxDcsCode = rxDcsCode.value
        payload.rxDcsPolarity = rxDcsPolarity.value
      }
    }

    if (showEcholinkFields.value) {
      payload.echolinkNode = echolinkNode.value.trim() || undefined
      payload.echolinkName = echolinkName.value.trim() || undefined
    }

    if (showAprsFields.value) {
      payload.aprsFrequency = aprsFrequency.value
      payload.aprsIsIgate = aprsIsIgate.value
      payload.aprsIsDigipeater = aprsIsDigipeater.value
      if (aprsIsIgate.value) {
        payload.aprsIgateMode = aprsIgateMode.value
        payload.aprsServer = aprsServer.value.trim() || undefined
      }
      if (aprsIsDigipeater.value) {
        payload.aprsDigipeaterType = aprsDigipeaterType.value
        payload.aprsPath = aprsPath.value.trim() || undefined
      }
    }

    if (showHfFields.value) {
      payload.hfFrequencyRange = hfFrequencyRange.value.trim() || undefined
      payload.hfMode = hfMode.value.trim() || undefined
    }

    await api.post(`/branches/${props.branchId}/infrastructure`, payload)

    toast.success(t('infrastructure.createSuccess'))
    emit('created')
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
    <SheetContent class="sm:max-w-lg px-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{{ t('infrastructure.create') }}</SheetTitle>
        <SheetDescription>{{ t('infrastructure.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6">
        <div class="space-y-3">
          <Label>{{ t('infrastructure.type') }} <span class="text-destructive">*</span></Label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in TYPE_OPTIONS"
              :key="opt.value"
              type="button"
              @click="type = opt.value"
              class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left"
              :class="[
                type === opt.value 
                  ? opt.activeClasses 
                  : 'border-border hover:border-muted-foreground/50'
              ]"
            >
              <div 
                class="p-2 rounded-md"
                :class="[
                  type === opt.value 
                    ? opt.iconActiveClasses 
                    : 'bg-muted text-muted-foreground'
                ]"
              >
                <component :is="opt.icon" class="h-4 w-4" />
              </div>
              <span class="text-sm font-medium">{{ t(`infrastructure.types.${opt.value}`) }}</span>
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="name">{{ t('infrastructure.name') }} <span class="text-destructive">*</span></Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('infrastructure.namePlaceholder')"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="description">{{ t('infrastructure.description') }}</Label>
          <textarea
            id="description"
            v-model="description"
            rows="2"
            :placeholder="t('infrastructure.descriptionPlaceholder')"
            class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        <Separator />

        <template v-if="showLocationFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('infrastructure.locationSection') }}</h4>

            <div class="space-y-2">
              <Label for="location">{{ t('infrastructure.location') }}</Label>
              <Input
                id="location"
                v-model="location"
                type="text"
                :placeholder="t('infrastructure.locationPlaceholder')"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="latitude">{{ t('infrastructure.latitude') }}</Label>
                <Input
                  id="latitude"
                  v-model.number="latitude"
                  type="number"
                  step="0.0000001"
                  min="-90"
                  max="90"
                  placeholder="41.0082"
                />
              </div>
              <div class="space-y-2">
                <Label for="longitude">{{ t('infrastructure.longitude') }}</Label>
                <Input
                  id="longitude"
                  v-model.number="longitude"
                  type="number"
                  step="0.0000001"
                  min="-180"
                  max="180"
                  placeholder="28.9784"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="altitude">{{ t('infrastructure.altitude') }}</Label>
                <Input
                  id="altitude"
                  v-model.number="altitude"
                  type="number"
                  placeholder="1200"
                />
              </div>
              <div class="space-y-2">
                <Label for="coverage">{{ t('infrastructure.coverage') }}</Label>
                <Input
                  id="coverage"
                  v-model="coverage"
                  type="text"
                  :placeholder="t('infrastructure.coveragePlaceholder')"
                />
              </div>
            </div>
          </div>

          <Separator />
        </template>

        <template v-if="showRepeaterFields">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- TX Card -->
            <div class="p-4 rounded-lg border border-border bg-muted/20 space-y-4">
              <div class="flex items-center gap-2">
                <div class="p-1.5 rounded bg-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </div>
                <h4 class="text-sm font-semibold">TX</h4>
                <span class="text-xs text-muted-foreground">{{ t('infrastructure.txLabel') }}</span>
              </div>

              <div class="space-y-2">
                <Label for="txFrequency" class="text-xs">{{ t('infrastructure.frequency') }} <span class="text-destructive">*</span></Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="txFrequency"
                    v-model.number="txFrequency"
                    type="number"
                    step="0.0001"
                    placeholder="439.125"
                    class="flex-1"
                  />
                  <span class="text-xs text-muted-foreground">MHz</span>
                </div>
              </div>

              <Separator class="my-2" />
              <div class="space-y-3">
                <Label class="text-xs">{{ t('infrastructure.tone') }}</Label>
                <Select v-model="txToneType">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{{ t('infrastructure.toneTypes.none') }}</SelectItem>
                    <SelectItem value="ctcss">CTCSS</SelectItem>
                    <SelectItem value="dcs">DCS</SelectItem>
                  </SelectContent>
                </Select>

                <Select v-if="txToneType === 'ctcss'" v-model="txCtcssTone">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue :placeholder="t('infrastructure.selectCtcssTone')" />
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
                      <SelectValue :placeholder="t('infrastructure.selectDcsCode')" />
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
                <span class="text-xs text-muted-foreground">{{ t('infrastructure.rxLabel') }}</span>
              </div>

              <div class="space-y-2">
                <Label for="offset" class="text-xs">{{ t('infrastructure.offset') }}</Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="offset"
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
                <Label for="rxFrequency" class="text-xs">{{ t('infrastructure.frequency') }}</Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="rxFrequency"
                    v-model.number="rxFrequency"
                    type="number"
                    step="0.0001"
                    placeholder="439.725"
                    :disabled="!hasTxFrequency"
                    class="flex-1"
                  />
                  <span class="text-xs text-muted-foreground">MHz</span>
                </div>
                <p class="text-[10px] text-muted-foreground">{{ t('infrastructure.offsetOrRxHint') }}</p>
              </div>

              <Separator class="my-2" />
              <div class="space-y-3">
                <Label class="text-xs">{{ t('infrastructure.tone') }}</Label>
                <Select v-model="rxToneType" :disabled="!hasTxFrequency">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{{ t('infrastructure.toneTypes.none') }}</SelectItem>
                    <SelectItem value="ctcss">CTCSS</SelectItem>
                    <SelectItem value="dcs">DCS</SelectItem>
                  </SelectContent>
                </Select>

                <Select v-if="rxToneType === 'ctcss'" v-model="rxCtcssTone" :disabled="!hasTxFrequency">
                  <SelectTrigger class="w-full h-8 text-xs">
                    <SelectValue :placeholder="t('infrastructure.selectCtcssTone')" />
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
                      <SelectValue :placeholder="t('infrastructure.selectDcsCode')" />
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

          <p v-if="!hasTxFrequency" class="text-xs text-muted-foreground text-center">{{ t('infrastructure.enterTxFirst') }}</p>

          <Separator />
        </template>

        <template v-if="showEcholinkFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('infrastructure.echolinkSection') }}</h4>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="echolinkNode">{{ t('infrastructure.echolinkNode') }}</Label>
                <Input
                  id="echolinkNode"
                  v-model="echolinkNode"
                  type="text"
                  placeholder="123456"
                />
              </div>
              <div class="space-y-2">
                <Label for="echolinkName">{{ t('infrastructure.echolinkName') }}</Label>
                <Input
                  id="echolinkName"
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
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('infrastructure.aprsSection') }}</h4>

            <div class="space-y-2">
              <Label for="aprsFrequency">{{ t('infrastructure.aprsFrequency') }}</Label>
              <Input
                id="aprsFrequency"
                v-model.number="aprsFrequency"
                type="number"
                step="0.0001"
                placeholder="144.800"
              />
            </div>

            <div class="space-y-3">
              <Label>{{ t('infrastructure.aprsStationType') }}</Label>
              <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox :checked="aprsIsIgate" @update:checked="(v: boolean) => aprsIsIgate = v" />
                  <span class="text-sm">{{ t('infrastructure.aprsIgate') }}</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <Checkbox :checked="aprsIsDigipeater" @update:checked="(v: boolean) => aprsIsDigipeater = v" />
                  <span class="text-sm">{{ t('infrastructure.aprsDigipeater') }}</span>
                </label>
              </div>
            </div>

            <div v-if="aprsIsIgate" class="p-3 rounded-lg border border-border/50 space-y-3">
              <h5 class="text-xs font-medium">{{ t('infrastructure.aprsIgateSettings') }}</h5>
              
              <div class="space-y-2">
                <Label>{{ t('infrastructure.aprsIgateMode') }}</Label>
                <Select v-model="aprsIgateMode">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rx_only">{{ t('infrastructure.aprsIgateModes.rx_only') }}</SelectItem>
                    <SelectItem value="tx_rx">{{ t('infrastructure.aprsIgateModes.tx_rx') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="aprsServer">{{ t('infrastructure.aprsServer') }}</Label>
                <Input
                  id="aprsServer"
                  v-model="aprsServer"
                  type="text"
                  placeholder="rotate.aprs2.net:14580"
                />
              </div>
            </div>

            <div v-if="aprsIsDigipeater" class="p-3 rounded-lg border border-border/50 space-y-3">
              <h5 class="text-xs font-medium">{{ t('infrastructure.aprsDigipeaterSettings') }}</h5>
              
              <div class="space-y-2">
                <Label>{{ t('infrastructure.aprsDigipeaterType') }}</Label>
                <Select v-model="aprsDigipeaterType">
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fill_in">{{ t('infrastructure.aprsDigipeaterTypes.fill_in') }}</SelectItem>
                    <SelectItem value="wide">{{ t('infrastructure.aprsDigipeaterTypes.wide') }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label for="aprsPath">{{ t('infrastructure.aprsPath') }}</Label>
                <Input
                  id="aprsPath"
                  v-model="aprsPath"
                  type="text"
                  placeholder="WIDE1-1, WIDE2-2"
                />
                <p class="text-xs text-muted-foreground">{{ t('infrastructure.aprsPathHint') }}</p>
              </div>
            </div>
          </div>

          <Separator />
        </template>

        <template v-if="showHfFields">
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('infrastructure.hfSection') }}</h4>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="hfFrequencyRange">{{ t('infrastructure.hfFrequencyRange') }}</Label>
                <Input
                  id="hfFrequencyRange"
                  v-model="hfFrequencyRange"
                  type="text"
                  placeholder="7.000 - 7.200 MHz"
                />
              </div>
              <div class="space-y-2">
                <Label for="hfMode">{{ t('infrastructure.hfMode') }}</Label>
                <Input
                  id="hfMode"
                  v-model="hfMode"
                  type="text"
                  placeholder="SSB, CW, FT8"
                />
              </div>
            </div>
          </div>

          <Separator />
        </template>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isLoading || !isValid">
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
