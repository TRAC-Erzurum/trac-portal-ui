<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Plus, Siren } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import CreateDisasterSheet from '@/components/disasters/CreateDisasterSheet.vue'
import DisasterCard from '@/components/disasters/DisasterCard.vue'
import DisasterCardSkeleton from '@/components/disasters/DisasterCardSkeleton.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAsyncStaleGuard } from '@/composables'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { Disaster, DisasterListResponse } from '@/types/disaster'

type StatusTab = 'active' | 'archived'

const { t, locale } = useI18n()
const authStore = useAuthStore()

const disasters = ref<Disaster[]>([])
const total = ref(0)
const isLoading = ref(true)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const statusTab = ref<StatusTab>('active')
const showCreateSheet = ref(false)
const pageSize = 24

const listGuard = useAsyncStaleGuard()

const canCreate = computed(() => authStore.canCreateDisaster)

async function fetchDisasters(append = false) {
  const token = append ? listGuard.beginAppend() : listGuard.beginReplace()
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }

  try {
    const offset = append ? disasters.value.length : 0
    const params = new URLSearchParams()
    params.set('status', statusTab.value)
    params.set('limit', String(pageSize))
    params.set('offset', String(offset))

    const response = await api.get<DisasterListResponse>(`/disaster?${params.toString()}`)
    if (!listGuard.isCurrent(token)) return

    total.value = response.total
    disasters.value = append ? [...disasters.value, ...response.data] : response.data
    hasMore.value = disasters.value.length < response.total
  } catch {
    if (!listGuard.isCurrent(token)) return
    if (!append) disasters.value = []
    total.value = 0
    hasMore.value = false
  } finally {
    if (listGuard.isCurrent(token)) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

function loadMore() {
  fetchDisasters(true)
}

function handleCreated() {
  if (statusTab.value === 'active') {
    fetchDisasters()
  } else {
    statusTab.value = 'active'
  }
}

watch(statusTab, () => {
  fetchDisasters()
})

onMounted(() => {
  fetchDisasters()
})
</script>

<template>
  <AppLayout :title="t('nav.disasters').toLocaleUpperCase(locale)">
    <div class="space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div
          role="tablist"
          class="inline-flex bg-muted p-1 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="statusTab === 'active'"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="statusTab === 'active'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
            @click="statusTab = 'active'"
          >
            {{ t('disaster.activeTab') }}
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="statusTab === 'archived'"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="statusTab === 'archived'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
            @click="statusTab = 'archived'"
          >
            {{ t('disaster.archivedTab') }}
          </button>
        </div>
        <div class="trac-top-actions">
          <Button
            v-if="canCreate"
            variant="outline"
            class="trac-page-action-btn hidden lg:flex"
            @click="showCreateSheet = true"
          >
            <Plus class="h-4 w-4" />
            {{ t('disaster.create') }}
          </Button>
        </div>
      </div>

      <Separator class="my-8" />

      <section aria-labelledby="disasters-list-heading">
        <div class="mb-4">
          <h3 id="disasters-list-heading" class="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Siren class="h-4 w-4" aria-hidden="true" />
            {{ t('disaster.title') }}
          </h3>
        </div>

        <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <DisasterCardSkeleton v-for="i in 6" :key="i" />
        </div>

        <div v-else-if="disasters.length === 0" class="py-8 text-center">
          <p class="text-sm text-muted-foreground">{{ t('disaster.noResults') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <DisasterCard v-for="disaster in disasters" :key="disaster.id" :disaster="disaster" />
        </div>

        <div v-if="!isLoading" class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-16 lg:pb-0">
          <p v-if="total > 0" class="text-sm text-muted-foreground order-2 lg:order-1">
            {{ disasters.length }}/{{ total }}
          </p>
          <div v-if="hasMore" class="order-1 lg:order-2 w-full lg:w-auto">
            <Button
              variant="outline"
              class="trac-load-more-btn w-full lg:w-auto lg:px-8"
              :disabled="isLoadingMore"
              @click="loadMore"
            >
              <ChevronDown v-if="!isLoadingMore" class="h-4 w-4 mr-2" />
              {{ isLoadingMore ? t('common.loading') : t('common.loadMore') }}
            </Button>
          </div>
        </div>
      </section>
    </div>

    <Button
      v-if="canCreate"
      variant="outline"
      class="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-background lg:hidden p-0"
      :aria-label="t('disaster.create')"
      @click="showCreateSheet = true"
    >
      <Plus class="h-6 w-6" />
    </Button>

    <CreateDisasterSheet v-model:open="showCreateSheet" @created="handleCreated" />
  </AppLayout>
</template>
