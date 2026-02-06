<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BookOpen, Search, TowerControl } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { InfrastructureCard, InfrastructureCardSkeleton } from '@/components/shared'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

const { t } = useI18n()
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
const tutorialContent = ref({ title: '', content: '' })
const isLoadingTutorial = ref(false)
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

const typeOptions = computed(() => [
  { value: 'all', label: t('infrastructure.filterAllTypes') },
  { value: 'vhf_uhf_repeater', label: t('infrastructure.types.vhf_uhf_repeater') },
  { value: 'echolink', label: t('infrastructure.types.echolink') },
  { value: 'aprs', label: t('infrastructure.types.aprs') },
  { value: 'hf', label: t('infrastructure.types.hf') },
])

const cityOptions = computed(() => {
  const cities = new Set(['all'])
  allInfrastructure.value.forEach(i => {
    if (i.branch?.city) cities.add(i.branch.city)
  })
  return Array.from(cities).map(c => ({
    value: c,
    label: c === 'all' ? t('infrastructure.filterAllCities') : c
  }))
})

const districtOptions = computed(() => {
  const districts = new Set(['all'])
  allInfrastructure.value.forEach(i => {
    if (i.district) districts.add(i.district)
  })
  return Array.from(districts).map(d => ({
    value: d,
    label: d === 'all' ? t('infrastructure.filterAllDistricts') : d
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
    
    const response = await api.get<InfrastructureResponse>(`/infrastructure?${params.toString()}`)
    
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

watch([searchQuery, typeFilter], handleFilterChange)

watch([cityFilter, districtFilter], () => {
  // Client-side filtering only
})

function openTutorial(type: InfrastructureType) {
  isLoadingTutorial.value = true
  showTutorialDialog.value = true
  api.get<{ title: string; content: string }>(`/infrastructure/tutorials/${type}`)
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
  <AppLayout :title="t('infrastructure.title')">
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          type="search"
          :placeholder="t('infrastructure.searchPlaceholder')"
          class="pl-9"
        />
      </div>
      <Select v-model="typeFilter">
        <SelectTrigger class="w-full sm:w-48">
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
        <SelectTrigger class="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in cityOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="districtFilter">
        <SelectTrigger class="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in districtOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <InfrastructureCardSkeleton v-for="i in 6" :key="i" />
    </div>

    <div v-else-if="filteredInfrastructure.length === 0" class="py-12 text-center">
      <TowerControl class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <p class="text-sm text-muted-foreground">{{ t('infrastructure.noInfrastructure') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div v-for="infra in filteredInfrastructure" :key="infra.id">
        <p v-if="infra.branch?.name" class="text-xs text-muted-foreground mb-1">
          {{ infra.branch.name }}
        </p>
        <InfrastructureCard
          :id="infra.id"
          :name="infra.name"
          :type="infra.type"
          :is-active="infra.isActive"
          :description="infra.description"
          :location="infra.location"
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
              :title="t('infrastructure.howToConnect')"
              @click.stop="openTutorial(infra.type)"
            >
              <BookOpen class="h-3.5 w-3.5" />
            </Button>
          </template>
        </InfrastructureCard>
      </div>
    </div>

    <div v-if="hasMore && !isLoading && cityFilter === 'all' && districtFilter === 'all'" class="pt-4">
      <Button
        variant="outline"
        class="w-full lg:w-auto lg:px-8"
        :disabled="isLoadingMore"
        @click="loadMore"
      >
        {{ isLoadingMore ? t('common.loading') : t('infrastructure.loadMore') }}
      </Button>
    </div>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ tutorialContent.title || t('infrastructure.tutorial') }}
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
