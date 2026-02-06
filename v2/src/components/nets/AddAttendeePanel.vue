<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Plus, Search, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AutocompleteCombobox } from '@/components/shared'
import { UserAvatar } from '@/components/ui/user-avatar'
import { api } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { useQthData } from '@/composables/useQthData'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  country?: string
  city?: string
  district?: string
  user?: {
    fullName?: string
    picture?: string | null
  }
}

interface Attendee {
  id: string
  callSign: string
}

interface SelectedEntry {
  callSign: string
  name: string
  city: string
  district: string
  operatorId: string | null
  isNew: boolean
  readability: string
  signalStrength: string
  picture?: string | null
}

interface Props {
  netId: string
  attendees: Attendee[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  attendeeAdded: []
}>()

const { t } = useI18n()
const { cities, getDistricts, isLoading: isLoadingCities, loadCities } = useQthData()

const searchQuery = ref('')
const suggestions = ref<Operator[]>([])
const isSearching = ref(false)
const selectedIndex = ref(0)
const isSubmitting = ref(false)
const showSuggestions = ref(false)
const selectedEntry = ref<SelectedEntry | null>(null)

const searchContainerRef = ref<HTMLDivElement | null>(null)
const entryPanelRef = ref<HTMLDivElement | null>(null)

const districts = computed(() => {
  if (!selectedEntry.value?.city) return []
  return getDistricts(selectedEntry.value.city)
})

const existingCallSigns = computed(() => 
  new Set(props.attendees.map(a => (a.callSign || '').trim().toUpperCase()))
)

const enabledSuggestions = computed(() =>
  suggestions.value.filter(op => !existingCallSigns.value.has((op.callSign || '').trim().toUpperCase()))
)

const disabledSuggestions = computed(() =>
  suggestions.value.filter(op => existingCallSigns.value.has((op.callSign || '').trim().toUpperCase()))
)

const canAddNew = computed(() => {
  const q = (searchQuery.value || '').trim()
  if (q.length < 2) return false
  const searchUpper = q.toUpperCase()
  const existsInSuggestions = suggestions.value.some(
    op => (op.callSign || '').trim().toUpperCase() === searchUpper
  )
  return !existsInSuggestions
})

const formatOperatorCallSign = (op: Operator) => {
  const parts = [op.prefix, op.callSign, op.suffix].filter(Boolean)
  return parts.join('/')
}

const searchOperators = debounce(async (query: string) => {
  const q = (query || '').trim()
  if (q.length < 2) {
    suggestions.value = []
    return
  }
  
  isSearching.value = true
  try {
    const results = await api.get<Operator[]>(`/operator/search?q=${encodeURIComponent(q)}&sortBy=attended&limit=10`)
    suggestions.value = results
    selectedIndex.value = 0
  } catch (error) {
    suggestions.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

watch(searchQuery, (val) => {
  if (selectedEntry.value) return
  
  if (val.length >= 2) {
    showSuggestions.value = true
    searchOperators(val)
  } else {
    showSuggestions.value = false
    suggestions.value = []
  }
})

watch(() => selectedEntry.value?.city, (newCity) => {
  if (selectedEntry.value && newCity) {
    selectedEntry.value.district = ''
  }
})


const selectOperatorFromSuggestion = (op: Operator) => {
  selectedEntry.value = {
    callSign: (op.callSign || '').trim(),
    name: (op.fullName || op.user?.fullName || '').trim(),
    city: op.city || '',
    district: op.district || '',
    operatorId: op.id,
    isNew: false,
    readability: '5',
    signalStrength: '9',
    picture: op.user?.picture || null
  }
  showSuggestions.value = false
  
  nextTick(() => {
    const citySelect = entryPanelRef.value?.querySelector('[data-city-select] button') as HTMLElement
    citySelect?.focus()
  })
}

const createNewEntry = () => {
  selectedEntry.value = {
    callSign: searchQuery.value.trim().toUpperCase(),
    name: '',
    city: '',
    district: '',
    operatorId: null,
    isNew: true,
    readability: '5',
    signalStrength: '9',
    picture: null
  }
  showSuggestions.value = false
  
  nextTick(() => {
    const nameInput = entryPanelRef.value?.querySelector('[data-name-input] input') as HTMLElement
    nameInput?.focus()
  })
}

const clearEntry = () => {
  selectedEntry.value = null
  focusSearchInput()
}

const focusSearchInput = () => {
  setTimeout(() => {
    const input = searchContainerRef.value?.querySelector('input') as HTMLInputElement
    if (input) {
      input.focus()
    }
  }, 50)
}

const submitEntry = async () => {
  if (!selectedEntry.value || isSubmitting.value) return
  
  isSubmitting.value = true
  try {
    await api.post(`/net/${props.netId}/attendee`, {
      callSign: selectedEntry.value.callSign.trim(),
      name: (selectedEntry.value.name || '').trim() || undefined,
      city: (selectedEntry.value.city || '').trim() || undefined,
      district: (selectedEntry.value.district || '').trim() || undefined,
      readability: parseInt(selectedEntry.value.readability),
      signalStrength: parseInt(selectedEntry.value.signalStrength),
      operatorId: selectedEntry.value.operatorId || undefined
    })
    
    selectedEntry.value = null
    searchQuery.value = ''
    suggestions.value = []
    emit('attendeeAdded')
    focusSearchInput()
  } catch (error) {
    // Error handled by api wrapper
  } finally {
    isSubmitting.value = false
  }
}

const handleSearchKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (searchQuery.value) {
      searchQuery.value = ''
      suggestions.value = []
      showSuggestions.value = false
    }
    return
  }
  
  if (!showSuggestions.value) return
  
  const totalItems = enabledSuggestions.value.length + (canAddNew.value ? 1 : 0)
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = (selectedIndex.value + 1) % totalItems
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = selectedIndex.value === 0 ? totalItems - 1 : selectedIndex.value - 1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (selectedIndex.value < enabledSuggestions.value.length) {
      const selectedOp = enabledSuggestions.value[selectedIndex.value]
      if (selectedOp) {
        selectOperatorFromSuggestion(selectedOp)
      }
    } else if (canAddNew.value) {
      createNewEntry()
    }
  }
}

const handleEntryKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    clearEntry()
  } else if (e.key === 'Enter' && !e.shiftKey) {
    const target = e.target as HTMLElement
    if (target.tagName !== 'BUTTON') {
      e.preventDefault()
      submitEntry()
    }
  }
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (searchContainerRef.value && !searchContainerRef.value.contains(target)) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  loadCities()
  document.addEventListener('click', handleClickOutside)
  focusSearchInput()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
    <div v-if="!selectedEntry" class="space-y-3">
      <div ref="searchContainerRef" class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
        <Input
          v-model="searchQuery"
          :placeholder="t('netDetail.searchOperator')"
          class="pl-9 pr-9"
          @keydown="handleSearchKeyDown"
          @focus="showSuggestions = searchQuery.length >= 2 && !selectedEntry"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring z-10"
          :aria-label="t('common.clear')"
          @click="searchQuery = ''"
        >
          <X class="h-4 w-4" />
        </button>
        <div
          v-if="showSuggestions && searchQuery.length >= 2 && (suggestions.length > 0 || canAddNew || isSearching)"
          class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div v-if="isSearching" class="p-4 text-center text-muted-foreground">
            {{ t('common.loading') }}
          </div>
          
          <template v-else>
            <button
              v-for="(op, index) in enabledSuggestions"
              :key="op.id"
              type="button"
              @click="selectOperatorFromSuggestion(op)"
              class="w-full flex items-center gap-3 p-3 text-left transition-colors"
              :class="{
                'bg-primary/10': selectedIndex === index,
                'hover:bg-muted/50': selectedIndex !== index
              }"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold">{{ formatOperatorCallSign(op) }}</div>
                <div class="text-sm text-muted-foreground truncate">
                  {{ op.fullName || op.user?.fullName || '-' }}
                  <span v-if="op.city"> · {{ op.city }}</span>
                </div>
              </div>
            </button>
            
            <div
              v-for="op in disabledSuggestions"
              :key="`disabled-${op.id}`"
              class="w-full flex items-center gap-3 p-3 text-left opacity-50 cursor-not-allowed"
            >
              <div class="flex-1 min-w-0">
                <div class="font-semibold">{{ formatOperatorCallSign(op) }}</div>
                <div class="text-sm text-muted-foreground">{{ t('netDetail.alreadyAdded') }}</div>
              </div>
              <Check class="h-4 w-4 flex-shrink-0" />
            </div>
            
            <div v-if="enabledSuggestions.length === 0 && disabledSuggestions.length === 0 && !canAddNew" class="p-3 text-center text-muted-foreground">
              {{ t('operators.noResults') }}
            </div>
            
            <button
              v-if="canAddNew"
              type="button"
              @click="createNewEntry"
              class="w-full flex items-center gap-3 p-3 text-left border-t border-border transition-colors"
              :class="{
                'bg-green-500/10': selectedIndex === enabledSuggestions.length,
                'hover:bg-green-500/5': selectedIndex !== enabledSuggestions.length
              }"
            >
              <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Plus class="h-4 w-4 text-green-500" />
              </div>
              <div class="flex-1">
                <div class="font-semibold text-green-500">{{ searchQuery.toUpperCase() }}</div>
                <div class="text-sm text-muted-foreground">{{ t('netDetail.createNew') }}</div>
              </div>
            </button>
          </template>
        </div>
      </div>
    </div>

    <div
      v-else
      ref="entryPanelRef"
      class="space-y-4"
      @keydown="handleEntryKeyDown"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UserAvatar :picture="selectedEntry.picture" class="h-10 w-10" />
          <div>
            <div class="font-semibold">{{ selectedEntry.callSign }}</div>
            <div v-if="!selectedEntry.isNew && selectedEntry.name" class="text-sm text-muted-foreground">
              {{ selectedEntry.name }}
            </div>
            <div v-else-if="selectedEntry.isNew" class="text-xs text-green-600">
              {{ t('netDetail.newOperator') }}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="clearEntry" :title="'ESC'" aria-label="Clear">
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div v-if="selectedEntry.isNew" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.callSign') }}</label>
          <Input
            :model-value="selectedEntry.callSign"
            class="uppercase bg-muted/50"
            readonly
            disabled
          />
        </div>
        <div data-name-input>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.fullName') }}</label>
          <Input v-model="selectedEntry.name" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div data-city-select>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.city') }}</label>
          <AutocompleteCombobox
            id="add-attendee-city"
            :model-value="selectedEntry?.city ?? ''"
            :options="cities"
            :placeholder="isLoadingCities ? t('common.loading') : t('form.cityPlaceholder')"
            :disabled="isLoadingCities"
            @update:model-value="(v) => { if (selectedEntry) selectedEntry.city = v }"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.district') }}</label>
          <AutocompleteCombobox
            id="add-attendee-district"
            :model-value="selectedEntry?.district ?? ''"
            :options="districts"
            :placeholder="selectedEntry?.city ? t('form.districtPlaceholder') : '-'"
            :disabled="!selectedEntry?.city"
            @update:model-value="(v) => { if (selectedEntry) selectedEntry.district = v }"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('operators.readability') }}</label>
          <Select v-model="selectedEntry.readability">
            <SelectTrigger class="w-full">
              <SelectValue>{{ selectedEntry.readability }}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="r in 5" :key="r" :value="String(r)">{{ r }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('operators.signal') }}</label>
          <Select v-model="selectedEntry.signalStrength">
            <SelectTrigger class="w-full">
              <SelectValue>{{ selectedEntry.signalStrength }}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in 9" :key="s" :value="String(s)">{{ s }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <Button
          variant="outline"
          @click="submitEntry"
          :disabled="!selectedEntry.callSign || isSubmitting"
          class="gap-2"
        >
          <Plus class="h-4 w-4" />
          {{ t('netDetail.addAttendee') }}
        </Button>
      </div>
    </div>
  </div>
</template>
