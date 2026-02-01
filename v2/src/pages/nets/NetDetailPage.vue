<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Play, Square, RotateCcw, Users, Radio, Clock, MapPin, X, Search, Plus, Check, AlertCircle, Trash2, Edit2, Settings } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { getFrequencyLabel } from '@/constants/net'
import { debounce } from '@/lib/utils'
import EditAttendeeSheet from '@/components/nets/EditAttendeeSheet.vue'
import EditNetSheet from '@/components/nets/EditNetSheet.vue'

interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  country?: string
  city?: string
  district?: string
  gridSquare?: string
  user?: {
    fullName?: string
  }
}

interface Attendee {
  id: string
  callSign: string
  name?: string
  country?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
  operator?: Operator
  createdAt: string
}

interface Net {
  id: string
  name: string
  frequency: string
  mode: string
  type: string
  startedAt?: string
  endedAt?: string
  attendeeCount: number
  operator: Operator
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const net = ref<Net | null>(null)
const attendees = ref<Attendee[]>([])
const isLoading = ref(true)
const isLoadingAttendees = ref(false)

const searchQuery = ref('')
const suggestions = ref<Operator[]>([])
const isSearching = ref(false)
const selectedIndex = ref(0)
const isSubmitting = ref(false)
const showSuggestions = ref(false)

interface SelectedEntry {
  callSign: string
  name: string
  city: string
  district: string
  operatorId: string | null
  isNew: boolean
  readability: string
  signalStrength: string
}

const selectedEntry = ref<SelectedEntry | null>(null)

const searchContainerRef = ref<HTMLDivElement | null>(null)
const entryPanelRef = ref<HTMLDivElement | null>(null)
const editingAttendee = ref<Attendee | null>(null)
const isEditSheetOpen = ref(false)
const isEditNetSheetOpen = ref(false)
const addOperatorAsAttendee = ref(true)

interface CityData {
  name: string
  districts: { name: string }[]
}
const citiesData = ref<CityData[]>([])
const cities = ref<string[]>([])
const districts = ref<string[]>([])
const isLoadingCities = ref(false)

const canManageNet = computed(() => {
  if (!auth.user || !net.value) return false
  if (auth.isSuperAdmin || auth.isAdmin) return true
  return auth.user.operator?.id === net.value.operator.id
})

const netStatus = computed(() => {
  if (!net.value) return 'pending'
  if (net.value.endedAt) return 'completed'
  if (net.value.startedAt) return 'active'
  return 'pending'
})

const existingCallSigns = computed(() => {
  return attendees.value.map(a => a.callSign.toUpperCase())
})

const enabledSuggestions = computed(() => {
  return suggestions.value.filter(op => {
    const cs = formatOperatorCallSign(op).toUpperCase()
    return !existingCallSigns.value.includes(cs)
  })
})

const disabledSuggestions = computed(() => {
  return suggestions.value.filter(op => {
    const cs = formatOperatorCallSign(op).toUpperCase()
    return existingCallSigns.value.includes(cs)
  })
})

const hasExactMatch = computed(() => {
  if (!searchQuery.value) return false
  const query = searchQuery.value.toUpperCase()
  return suggestions.value.some(op => op.callSign.toUpperCase() === query)
})

const isNewCallSignExists = computed(() => {
  if (!searchQuery.value) return false
  return existingCallSigns.value.includes(searchQuery.value.toUpperCase())
})

const canAddNew = computed(() => {
  return searchQuery.value.length >= 2 && !hasExactMatch.value && !isNewCallSignExists.value
})

const formatOperatorCallSign = (op: Operator) => {
  return [op.prefix, op.callSign, op.suffix].filter(Boolean).join('/')
}

const formatDuration = (net: Net) => {
  if (!net.startedAt) return null
  const start = new Date(net.startedAt)
  const end = net.endedAt ? new Date(net.endedAt) : new Date()
  const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60)
  if (diff < 60) return `${diff} ${t('nets.minutes')}`
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  return `${hours} ${t('nets.hours')} ${mins} ${t('nets.minutes')}`
}

const fetchNet = async () => {
  try {
    net.value = await api.get<Net>(`/net/${route.params.id}`)
  } catch (error) {
    console.error('Failed to fetch net:', error)
    toast.error(t('error.serverError'))
    router.push('/nets')
  } finally {
    isLoading.value = false
  }
}

const fetchAttendees = async () => {
  isLoadingAttendees.value = true
  try {
    const data = await api.get<Attendee[]>(`/net/${route.params.id}/attendee?sort=DESC`)
    attendees.value = data
  } catch (error) {
    console.error('Failed to fetch attendees:', error)
  } finally {
    isLoadingAttendees.value = false
  }
}

let searchCounter = 0

const searchOperators = debounce(async (query: string) => {
  if (!query || query.length < 2) {
    suggestions.value = []
    isSearching.value = false
    return
  }
  
  const currentSearch = ++searchCounter
  isSearching.value = true
  
  try {
    const results = await api.get<Operator[]>(`/operator/search?q=${encodeURIComponent(query)}`)
    if (currentSearch === searchCounter) {
      suggestions.value = results
      selectedIndex.value = 0
    }
  } catch (error) {
    console.error('Search failed:', error)
    if (currentSearch === searchCounter) {
      suggestions.value = []
    }
  } finally {
    if (currentSearch === searchCounter) {
      isSearching.value = false
    }
  }
}, 300)

const fetchCities = async () => {
  if (citiesData.value.length > 0) return
  isLoadingCities.value = true
  try {
    const data = await api.get<CityData[]>('/qth/countries/Türkiye/cities')
    citiesData.value = data
    cities.value = data.map(c => c.name).sort((a, b) => a.localeCompare(b, 'tr'))
  } catch (error) {
    console.error('Failed to fetch cities:', error)
  } finally {
    isLoadingCities.value = false
  }
}

const fetchDistricts = (city: string) => {
  if (!city) {
    districts.value = []
    return
  }
  const cityData = citiesData.value.find(c => c.name === city)
  if (cityData) {
    districts.value = cityData.districts.map(d => d.name).sort((a, b) => a.localeCompare(b, 'tr'))
  } else {
    districts.value = []
  }
}

watch(searchQuery, (val) => {
  if (val.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    isSearching.value = false
  } else if (!selectedEntry.value) {
    showSuggestions.value = true
    searchOperators(val)
  }
  selectedIndex.value = 0
})

let skipDistrictReset = false

watch(() => selectedEntry.value?.city, (city, oldCity) => {
  if (!selectedEntry.value) return
  if (skipDistrictReset) {
    skipDistrictReset = false
    if (city) fetchDistricts(city)
    return
  }
  if (city !== oldCity) {
    selectedEntry.value.district = ''
    if (city) fetchDistricts(city)
  }
})

const lastSearchQuery = ref('')

const selectOperatorFromSuggestion = async (op: Operator) => {
  showSuggestions.value = false
  lastSearchQuery.value = searchQuery.value
  searchQuery.value = ''
  
  await fetchCities()
  if (op.city) {
    skipDistrictReset = true
    fetchDistricts(op.city)
  }
  
  selectedEntry.value = {
    callSign: formatOperatorCallSign(op),
    name: op.user?.fullName || op.fullName || '',
    city: op.city || '',
    district: op.district || '',
    operatorId: op.id,
    isNew: false,
    readability: '5',
    signalStrength: '9'
  }
  
  nextTick(() => {
    const citySelect = entryPanelRef.value?.querySelector('[data-city-select] button')
    if (citySelect instanceof HTMLElement) {
      citySelect.focus()
    }
  })
}

const createNewEntry = async () => {
  showSuggestions.value = false
  lastSearchQuery.value = searchQuery.value
  const callSign = searchQuery.value.toUpperCase()
  searchQuery.value = ''
  
  await fetchCities()
  
  selectedEntry.value = {
    callSign,
    name: '',
    city: '',
    district: '',
    operatorId: null,
    isNew: true,
    readability: '5',
    signalStrength: '9'
  }
  
  nextTick(() => {
    const nameInput = entryPanelRef.value?.querySelector('[data-name-input] input')
    if (nameInput instanceof HTMLElement) {
      nameInput.focus()
    }
  })
}

const focusSearchInput = () => {
  setTimeout(() => {
    const input = searchContainerRef.value?.querySelector('input')
    input?.focus()
  }, 50)
}

const clearEntry = () => {
  selectedEntry.value = null
  districts.value = []
  searchQuery.value = lastSearchQuery.value
  showSuggestions.value = lastSearchQuery.value.length >= 2
  focusSearchInput()
}

const handleSearchKeyDown = (e: KeyboardEvent) => {
  if (selectedEntry.value) return
  
  if (!showSuggestions.value && searchQuery.value.length >= 2) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      showSuggestions.value = true
      return
    }
  }
  
  if (!showSuggestions.value) return
  
  const enabled = enabledSuggestions.value
  const totalItems = enabled.length + (canAddNew.value ? 1 : 0)
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (totalItems > 0) {
        selectedIndex.value = (selectedIndex.value + 1) % totalItems
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (totalItems > 0) {
        selectedIndex.value = selectedIndex.value <= 0 ? totalItems - 1 : selectedIndex.value - 1
      }
      break
    case 'Enter':
      e.preventDefault()
      const selectedOp = enabled[selectedIndex.value]
      if (selectedIndex.value < enabled.length && selectedOp) {
        selectOperatorFromSuggestion(selectedOp)
      } else if (canAddNew.value && selectedIndex.value === enabled.length) {
        createNewEntry()
      }
      break
    case 'Escape':
      e.preventDefault()
      searchQuery.value = ''
      suggestions.value = []
      showSuggestions.value = false
      break
  }
}

const handleEntryKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submitEntry()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    clearEntry()
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (!searchContainerRef.value) return
  if (!searchContainerRef.value.contains(e.target as Node)) {
    showSuggestions.value = false
  }
}

const submitEntry = async () => {
  if (isSubmitting.value || !selectedEntry.value) return
  isSubmitting.value = true
  
  const entry = selectedEntry.value
  
  try {
    await api.post(`/net/${route.params.id}/attendee`, {
      callSign: entry.callSign.toUpperCase(),
      name: entry.name || null,
      country: 'Türkiye',
      city: entry.city || null,
      district: entry.district || null,
      readability: parseInt(entry.readability),
      signalStrength: parseInt(entry.signalStrength),
      operatorId: entry.operatorId
    })
    
    selectedEntry.value = null
    districts.value = []
    searchQuery.value = ''
    lastSearchQuery.value = ''
    suggestions.value = []
    showSuggestions.value = false
    
    await fetchAttendees()
    if (net.value) net.value.attendeeCount = attendees.value.length
    
    focusSearchInput()
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      toast.error(t('netDetail.attendeeExists'))
    } else {
      toast.error(t('error.serverError'))
    }
  } finally {
    isSubmitting.value = false
  }
}

const startNet = async () => {
  try {
    await api.patch(`/net/${route.params.id}/start`, { 
      addOperatorAsAttendee: addOperatorAsAttendee.value 
    })
    await fetchNet()
    await fetchAttendees()
    toast.success(t('netDetail.netStarted'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const endNet = async () => {
  try {
    await api.patch(`/net/${route.params.id}/end`, {})
    await fetchNet()
    toast.success(t('netDetail.netEnded'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const restartNet = async () => {
  if (!auth.isAdmin && !auth.isSuperAdmin) return
  try {
    await api.patch(`/net/${route.params.id}/restart`, {})
    await fetchNet()
    toast.success(t('netDetail.netRestarted'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const openEditNet = () => {
  isEditNetSheetOpen.value = true
}

const handleNetUpdated = async () => {
  await fetchNet()
  isEditNetSheetOpen.value = false
}

const openEditAttendee = (attendee: Attendee) => {
  editingAttendee.value = attendee
  isEditSheetOpen.value = true
}

const handleAttendeeUpdated = async () => {
  await fetchAttendees()
  isEditSheetOpen.value = false
  editingAttendee.value = null
}

const deleteAttendee = async (attendee: Attendee) => {
  if (!confirm(t('netDetail.confirmDelete', { callSign: attendee.callSign }))) return
  
  try {
    await api.delete(`/net/${route.params.id}/attendee/${attendee.id}`)
    await fetchAttendees()
    if (net.value) net.value.attendeeCount = attendees.value.length
    toast.success(t('netDetail.attendeeDeleted'))
  } catch (error) {
    toast.error(t('error.serverError'))
  }
}

const getAttendeeNumber = (index: number) => {
  return attendees.value.length - index
}

onMounted(() => {
  fetchNet()
  fetchAttendees()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <AppLayout :title="t('nav.nets')" :breadcrumb-label="net?.name || '...'">
    <div v-if="isLoading" class="space-y-6">
      <div class="h-32 bg-muted/30 rounded-lg animate-pulse" />
      <div class="h-64 bg-muted/30 rounded-lg animate-pulse" />
    </div>

    <div v-else-if="net" class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-start gap-4">
        <div class="flex-1 space-y-2">
          <div class="flex items-center gap-3">
            <span v-if="netStatus === 'active'" class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span v-else-if="netStatus === 'pending'" class="relative flex h-3 w-3">
              <span class="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span v-else class="relative flex h-3 w-3">
              <span class="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
            </span>
            <h1 class="text-2xl font-bold">{{ net.name }}</h1>
          </div>

          <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div class="flex items-center gap-1.5">
              <Radio class="h-4 w-4" />
              <span>{{ net.operator.callSign }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span>{{ getFrequencyLabel(net.frequency) }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span>{{ net.mode.toUpperCase() }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Users class="h-4 w-4" />
              <span>{{ net.attendeeCount }} {{ t('nets.attendees') }}</span>
            </div>
            <div v-if="net.startedAt" class="flex items-center gap-1.5">
              <Clock class="h-4 w-4" />
              <span>{{ formatDuration(net) }}</span>
            </div>
          </div>
        </div>

        <div v-if="canManageNet" class="flex flex-col items-end gap-3">
          <div v-if="netStatus === 'pending'" class="flex items-center gap-2">
            <input 
              id="addOperatorAsAttendee" 
              type="checkbox"
              v-model="addOperatorAsAttendee"
              class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
            />
            <label for="addOperatorAsAttendee" class="text-sm cursor-pointer">
              {{ t('netDetail.addOperatorAsAttendee') }}
            </label>
          </div>
          
          <div class="flex items-center gap-2">
            <Button
              v-if="netStatus === 'pending'"
              variant="outline"
              @click="openEditNet"
              class="gap-2"
            >
              <Settings class="h-4 w-4" />
              {{ t('common.edit') }}
            </Button>
            
            <Button
              v-if="netStatus === 'pending'"
              variant="outline"
              @click="startNet"
              class="gap-2"
            >
              <Play class="h-4 w-4" fill="currentColor" />
              {{ t('netDetail.start') }}
            </Button>
            
            <Button
              v-else-if="netStatus === 'active'"
              variant="outline"
              @click="endNet"
              class="gap-2"
            >
              <Square class="h-4 w-4" fill="currentColor" />
              {{ t('netDetail.end') }}
            </Button>
            
            <Button
              v-if="netStatus === 'completed' && (auth.isAdmin || auth.isSuperAdmin)"
              variant="outline"
              @click="restartNet"
              class="gap-2"
            >
              <RotateCcw class="h-4 w-4" />
              {{ t('netDetail.restart') }}
            </Button>
          </div>
        </div>
      </div>

      <div class="border-t border-border/50 pt-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <Users class="h-5 w-5" />
            {{ t('netDetail.attendees') }}
            <span class="text-muted-foreground font-normal">({{ attendees.length }})</span>
          </h2>
        </div>

        <div
          v-if="canManageNet && netStatus === 'active'"
          class="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5"
        >
          <div v-if="!selectedEntry" class="space-y-3">
            <div ref="searchContainerRef" class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                ref="searchInputRef"
                v-model="searchQuery"
                :placeholder="t('netDetail.searchOperator')"
                class="pl-9"
                @keydown="handleSearchKeyDown"
                @focus="showSuggestions = searchQuery.length >= 2 && !selectedEntry"
              />
              
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
                        {{ op.user?.fullName || op.fullName || '-' }}
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
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  :class="selectedEntry.isNew ? 'bg-green-500/20 text-green-600' : 'bg-primary/20 text-primary'"
                >
                  {{ selectedEntry.callSign.slice(0, 2) }}
                </div>
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
              <Button variant="ghost" size="icon" class="h-8 w-8" @click="clearEntry" :title="'ESC'">
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
                <Input
                  v-model="selectedEntry.name"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div data-city-select>
                <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.city') }}</label>
                <Select v-model="selectedEntry.city" :disabled="isLoadingCities">
                  <SelectTrigger class="w-full">
                    <SelectValue :placeholder="isLoadingCities ? t('common.loading') : t('form.cityPlaceholder')">
                      {{ selectedEntry.city || (isLoadingCities ? t('common.loading') : t('form.cityPlaceholder')) }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="city in cities" :key="city" :value="city">
                      {{ city }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label class="text-xs font-medium text-muted-foreground mb-1 block">{{ t('form.district') }}</label>
                <Select v-model="selectedEntry.district" :disabled="!selectedEntry.city">
                  <SelectTrigger class="w-full">
                    <SelectValue :placeholder="selectedEntry.city ? t('form.districtPlaceholder') : '-'">
                      {{ selectedEntry.district || (selectedEntry.city ? t('form.districtPlaceholder') : '-') }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="district in districts" :key="district" :value="district">
                      {{ district }}
                    </SelectItem>
                  </SelectContent>
                </Select>
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

        <div
          v-else-if="netStatus === 'pending'"
          class="mb-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-center"
        >
          <AlertCircle class="h-5 w-5 text-yellow-500 mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('netDetail.startToAdd') }}</p>
        </div>

        <div
          v-else-if="netStatus === 'completed'"
          class="mb-6 p-4 rounded-lg border border-border/50 bg-muted/20 text-center"
        >
          <Check class="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">{{ t('netDetail.netCompleted') }}</p>
        </div>

        <div v-if="isLoadingAttendees" class="space-y-2">
          <div v-for="i in 5" :key="i" class="h-16 bg-muted/30 rounded-lg animate-pulse" />
        </div>

        <div v-else-if="attendees.length === 0" class="text-center py-12 text-muted-foreground">
          <Users class="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>{{ t('netDetail.noAttendees') }}</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="(attendee, index) in attendees"
            :key="attendee.id"
            class="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
          >
            <div class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-300 flex-shrink-0">
              {{ getAttendeeNumber(index) }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span class="font-semibold">{{ attendee.callSign }}</span>
                <span v-if="attendee.name" class="text-sm text-muted-foreground">{{ attendee.name }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
                <span v-if="attendee.city || attendee.district" class="flex items-center gap-1">
                  <MapPin class="h-3 w-3 flex-shrink-0" />
                  {{ [attendee.city, attendee.district].filter(Boolean).join(', ') }}
                </span>
                <span>
                  {{ t('operators.readability') }}: {{ attendee.readability }}, 
                  {{ t('operators.signal') }}: {{ attendee.signalStrength }}
                </span>
              </div>
            </div>

            <div v-if="canManageNet && netStatus === 'active'" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="openEditAttendee(attendee)"
              >
                <Edit2 class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 text-destructive hover:text-destructive"
                @click="deleteAttendee(attendee)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EditAttendeeSheet
      v-if="editingAttendee"
      :open="isEditSheetOpen"
      :attendee="editingAttendee"
      :net-id="(route.params.id as string)"
      @update:open="isEditSheetOpen = $event"
      @updated="handleAttendeeUpdated"
    />

    <EditNetSheet
      v-if="net"
      :open="isEditNetSheetOpen"
      :net="net"
      @update:open="isEditNetSheetOpen = $event"
      @updated="handleNetUpdated"
    />
  </AppLayout>
</template>
