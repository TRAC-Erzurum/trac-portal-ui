<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Search, X, Check } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { translateError } from '@/i18n'
import { formatCommunicationChannelLabel } from '@/lib/formatters'
import { api, type ApiError } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { useFormValidation } from '@/composables'
import type { Branch } from '@/stores/branch'
import type { CommunicationChannel } from '@/types/communication-channel'

interface Operator {
  id: string
  callSign: string
  fullName?: string
  user?: {
    fullName?: string
    role?: string
  }
}

interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

interface NetCommunicationChannel {
  id: string
  communicationChannelId?: string
  isSimplexAdHoc?: boolean
  simplexFrequency?: string
}

interface CertificateTemplate {
  id: string
  name: string
  imagePath: string
  elements: unknown[]
}

interface Net {
  id: string
  name: string
  operator: Operator
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
    callSigns?: BranchCallSign[]
  }
  branchId?: string
  branchCallSignId?: string
  branchCallSign?: BranchCallSign
  certificateTemplateId?: string | null
  certificateTemplate?: CertificateTemplate | null
  communicationChannels?: NetCommunicationChannel[]
  scheduledAt?: string | null
  estimatedDurationMinutes?: number | null
}

const props = defineProps<{
  open: boolean
  net: Net
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const name = ref('')
const scheduledTime = ref('20:00')
const estimatedDurationMinutes = ref(30)
const selectedOperator = ref<Operator | null>(null)
const isLoading = ref(false)
const isSubmitted = ref(false)

const operatorSearch = ref('')
const operatorSuggestions = ref<Operator[]>([])
const isSearchingOperators = ref(false)
const showOperatorDropdown = ref(false)

const branchCallSigns = ref<BranchCallSign[]>([])
const selectedCallSignId = ref<string>('')
const isLoadingCallSigns = ref(false)

/** Sentinel for "no template"; SelectItem cannot use value="" */
const NO_TEMPLATE_VALUE = '__none__'

const certificateTemplates = ref<CertificateTemplate[]>([])
const selectedCertificateTemplateId = ref<string>(NO_TEMPLATE_VALUE)
const isLoadingCertificateTemplates = ref(false)

const branch = computed(() => {
  if (props.net?.branch) {
    return {
      id: props.net.branch.id,
      name: props.net.branch.name,
      isHeadquarters: props.net.branch.isHeadquarters,
      callSigns: props.net.branch.callSigns || []
    } as Branch
  }
  return null
})
const branchDisplayName = ref('')

const channels = ref<CommunicationChannel[]>([])
const selectedChannelIds = ref<string[]>([])
const isLoadingChannels = ref(false)

interface SimplexRow {
  checked: boolean
  value: string
}
const simplexRows = ref<SimplexRow[]>([{ checked: false, value: '' }])

// Form validation setup
const validators = computed(() => ({
  name: [
    (_value: string) => name.value.trim() ? true : t('form.validation.required')
  ],
  operator: [
    (_value: Operator | null) => selectedOperator.value ? true : t('form.validation.required')
  ],
  callSign: [
    (_value: string) => selectedCallSignId.value ? true : t('form.validation.required')
  ],
  channels: [
    (_value: any) => {
      const allCheckedRowsFilled = simplexRows.value
        .filter(row => row.checked)
        .every(row => row.value.trim())
      const hasChannels = selectedChannelIds.value.length > 0 || 
        simplexRows.value.some(row => row.checked && row.value.trim())
      return (hasChannels && allCheckedRowsFilled) ? true : t('nets.atLeastOneInfrastructureOrSimplexRequired')
    }
  ]
}))

const { validateForm, getFieldError, shouldShowError, fieldErrors } = useFormValidation(
  validators.value,
  {
    name: name,
    operator: selectedOperator,
    callSign: selectedCallSignId,
    channels: selectedChannelIds
  }
)

const getOperatorLabel = (op: Operator) => {
  const displayName = op.user?.fullName || op.fullName
  if (displayName) {
    return `${op.callSign} - ${displayName}`
  }
  return op.callSign
}

const loadBranchCallSigns = async (branchId: string) => {
  if (!branchId) {
    branchCallSigns.value = []
    return
  }
  
  isLoadingCallSigns.value = true
  try {
    const branchData = await api.get<Branch>(`/branches/${branchId}`)
    branchCallSigns.value = branchData.callSigns || []
  } catch (error) {
    console.error('Failed to load call signs:', error)
    branchCallSigns.value = []
  } finally {
    isLoadingCallSigns.value = false
  }
}

const loadChannels = async (branchId: string) => {
  if (!branchId) {
    channels.value = []
    return
  }
  
  isLoadingChannels.value = true
  try {
    const response = await api.get<{ data: CommunicationChannel[]; total: number }>(`/branches/${branchId}/communication-channel?pageSize=100`)
    channels.value = response.data.filter(ch => ch.isActive)
  } catch (error) {
    console.error('Failed to load communication channels:', error)
    channels.value = []
  } finally {
    isLoadingChannels.value = false
  }
}

const loadCertificateTemplates = async (branchId: string) => {
  if (!branchId) {
    certificateTemplates.value = []
    return
  }
  isLoadingCertificateTemplates.value = true
  try {
    certificateTemplates.value = await api.get<CertificateTemplate[]>(`/branches/${branchId}/certificate-templates`)
  } catch (error) {
    console.error('Failed to load certificate templates:', error)
    certificateTemplates.value = []
  } finally {
    isLoadingCertificateTemplates.value = false
  }
}

const searchOperators = debounce(async (query: string) => {
  if (!query || query.length < 2) {
    operatorSuggestions.value = []
    return
  }
  if (!branch.value?.id) {
    operatorSuggestions.value = []
    return
  }
  isSearchingOperators.value = true
  try {
    const response = await api.get<Operator[]>(`/operator/search?q=${encodeURIComponent(query)}&sortBy=managed&branchId=${branch.value.id}`)
    operatorSuggestions.value = response || []
  } catch {
    operatorSuggestions.value = []
  } finally {
    isSearchingOperators.value = false
  }
}, 300)

watch(operatorSearch, (val) => {
  if (val && (!selectedOperator.value || val !== getOperatorLabel(selectedOperator.value))) {
    showOperatorDropdown.value = true
    searchOperators(val)
  } else {
    operatorSuggestions.value = []
  }
})

const selectOperator = (op: Operator) => {
  selectedOperator.value = op
  operatorSearch.value = getOperatorLabel(op)
  showOperatorDropdown.value = false
  operatorSuggestions.value = []
}

const clearOperator = () => {
  selectedOperator.value = null
  operatorSearch.value = ''
  operatorSuggestions.value = []
}

const toggleChannel = (channelId: string, e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    if (!selectedChannelIds.value.includes(channelId)) {
      selectedChannelIds.value = [...selectedChannelIds.value, channelId]
    }
  } else {
    selectedChannelIds.value = selectedChannelIds.value.filter(id => id !== channelId)
  }
}

const simplexInputRefs = ref<(HTMLInputElement | null)[]>([])

const setSimplexRowRef = (index: number, el: unknown) => {
  if (!el) {
    simplexInputRefs.value[index] = null
    return
  }
  const root = el as HTMLElement
  const textInput = root.querySelector?.<HTMLInputElement>('input[type="text"]')
  simplexInputRefs.value[index] = textInput ?? null
}

const setSimplexRowChecked = (index: number, checked: boolean) => {
  const row = simplexRows.value[index]
  if (!row) return
  simplexRows.value[index] = { checked, value: row.value }
  if (checked) {
    nextTick(() => simplexInputRefs.value[index]?.focus())
  }
}

const setSimplexRowValue = (index: number, value: string) => {
  const row = simplexRows.value[index]
  if (!row) return
  simplexRows.value[index] = { checked: row.checked, value }
}

const ensureOneEmptySimplexRow = () => {
  const hasEmpty = simplexRows.value.some(row => !row.value.trim())
  if (!hasEmpty) {
    simplexRows.value.push({ checked: false, value: '' })
  }
}

const handleSimplexBlur = (index: number) => {
  const row = simplexRows.value[index]
  if (!row) return
  if (!row.value.trim()) {
    simplexRows.value.splice(index, 1)
    if (simplexRows.value.length === 0) {
      simplexRows.value.push({ checked: false, value: '' })
    } else {
      ensureOneEmptySimplexRow()
    }
    nextTick(() => { simplexInputRefs.value.length = 0 })
  } else {
    ensureOneEmptySimplexRow()
  }
}

const clearSimplexRow = (index: number) => {
  const row = simplexRows.value[index]
  if (!row) return
  simplexRows.value[index] = { ...row, value: '' }
  simplexInputRefs.value[index]?.focus()
}

function scheduledAtToTimeStr(iso: string | null | undefined): string {
  if (!iso) return '20:00'
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.net) {
    isSubmitted.value = false
    fieldErrors.value = {}
    name.value = props.net.name
    scheduledTime.value = scheduledAtToTimeStr(props.net.scheduledAt)
    estimatedDurationMinutes.value = props.net.estimatedDurationMinutes ?? 30
    selectedOperator.value = props.net.operator
    operatorSearch.value = getOperatorLabel(props.net.operator)
    branchDisplayName.value = props.net.branch?.name || ''
    
    selectedCallSignId.value = props.net.branchCallSignId || ''
    
    selectedCertificateTemplateId.value = props.net.certificateTemplateId ?? NO_TEMPLATE_VALUE

    if (props.net.branch?.id) {
      await Promise.all([
        loadBranchCallSigns(props.net.branch.id),
        loadChannels(props.net.branch.id),
        loadCertificateTemplates(props.net.branch.id)
      ])
    }
    
    selectedChannelIds.value = []

    const simplexFromNet = props.net.communicationChannels
      ?.filter(nc => nc.isSimplexAdHoc && nc.simplexFrequency)
      .map(nc => ({ checked: true, value: (nc.simplexFrequency || '').trim() }))
      .filter(row => row.value) ?? []
    simplexRows.value =
      simplexFromNet.length > 0
        ? [...simplexFromNet, { checked: false, value: '' }]
        : [{ checked: false, value: '' }]

    if (props.net.communicationChannels) {
      props.net.communicationChannels.forEach(nc => {
        if (nc.communicationChannelId) {
          selectedChannelIds.value.push(nc.communicationChannelId)
        }
      })
    }
  }
})

async function handleSubmit() {
  isSubmitted.value = true

  // Validate form
  const isFormValid = validateForm()
  if (!isFormValid) {
    return
  }

  const simplexFreqs = simplexRows.value
    .filter(row => row.checked && row.value.trim())
    .map(row => row.value.trim())
  const hasChannels = selectedChannelIds.value.length > 0
  const hasSimplex = simplexFreqs.length > 0
  if (!hasChannels && !hasSimplex) {
    toast.error(t('nets.atLeastOneInfrastructureOrSimplex'))
    return
  }
  if (simplexFreqs.length !== new Set(simplexFreqs).size) {
    toast.error(t('nets.duplicateFrequency'))
    return
  }

  if (!selectedOperator.value || !selectedCallSignId.value) {
    return
  }

  isLoading.value = true
  try {
    const communicationChannels: Array<{ communicationChannelId?: string; isSimplexAdHoc?: boolean; simplexFrequency?: string }> = []

    selectedChannelIds.value.forEach(channelId => {
      communicationChannels.push({ communicationChannelId: channelId })
    })
    simplexFreqs.forEach(freq => {
      communicationChannels.push({
        isSimplexAdHoc: true,
        simplexFrequency: freq
      })
    })

    const baseDate = props.net.scheduledAt
      ? new Date(props.net.scheduledAt)
      : new Date()
    const parts = scheduledTime.value.split(':').map(Number)
    const h = Number.isFinite(parts[0]) ? (parts[0] as number) : 20
    const min = Number.isFinite(parts[1]) ? (parts[1] as number) : 0
    const scheduledAtDate = new Date(baseDate)
    scheduledAtDate.setHours(h, min, 0, 0)

    await api.put(`/net/${props.net.id}`, {
      name: name.value.trim(),
      operatorId: selectedOperator.value.id,
      branchCallSignId: selectedCallSignId.value,
      communicationChannels,
      scheduledAt: scheduledAtDate.toISOString(),
      estimatedDurationMinutes: estimatedDurationMinutes.value ?? 30,
      certificateTemplateId:
        selectedCertificateTemplateId.value === NO_TEMPLATE_VALUE
          ? null
          : selectedCertificateTemplateId.value,
    })

    toast.success(t('netDetail.netUpdated'))
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
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('netDetail.editNet') }}</SheetTitle>
        <SheetDescription>{{ t('netDetail.editNetDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 px-1">
        <div class="space-y-2">
          <Label for="branch">{{ t('nets.branch') }}</Label>
          <Input
            id="branch"
            v-model="branchDisplayName"
            type="text"
            readonly
            disabled
            class="bg-muted cursor-not-allowed"
          />
          <p class="text-xs text-muted-foreground">{{ t('nets.branchCannotBeChanged') }}</p>
        </div>

        <div class="space-y-2">
          <Label for="callSign">{{ t('nets.branchCallSign') }}</Label>
          <Select v-model="selectedCallSignId" :disabled="!branch || isLoadingCallSigns">
            <SelectTrigger id="callSign" class="w-full">
              <SelectValue :placeholder="t('nets.selectCallSign')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="cs in branchCallSigns" :key="cs.id" :value="cs.id">
                {{ cs.callSign }} {{ cs.isDefault ? `(${t('branches.defaultCallSign')})` : '' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="certificateTemplates.length > 0" class="space-y-2">
          <Label for="certificateTemplate">{{ t('certificates.template') }}</Label>
          <Select v-model="selectedCertificateTemplateId" :disabled="!branch || isLoadingCertificateTemplates">
            <SelectTrigger id="certificateTemplate" class="w-full">
              <SelectValue :placeholder="t('certificates.noTemplate')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NO_TEMPLATE_VALUE">{{ t('certificates.noTemplate') }}</SelectItem>
              <SelectItem v-for="tpl in certificateTemplates" :key="tpl.id" :value="tpl.id">
                {{ tpl.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="name">{{ t('nets.netName') }}</Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('nets.netNamePlaceholder')"
            :class="shouldShowError('name', isSubmitted) ? 'border-destructive' : ''"
          />
          <p v-if="shouldShowError('name', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('name') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="scheduledTime">{{ t('nets.scheduledTime') }}</Label>
            <Input id="scheduledTime" v-model="scheduledTime" type="time" class="w-full" />
          </div>
          <div class="space-y-2">
            <Label for="estimatedDuration">{{ t('nets.estimatedDuration') }}</Label>
            <div class="flex items-center gap-2">
              <Input id="estimatedDuration" v-model.number="estimatedDurationMinutes" type="number" min="1" max="480" class="w-full" />
              <span class="text-sm text-muted-foreground shrink-0">{{ t('nets.minutes') }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="operator">{{ t('nets.operator') }}</Label>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="operator"
              v-model="operatorSearch"
              type="text"
              :placeholder="t('nets.searchOperatorPlaceholder')"
              class="pl-9 pr-9"
              :class="shouldShowError('operator', isSubmitted) ? 'border-destructive' : ''"
              @focus="showOperatorDropdown = operatorSearch.length >= 2"
            />
            <button
              v-if="operatorSearch"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :aria-label="t('common.clear')"
              @click="clearOperator"
            >
              <X class="h-4 w-4" />
            </button>
            
            <div
              v-if="showOperatorDropdown && (operatorSuggestions.length > 0 || isSearchingOperators)"
              class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              <div v-if="isSearchingOperators" class="p-3 text-center text-sm text-muted-foreground">
                {{ t('common.loading') }}
              </div>
              <template v-else>
                <button
                  v-for="op in operatorSuggestions"
                  :key="op.id"
                  type="button"
                  @click="selectOperator(op)"
                  class="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium">{{ op.callSign }}</div>
                    <div v-if="op.user?.fullName || op.fullName" class="text-sm text-muted-foreground truncate">
                      {{ op.user?.fullName || op.fullName }}
                    </div>
                  </div>
                  <Check v-if="selectedOperator?.id === op.id" class="h-4 w-4 text-primary flex-shrink-0" />
                </button>
                <div v-if="operatorSuggestions.length === 0" class="p-3 text-center text-sm text-muted-foreground">
                  {{ t('operators.noResults') }}
                </div>
              </template>
            </div>
          </div>
          <p v-if="shouldShowError('operator', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('operator') }}
          </p>
          <p v-else-if="operatorSearch && operatorSearch.length < 2" class="text-xs text-muted-foreground">
            {{ t('nets.minSearchChars') }}
          </p>
        </div>

        <Separator />

        <div class="space-y-3">
          <Label class="text-sm font-medium text-muted-foreground">{{ t('nets.communicationChannelSection') }}</Label>
          <div v-if="isLoadingChannels" class="text-sm text-muted-foreground py-2">
            {{ t('common.loading') }}
          </div>
          <template v-else>
            <p v-if="channels.length === 0 && branch" class="text-sm text-muted-foreground py-1 -mx-2">
              {{ t('nets.noInfrastructureAvailable') }}
            </p>
            <div v-else-if="channels.length > 0" class="space-y-2">
              <label
                v-for="ch in channels"
                :key="ch.id"
                class="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 -my-1.5"
              >
                <input
                  type="checkbox"
                  :checked="selectedChannelIds.includes(ch.id)"
                  class="h-4 w-4 shrink-0 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @change="toggleChannel(ch.id, $event)"
                />
                <span class="font-medium text-sm">{{ formatCommunicationChannelLabel({ communicationChannel: ch }) }}</span>
                <span class="text-xs text-muted-foreground ml-auto">{{ t(`communicationChannels.types.${ch.type}`) }}</span>
              </label>
            </div>
            <div class="space-y-2">
              <div
                v-for="(row, i) in simplexRows"
                :key="i"
                :ref="(el) => setSimplexRowRef(i, el)"
                class="flex items-center gap-2 hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1"
              >
                <input
                  type="checkbox"
                  :checked="row.checked"
                  class="h-4 w-4 shrink-0 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @change="(e: Event) => setSimplexRowChecked(i, (e.target as HTMLInputElement).checked)"
                />
                <div class="relative z-[1] flex-1 min-w-0 min-w-[6rem] cursor-text">
                  <input
                    type="text"
                    :value="row.value"
                    class="border-input h-8 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pr-8 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    :class="{ 'border-destructive': row.checked && !row.value.trim() }"
                    @input="(e: Event) => setSimplexRowValue(i, (e.target as HTMLInputElement).value)"
                    @focus="setSimplexRowChecked(i, true)"
                    @blur="handleSimplexBlur(i)"
                  />
                  <button
                    v-if="row.value"
                    type="button"
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :aria-label="t('common.clear')"
                    @click.stop="clearSimplexRow(i)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
                <span class="text-xs text-muted-foreground ml-auto shrink-0">{{ t('nets.simplexLabel') }}</span>
              </div>
            </div>
          </template>
          <p v-if="shouldShowError('channels', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('channels') }}
          </p>
        </div>

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" class="trac-sheet-btn" :disabled="isLoading">
            <Check class="h-4 w-4 mr-2" />
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
