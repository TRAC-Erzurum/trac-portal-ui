<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Search, X, Check, AlertTriangle, Plus } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { useBranchStore, type Branch } from '@/stores/branch'
import { useAuthStore } from '@/stores/auth'

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

interface Infrastructure {
  id: string
  name: string
  type: string
  isActive: boolean
}

const props = defineProps<{
  open: boolean
  defaultBranchId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()
const branchStore = useBranchStore()
const authStore = useAuthStore()

const name = ref('')
const selectedOperator = ref<Operator | null>(null)
const isLoading = ref(false)

const operatorSearch = ref('')
const operatorSuggestions = ref<Operator[]>([])
const isSearchingOperators = ref(false)
const showOperatorDropdown = ref(false)

const selectedBranchId = ref<string>('')
const availableBranches = ref<Branch[]>([])
const branchCallSigns = ref<BranchCallSign[]>([])
const selectedCallSignId = ref<string>('')
const isLoadingCallSigns = ref(false)

const infrastructures = ref<Infrastructure[]>([])
const selectedInfrastructureIds = ref<string[]>([])
const isLoadingInfrastructure = ref(false)
const simplexFrequencies = ref<string[]>([])

const isValid = computed(() => {
  const hasInfrastructure = selectedInfrastructureIds.value.length > 0
  const hasSimplex = simplexFrequencies.value.some(freq => freq.trim())
  const hasAtLeastOne = hasInfrastructure || hasSimplex
  
  return name.value.trim() && 
         selectedOperator.value && 
         selectedBranchId.value &&
         selectedCallSignId.value &&
         hasAtLeastOne
})

const generateDefaultName = () => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  }
  const dateStr = now.toLocaleDateString('tr-TR', options)
  return `TRAC ${dateStr} Çevrimi`
}

const loadAvailableBranches = async () => {
  try {
    const memberships = await api.get<any[]>('/users/me/branches')
    availableBranches.value = memberships
      .filter(m => m.status === 'approved' && (m.role === 'member' || m.role === 'admin' || m.role === 'president'))
      .map(m => m.branch)
      .filter(Boolean)
  } catch (error) {
    console.error('Failed to load branches:', error)
    availableBranches.value = []
  }
}

const loadBranchCallSigns = async (branchId: string) => {
  if (!branchId) {
    branchCallSigns.value = []
    selectedCallSignId.value = ''
    return
  }
  
  isLoadingCallSigns.value = true
  try {
    const branch = await api.get<Branch>(`/branches/${branchId}`)
    branchCallSigns.value = branch.callSigns || []
    const defaultCallSign = branch.callSigns?.find(cs => cs.isDefault)
    selectedCallSignId.value = defaultCallSign?.id || branch.callSigns?.[0]?.id || ''
  } catch (error) {
    console.error('Failed to load call signs:', error)
    branchCallSigns.value = []
    selectedCallSignId.value = ''
  } finally {
    isLoadingCallSigns.value = false
  }
}

const loadInfrastructure = async (branchId: string) => {
  if (!branchId) {
    infrastructures.value = []
    selectedInfrastructureIds.value = []
    return
  }
  
  isLoadingInfrastructure.value = true
  try {
    const response = await api.get<{ data: Infrastructure[]; total: number }>(`/branches/${branchId}/communication-channel?pageSize=100`)
    infrastructures.value = response.data.filter(infra => infra.isActive)
  } catch (error) {
    console.error('Failed to load infrastructure:', error)
    infrastructures.value = []
  } finally {
    isLoadingInfrastructure.value = false
  }
}

watch(selectedBranchId, async (branchId) => {
  selectedCallSignId.value = ''
  selectedInfrastructureIds.value = []
  simplexFrequencies.value = []
  if (branchId) {
    await Promise.all([
      loadBranchCallSigns(branchId),
      loadInfrastructure(branchId)
    ])
  } else {
    branchCallSigns.value = []
    infrastructures.value = []
  }
})

const getOperatorLabel = (op: Operator) => {
  const displayName = op.user?.fullName || op.fullName
  if (displayName) {
    return `${op.callSign} - ${displayName}`
  }
  return op.callSign
}

const searchOperators = debounce(async (query: string) => {
  if (!query || query.length < 2) {
    operatorSuggestions.value = []
    return
  }
  if (!selectedBranchId.value) {
    operatorSuggestions.value = []
    return
  }
  isSearchingOperators.value = true
  try {
    const response = await api.get<Operator[]>(`/operator/search?q=${encodeURIComponent(query)}&sortBy=managed&branchId=${selectedBranchId.value}`)
    operatorSuggestions.value = response || []
  } catch {
    operatorSuggestions.value = []
  } finally {
    isSearchingOperators.value = false
  }
}, 300)

watch(operatorSearch, (val) => {
  if (val) {
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

const addSimplexFrequency = () => {
  simplexFrequencies.value.push('')
}

const removeSimplexFrequency = (index: number) => {
  simplexFrequencies.value.splice(index, 1)
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    name.value = generateDefaultName()
    selectedOperator.value = null
    operatorSearch.value = ''
    operatorSuggestions.value = []
    
    await loadAvailableBranches()
    
    // Set default branch
    if (props.defaultBranchId) {
      selectedBranchId.value = props.defaultBranchId
    } else if (branchStore.currentBranch) {
      const membership = availableBranches.value.find(b => b.id === branchStore.currentBranch?.id)
      if (membership) {
        selectedBranchId.value = branchStore.currentBranch.id
      } else if (availableBranches.value.length > 0) {
        const firstBranch = availableBranches.value[0]
        if (firstBranch) selectedBranchId.value = firstBranch.id
      }
    } else if (availableBranches.value.length > 0) {
      const firstBranch = availableBranches.value[0]
      if (firstBranch) selectedBranchId.value = firstBranch.id
    }
  }
})

async function handleSubmit() {
  if (!isValid.value || !selectedOperator.value || !selectedBranchId.value || !selectedCallSignId.value) return

  const hasInfrastructure = selectedInfrastructureIds.value.length > 0
  const hasSimplex = simplexFrequencies.value.some(freq => freq.trim())
  if (!hasInfrastructure && !hasSimplex) {
    toast.error(t('nets.atLeastOneInfrastructureOrSimplex'))
    return
  }

  isLoading.value = true
  try {
    const communicationChannels: Array<{ communicationChannelId?: string; isSimplexAdHoc?: boolean; simplexFrequency?: string }> = []
    
    selectedInfrastructureIds.value.forEach(infraId => {
      communicationChannels.push({ communicationChannelId: infraId })
    })
    
    simplexFrequencies.value.forEach(freq => {
      if (freq.trim()) {
        communicationChannels.push({
          isSimplexAdHoc: true,
          simplexFrequency: freq.trim()
        })
      }
    })

    await api.post('/net', {
      name: name.value.trim(),
      operatorId: selectedOperator.value.id,
      branchId: selectedBranchId.value,
      branchCallSignId: selectedCallSignId.value,
      communicationChannels,
    })

    toast.success(t('nets.createSuccess'))
    emit('created')
    emit('update:open', false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    loadAvailableBranches()
  }
})
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('nets.createNet') }}</SheetTitle>
        <SheetDescription>{{ t('nets.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6 py-6 px-1">
        <div class="space-y-2">
          <Label for="branch">{{ t('nets.branch') }}</Label>
          <Select v-model="selectedBranchId" :disabled="isLoadingCallSigns">
            <SelectTrigger id="branch" class="w-full">
              <SelectValue :placeholder="t('nets.selectBranch')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="branch in availableBranches" :key="branch.id" :value="branch.id">
                {{ branch.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
            <AlertTriangle class="h-3 w-3" />
            {{ t('nets.branchCannotBeChanged') }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="callSign">{{ t('nets.branchCallSign') }}</Label>
          <Select v-model="selectedCallSignId" :disabled="!selectedBranchId || isLoadingCallSigns">
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

        <div class="space-y-2">
          <Label for="name">{{ t('nets.netName') }}</Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('nets.netNamePlaceholder')"
          />
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
          <p v-if="operatorSearch && operatorSearch.length < 2" class="text-xs text-muted-foreground">
            {{ t('nets.minSearchChars') }}
          </p>
        </div>

        <Separator />

        <div class="space-y-3">
          <Label>{{ t('nets.infrastructure') }}</Label>
          <div v-if="isLoadingInfrastructure" class="text-sm text-muted-foreground py-2">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="infrastructures.length === 0 && selectedBranchId" class="text-sm text-muted-foreground py-2">
            {{ t('nets.noInfrastructureAvailable') }}
          </div>
          <div v-else-if="infrastructures.length > 0" class="border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            <label
              v-for="infra in infrastructures"
              :key="infra.id"
              class="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 -my-1.5"
            >
              <Checkbox
                :checked="selectedInfrastructureIds.includes(infra.id)"
                @update:checked="(checked: boolean) => {
                  if (checked) {
                    if (!selectedInfrastructureIds.includes(infra.id)) {
                      selectedInfrastructureIds.push(infra.id)
                    }
                  } else {
                    const index = selectedInfrastructureIds.indexOf(infra.id)
                    if (index > -1) {
                      selectedInfrastructureIds.splice(index, 1)
                    }
                  }
                }"
              />
              <span class="font-medium text-sm">{{ infra.name }}</span>
              <span class="text-xs text-muted-foreground ml-auto">{{ t(`communicationChannels.types.${infra.type}`) }}</span>
            </label>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>{{ t('nets.simplexFrequencies') }}</Label>
            <Button @click="addSimplexFrequency" size="sm" variant="outline" type="button">
              <Plus class="h-4 w-4 mr-2" />
              {{ t('common.add') }}
            </Button>
          </div>
          <div v-for="(_, idx) in simplexFrequencies" :key="idx" class="flex gap-2">
            <Input v-model="simplexFrequencies[idx]" :placeholder="t('nets.simplexFrequencyPlaceholder')" />
            <Button @click="removeSimplexFrequency(idx)" size="icon" variant="ghost" type="button">
              <X class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="simplexFrequencies.length === 0" class="text-xs text-muted-foreground">
            {{ t('nets.noSimplexAdded') }}
          </div>
        </div>

        <div v-if="selectedInfrastructureIds.length === 0 && !simplexFrequencies.some(freq => freq.trim())" class="text-xs text-amber-600 dark:text-amber-500">
          {{ t('nets.atLeastOneInfrastructureOrSimplexRequired') }}
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isLoading || !isValid">
            {{ isLoading ? t('common.loading') : t('nets.create') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
