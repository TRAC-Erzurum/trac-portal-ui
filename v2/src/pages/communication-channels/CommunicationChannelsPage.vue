<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, TowerControl } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { InfrastructureCard, InfrastructureCardSkeleton, SearchInput } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'

type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs' | 'hf'

interface Branch {
  id: string
  name: string
  city?: string
}

interface Infrastructure {
  id: string
  branchId: string
  branch?: Branch
  type: InfrastructureType
  name: string
  description?: string
  isActive: boolean
  location?: string
  district?: string
  latitude?: number
  longitude?: number
  altitude?: number
  coverage?: string
  rxFrequency?: number
  txFrequency?: number
  offset?: string
  txCtcssTone?: number
  rxCtcssTone?: number
  txDcsCode?: string
  txDcsPolarity?: string
  rxDcsCode?: string
  rxDcsPolarity?: string
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number
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

interface InfrastructureResponse {
  data: Infrastructure[]
  total: number
}

const { t, locale } = useI18n()
const searchQuery = ref('')
const typeFilter = ref<string>('all')
const cityFilter = ref<string>('all')
const districtFilter = ref<string>('all')
const infrastructure = ref<Infrastructure[]>([])
const allInfrastructure = ref<Infrastructure[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const showTutorialDialog = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const tutorialContent = ref({ title: '', content: '' })
const isLoadingTutorial = ref(false)
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

const typeOptions = computed(() => [
  { value: 'all', label: t('communicationChannels.filterAllTypes') },
  { value: 'vhf_uhf_repeater', label: t('communicationChannels.types.vhf_uhf_repeater') },
  { value: 'echolink', label: t('communicationChannels.types.echolink') },
  { value: 'aprs', label: t('communicationChannels.types.aprs') },
  { value: 'hf', label: t('communicationChannels.types.hf') },
])

const cityOptions = computed(() => {
  const cities = new Set(['all'])
  allInfrastructure.value.forEach(i => {
    if (i.branch?.city) cities.add(i.branch.city)
  })
  return Array.from(cities).map(c => ({
    value: c,
    label: c === 'all' ? t('communicationChannels.filterAllCities') : c
  }))
})

const districtOptions = computed(() => {
  const districts = new Set(['all'])
  allInfrastructure.value.forEach(i => {
    if (i.district) districts.add(i.district)
  })
  return Array.from(districts).map(d => ({
    value: d,
    label: d === 'all' ? t('communicationChannels.filterAllDistricts') : d
  }))
})

const filteredInfrastructure = computed(() => {
  return infrastructure.value.filter(i => {
    if (cityFilter.value !== 'all' && i.branch?.city !== cityFilter.value) return false
    if (districtFilter.value !== 'all' && i.district !== districtFilter.value) return false
    return true
  })
})

async function fetchInfrastructure(append = false) {
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const params = new URLSearchParams()
    params.set('pageNumber', String(page.value))
    params.set('pageSize', String(pageSize))
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
    if (typeFilter.value && typeFilter.value !== 'all') params.set('type', typeFilter.value)
    
    const response = await api.get<InfrastructureResponse>(`/communication-channel?${params.toString()}`)
    
    if (append) {
      infrastructure.value = [...infrastructure.value, ...response.data]
      allInfrastructure.value = [...allInfrastructure.value, ...response.data]
    } else {
      infrastructure.value = response.data
      allInfrastructure.value = response.data
    }
    
    total.value = response.total
    hasMore.value = infrastructure.value.length < response.total
  } catch {
    infrastructure.value = []
    allInfrastructure.value = []
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  page.value++
  fetchInfrastructure(true)
}

const handleFilterChange = () => {
  page.value = 1
  fetchInfrastructure()
}

const handleSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    page.value = 1
    fetchInfrastructure()
  }, 300)
}

usePersistedFilters('communicationChannels', { searchQuery, typeFilter, cityFilter, districtFilter })

watch(searchQuery, handleSearch)
watch(typeFilter, handleFilterChange)

watch([cityFilter, districtFilter], () => {
})

function openTutorial(type: InfrastructureType) {
  isLoadingTutorial.value = true
  showTutorialDialog.value = true
  api.get<{ title: string; content: string }>(`/communication-channel/tutorials/${type}`)
    .then((data) => {
      tutorialContent.value = data
    })
    .catch(() => {
      showTutorialDialog.value = false
    })
    .finally(() => {
      isLoadingTutorial.value = false
    })
}

const renderMarkdown = (content: string) => {
  if (!content) return ''
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 leading-relaxed">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, ' ')
}

fetchInfrastructure()
</script>

<template>
  <AppLayout :title="t('nav.communicationChannels').toLocaleUpperCase(locale)">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:gap-4 gap-2 mb-4">
        <div class="w-full lg:w-1/2 lg:min-w-0 flex flex-col gap-2">
          <SearchInput
            v-model="searchQuery"
            :placeholder="t('communicationChannels.searchPlaceholder')"
          />
          <div class="flex flex-wrap items-center gap-2">
            <Select v-model="typeFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in typeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="cityFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in cityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="districtFilter">
              <SelectTrigger class="w-full sm:w-auto flex-1 min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in districtOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="w-full lg:w-1/2 flex flex-wrap items-center justify-end gap-2 lg:pt-0">
        </div>
      </div>

      <Separator />

      <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <InfrastructureCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="filteredInfrastructure.length === 0" class="py-4 text-center">
        <TowerControl class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p class="text-sm text-muted-foreground">{{ t('communicationChannels.noInfrastructure') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <InfrastructureCard
          v-for="infra in filteredInfrastructure"
          :key="infra.id"
          :id="infra.id"
          :name="infra.name"
          :type="infra.type"
          :is-active="infra.isActive"
          :branch-name="infra.branch?.name"
          :description="infra.description"
          :location="infra.location"
          :district="infra.district"
          :latitude="infra.latitude"
            :longitude="infra.longitude"
            :altitude="infra.altitude"
            :coverage="infra.coverage"
            :rx-frequency="infra.rxFrequency"
            :tx-frequency="infra.txFrequency"
            :offset="infra.offset"
            :tx-ctcss-tone="infra.txCtcssTone"
            :rx-ctcss-tone="infra.rxCtcssTone"
            :tx-dcs-code="infra.txDcsCode"
            :rx-dcs-code="infra.rxDcsCode"
            :echolink-node="infra.echolinkNode"
            :echolink-name="infra.echolinkName"
            :aprs-frequency="infra.aprsFrequency"
            :aprs-is-igate="infra.aprsIsIgate"
            :aprs-is-digipeater="infra.aprsIsDigipeater"
            :aprs-igate-mode="infra.aprsIgateMode"
            :aprs-digipeater-type="infra.aprsDigipeaterType"
            :aprs-path="infra.aprsPath"
            :aprs-server="infra.aprsServer"
            :digipeater="infra.digipeater"
          :hf-frequency-range="infra.hfFrequencyRange"
          :hf-mode="infra.hfMode"
        >
          <template v-if="infra.isActive" #top-right>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 rounded-full"
              :title="t('communicationChannels.howToConnect')"
              @click.stop="openTutorial(infra.type)"
            >
              <BookOpen class="h-3.5 w-3.5" />
            </Button>
          </template>
        </InfrastructureCard>
      </div>

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || filteredInfrastructure.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ filteredInfrastructure.length }}/{{ total }} {{ t('communicationChannels.nameEntity') }}
        </p>
        <div v-if="hasMore && !isLoading && cityFilter === 'all' && districtFilter === 'all'" class="order-1 lg:order-2 w-full lg:w-auto">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? t('common.loading') : t('communicationChannels.loadMore') }}
          </Button>
        </div>
      </div>
    </div>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ tutorialContent.title || t('communicationChannels.tutorial') }}
          </DialogTitle>
        </DialogHeader>
        <div v-if="isLoadingTutorial" class="py-8 text-center">
          <p class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
        </div>
        <div v-else class="tutorial-content text-sm" v-html="renderMarkdown(tutorialContent.content)" />
        <DialogFooter>
          <Button variant="outline" @click="showTutorialDialog = false">
            {{ t('common.close') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
