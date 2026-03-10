<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { TowerControl } from 'lucide-vue-next'
import EditCommChannelSheet from '@/components/infrastructure/EditCommChannelSheet.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import PublicPageLayout from '@/components/layout/PublicPageLayout.vue'
import { CommunicationChannelCard, CommunicationChannelCardSkeleton, SearchInput } from '@/components/shared'
import { usePersistedFilters } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatCommunicationChannelLabel } from '@/lib/formatters'
import { buildTutorialContent } from '@/lib/tutorial-content'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { CommunicationChannel, CommunicationChannelListResponse } from '@/types/communication-channel'

interface UserMembership {
  branchId: string
  role: string
  status: string
}

const { t, locale } = useI18n()
const authStore = useAuthStore()
const userMemberships = ref<UserMembership[]>([])
const searchQuery = ref('')
const typeFilter = ref<string>('all')
const cityFilter = ref<string>('all')
const districtFilter = ref<string>('all')
const channels = ref<CommunicationChannel[]>([])
const allChannels = ref<CommunicationChannel[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const showTutorialDialog = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const tutorialContent = ref({ title: '', content: '' })
const tutorialTitle = ref('')
const page = ref(1)
const pageSize = 12
const hasMore = ref(true)

function canManageBranch(branchId: string): boolean {
  if (authStore.isSuperAdmin) return true
  return userMemberships.value.some(
    (m) =>
      m.branchId === branchId &&
      m.status === 'approved' &&
      (m.role === 'admin' || m.role === 'president')
  )
}

async function fetchUserMemberships() {
  if (!authStore.isAuthenticated) return
  try {
    const list = await api.get<UserMembership[]>('/users/me/memberships')
    userMemberships.value = list
  } catch {
    userMemberships.value = []
  }
}

const typeOptions = computed(() => [
  { value: 'all', label: t('communicationChannels.filterAllTypes') },
  { value: 'vhf_uhf_repeater', label: t('communicationChannels.types.vhf_uhf_repeater') },
  { value: 'echolink', label: t('communicationChannels.types.echolink') },
  { value: 'aprs', label: t('communicationChannels.types.aprs') },
])

const cityOptions = computed(() => {
  const cities = new Set(['all'])
  allChannels.value.forEach(i => {
    if (i.branch?.city) cities.add(i.branch.city)
  })
  return Array.from(cities).map(c => ({
    value: c,
    label: c === 'all' ? t('communicationChannels.filterAllCities') : c
  }))
})

const districtOptions = computed(() => {
  const districts = new Set(['all'])
  allChannels.value.forEach(i => {
    if (i.district) districts.add(i.district)
  })
  return Array.from(districts).map(d => ({
    value: d,
    label: d === 'all' ? t('communicationChannels.filterAllDistricts') : d
  }))
})

const filteredChannels = computed(() => {
  return channels.value.filter(i => {
    if (cityFilter.value !== 'all' && i.branch?.city !== cityFilter.value) return false
    if (districtFilter.value !== 'all' && i.district !== districtFilter.value) return false
    return true
  })
})

async function fetchChannels(append = false) {
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
    
    const response = await api.get<CommunicationChannelListResponse>(`/communication-channel?${params.toString()}`)
    
    if (append) {
      channels.value = [...channels.value, ...response.data]
      allChannels.value = [...allChannels.value, ...response.data]
    } else {
      channels.value = response.data
      allChannels.value = response.data
    }
    
    total.value = response.total
    hasMore.value = channels.value.length < response.total
  } catch {
    channels.value = []
    allChannels.value = []
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

const loadMore = () => {
  page.value++
  fetchChannels(true)
}

const handleFilterChange = () => {
  page.value = 1
  fetchChannels()
}

const handleSearch = () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    page.value = 1
    fetchChannels()
  }, 300)
}

usePersistedFilters('communicationChannels', { searchQuery, typeFilter, cityFilter, districtFilter })

watch(searchQuery, handleSearch)
watch(typeFilter, handleFilterChange)

watch([cityFilter, districtFilter], () => {
})

const selectedChannel = ref<CommunicationChannel | null>(null)
const isEditSheetOpen = ref(false)
const showDeleteDialog = ref(false)
const showDeactivateDialog = ref(false)
const isDeleting = ref(false)
const isDeactivating = ref(false)
const activeNetsCount = ref(0)
const isLoadingActiveNets = ref(false)

function openEditChannel(channel: CommunicationChannel) {
  selectedChannel.value = channel
  isEditSheetOpen.value = true
}

function openDeleteChannelDialog(channel: CommunicationChannel) {
  selectedChannel.value = channel
  showDeleteDialog.value = true
  isLoadingActiveNets.value = true
  api
    .get<{ count: number }>(`/communication-channel/${channel.id}/active-nets`)
    .then((res) => {
      activeNetsCount.value = res.count ?? 0
    })
    .catch(() => {
      activeNetsCount.value = 0
    })
    .finally(() => {
      isLoadingActiveNets.value = false
    })
}

function openDeactivateChannelDialog(channel: CommunicationChannel) {
  selectedChannel.value = channel
  showDeactivateDialog.value = true
  isLoadingActiveNets.value = true
  api
    .get<{ count: number }>(`/communication-channel/${channel.id}/active-nets`)
    .then((res) => {
      activeNetsCount.value = res.count ?? 0
    })
    .catch(() => {
      activeNetsCount.value = 0
    })
    .finally(() => {
      isLoadingActiveNets.value = false
    })
}

async function deleteChannel() {
  if (!selectedChannel.value || isDeleting.value) return
  if (activeNetsCount.value > 0) {
    toast.error(t('communicationChannels.cannotDeleteWithActiveNets', { count: activeNetsCount.value }))
    return
  }
  isDeleting.value = true
  try {
    await api.delete(`/communication-channel/${selectedChannel.value.id}`)
    await fetchChannels()
    toast.success(t('communicationChannels.deleteSuccess'))
    showDeleteDialog.value = false
    activeNetsCount.value = 0
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isDeleting.value = false
  }
}

async function confirmDeactivateChannel() {
  if (!selectedChannel.value || isDeactivating.value) return
  isDeactivating.value = true
  try {
    await api.patch(`/communication-channel/${selectedChannel.value.id}`, { isActive: false })
    await fetchChannels()
    toast.success(t('communicationChannels.deactivated'))
    showDeactivateDialog.value = false
    activeNetsCount.value = 0
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isDeactivating.value = false
  }
}

async function toggleChannelStatus(channel: CommunicationChannel) {
  if (channel.isActive) {
    openDeactivateChannelDialog(channel)
  } else {
    try {
      await api.patch(`/communication-channel/${channel.id}`, { isActive: true })
      await fetchChannels()
      toast.success(t('communicationChannels.activated'))
    } catch (e) {
      toast.error(translateError((e as ApiError).message))
    }
  }
}

function handleChannelUpdated() {
  void fetchChannels()
}

function openTutorial(channel: CommunicationChannel) {
  const plain = JSON.parse(JSON.stringify(toRaw(channel))) as Record<string, unknown>
  tutorialContent.value = buildTutorialContent(plain, t)
  tutorialTitle.value = formatCommunicationChannelLabel({ communicationChannel: channel })
  showTutorialDialog.value = true
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

onMounted(() => {
  fetchUserMemberships()
})
fetchChannels()
</script>

<template>
  <PublicPageLayout v-if="!authStore.isAuthenticated">
    <div class="space-y-4">
      <h1 class="text-2xl lg:text-3xl font-bold mb-4">
        {{ t('nav.communicationChannels').toLocaleUpperCase(locale) }}
      </h1>
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
        <CommunicationChannelCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="filteredChannels.length === 0" class="py-4 text-center">
        <TowerControl class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p class="text-sm text-muted-foreground">{{ t('communicationChannels.noInfrastructure') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <CommunicationChannelCard
          v-for="ch in filteredChannels"
          :key="ch.id"
          :channel="ch"
          :can-manage="false"
          @open-tutorial="openTutorial"
        />
      </div>

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || filteredChannels.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ filteredChannels.length }}/{{ total }} {{ t('communicationChannels.nameEntity') }}
        </p>
        <div v-if="hasMore && !isLoading && cityFilter === 'all' && districtFilter === 'all'" class="order-1 lg:order-2 w-full lg:w-auto">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
      </div>
    </div>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader class="pr-8">
          <DialogTitle class="text-lg font-semibold leading-tight text-foreground">
            {{ tutorialTitle }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            {{ t('communicationChannels.tutorialDescription') }}
          </DialogDescription>
        </DialogHeader>
        <div class="tutorial-content text-sm text-foreground" v-html="renderMarkdown(tutorialContent.content)" />
        <DialogFooter>
          <Button variant="outline" @click="showTutorialDialog = false">
            {{ t('common.close') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PublicPageLayout>

  <AppLayout v-else :title="t('nav.communicationChannels').toLocaleUpperCase(locale)">
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
        <CommunicationChannelCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="filteredChannels.length === 0" class="py-4 text-center">
        <TowerControl class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p class="text-sm text-muted-foreground">{{ t('communicationChannels.noInfrastructure') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <CommunicationChannelCard
          v-for="ch in filteredChannels"
          :key="ch.id"
          :channel="ch"
          :can-manage="canManageBranch(ch.branchId)"
          @edit="openEditChannel"
          @delete="openDeleteChannelDialog"
          @toggle-status="(ch) => ch.isActive ? openDeactivateChannelDialog(ch) : toggleChannelStatus(ch)"
          @open-tutorial="openTutorial"
        />
      </div>

      <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
        <p v-if="!isLoading && (total > 0 || filteredChannels.length > 0)" class="text-sm text-muted-foreground order-2 lg:order-1">
          {{ filteredChannels.length }}/{{ total }} {{ t('communicationChannels.nameEntity') }}
        </p>
        <div v-if="hasMore && !isLoading && cityFilter === 'all' && districtFilter === 'all'" class="order-1 lg:order-2 w-full lg:w-auto">
          <Button
            variant="outline"
            class="w-full lg:w-auto lg:px-8"
            :disabled="isLoadingMore"
            @click="loadMore"
          >
            {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
          </Button>
        </div>
      </div>
    </div>

    <EditCommChannelSheet
      v-if="selectedChannel"
      :open="isEditSheetOpen"
      :channel="selectedChannel"
      :branch-city="selectedChannel.branch?.city"
      @update:open="isEditSheetOpen = $event"
      @updated="handleChannelUpdated"
    />

    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('communicationChannels.deleteConfirmTitle') }}</DialogTitle>
          <DialogDescription>
            <div v-if="isLoadingActiveNets" class="py-2">{{ t('common.loading') }}</div>
            <div v-else>
              <p>{{ t('communicationChannels.deleteConfirmDescription') }}</p>
              <p v-if="activeNetsCount > 0" class="mt-2 text-amber-600 dark:text-amber-500 font-medium">
                {{ t('communicationChannels.cannotDeleteWithActiveNets', { count: activeNetsCount }) }}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="destructive"
            @click="deleteChannel"
            :disabled="isDeleting || activeNetsCount > 0"
          >
            <span v-if="isDeleting">{{ t('common.saving') }}</span>
            <span v-else>{{ t('common.delete') }}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showDeactivateDialog" @update:open="showDeactivateDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('communicationChannels.deactivateConfirmTitle') }}</DialogTitle>
          <DialogDescription>
            <div v-if="isLoadingActiveNets" class="py-2">{{ t('common.loading') }}</div>
            <div v-else>
              <p>{{ t('communicationChannels.deactivateConfirmDescription') }}</p>
              <p v-if="activeNetsCount > 0" class="mt-2 text-amber-600 dark:text-amber-500 font-medium">
                {{ t('communicationChannels.activeNetsWarning', { count: activeNetsCount }) }}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeactivateDialog = false" :disabled="isDeactivating">
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="confirmDeactivateChannel"
            :disabled="isDeactivating"
            class="text-amber-600 hover:text-amber-700"
          >
            {{ isDeactivating ? t('common.saving') : t('communicationChannels.deactivate') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="showTutorialDialog" @update:open="showTutorialDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader class="pr-8">
          <DialogTitle class="text-lg font-semibold leading-tight text-foreground">
            {{ tutorialTitle }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            {{ t('communicationChannels.tutorialDescription') }}
          </DialogDescription>
        </DialogHeader>
        <div class="tutorial-content text-sm text-foreground" v-html="renderMarkdown(tutorialContent.content)" />
        <DialogFooter>
          <Button variant="outline" @click="showTutorialDialog = false">
            {{ t('common.close') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
