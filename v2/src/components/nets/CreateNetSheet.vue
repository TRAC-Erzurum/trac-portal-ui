<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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
import { api, type ApiError } from '@/lib/api'
import { NET_TYPES, NET_MODES, FREQUENCIES, DEFAULT_FREQUENCY, DEFAULT_MODE, DEFAULT_TYPE } from '@/constants/net'
import { debounce } from '@/lib/utils'

interface Operator {
  id: string
  callSign: string
  fullName?: string
  user?: {
    fullName?: string
    role?: string
  }
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()

const name = ref('')
const selectedOperator = ref<Operator | null>(null)
const type = ref(DEFAULT_TYPE)
const mode = ref(DEFAULT_MODE)
const frequency = ref(DEFAULT_FREQUENCY)
const isLoading = ref(false)

const operatorSearch = ref('')
const operatorSuggestions = ref<Operator[]>([])
const isSearchingOperators = ref(false)
const showOperatorDropdown = ref(false)

const isValid = computed(() => {
  return name.value.trim() && selectedOperator.value && type.value && mode.value && frequency.value
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
  isSearchingOperators.value = true
  try {
    const response = await api.get<Operator[]>(`/operator/search?q=${encodeURIComponent(query)}&sortBy=managed`)
    operatorSuggestions.value = (response || []).filter(op => {
      const role = op.user?.role
      return role && role !== 'guest'
    })
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

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    name.value = generateDefaultName()
    selectedOperator.value = null
    operatorSearch.value = ''
    operatorSuggestions.value = []
    type.value = DEFAULT_TYPE
    mode.value = DEFAULT_MODE
    frequency.value = DEFAULT_FREQUENCY
  }
})

async function handleSubmit() {
  if (!isValid.value || !selectedOperator.value) return

  isLoading.value = true
  try {
    await api.post('/net', {
      name: name.value.trim(),
      operatorId: selectedOperator.value.id,
      type: type.value,
      mode: mode.value,
      frequency: frequency.value,
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
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md px-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{{ t('nets.createNet') }}</SheetTitle>
        <SheetDescription>{{ t('nets.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
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
              v-if="selectedOperator"
              type="button"
              @click="clearOperator"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="type">{{ t('nets.type') }}</Label>
            <Select v-model="type">
              <SelectTrigger id="type" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in NET_TYPES" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="mode">{{ t('nets.mode') }}</Label>
            <Select v-model="mode">
              <SelectTrigger id="mode" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in NET_MODES" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="frequency">{{ t('nets.frequency') }}</Label>
          <Select v-model="frequency">
            <SelectTrigger id="frequency" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="f in FREQUENCIES" :key="f.value" :value="f.value">
                {{ f.label }}
              </SelectItem>
            </SelectContent>
          </Select>
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
