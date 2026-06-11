<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { ChevronRight, Siren } from 'lucide-vue-next'
import CreateObservationSheet from '@/components/disasters/CreateObservationSheet.vue'
import DashboardDisasterCard from '@/components/disasters/DashboardDisasterCard.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import type { DisasterListResponse, DisasterWithStats, ObservationType } from '@/types/disaster'

const { t } = useI18n()

const disasters = ref<DisasterWithStats[]>([])
const isLoading = ref(true)
const showCreateSheet = ref(false)
const selectedDisasterId = ref<string | null>(null)
const createObservationType = ref<ObservationType | undefined>(undefined)

async function fetchActiveDisasters() {
  isLoading.value = true
  try {
    const response = await api.get<DisasterListResponse>('/disaster?status=active&limit=6')
    disasters.value = (response.data ?? []) as DisasterWithStats[]
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
    disasters.value = []
  } finally {
    isLoading.value = false
  }
}

function openCreateObservation(disasterId: string, type: ObservationType) {
  selectedDisasterId.value = disasterId
  createObservationType.value = type
  showCreateSheet.value = true
}

function handleObservationCreated() {
  void fetchActiveDisasters()
}

onMounted(() => {
  void fetchActiveDisasters()
})
</script>

<template>
  <section
    v-if="isLoading || disasters.length > 0"
    aria-labelledby="dashboard-active-disasters-heading"
    class="rounded-lg border border-border bg-background overflow-hidden"
  >
    <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <Siren class="h-4 w-4 shrink-0" aria-hidden="true" />
        <h2
          id="dashboard-active-disasters-heading"
          class="text-sm font-medium text-muted-foreground truncate"
        >
          {{ t('disaster.activeDisastersTitle') }}
        </h2>
      </div>
      <RouterLink to="/disasters" class="shrink-0">
        <Button variant="outline" size="sm" class="gap-1.5">
          {{ t('inventory.viewAll') }}
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </RouterLink>
    </div>

    <div class="p-3">
      <div v-if="isLoading" class="space-y-3">
        <Skeleton v-for="i in 3" :key="i" class="h-40 w-full rounded-lg" />
      </div>

      <div v-else class="space-y-3">
        <DashboardDisasterCard
          v-for="disaster in disasters"
          :key="disaster.id"
          :disaster="disaster"
          @add-observation="openCreateObservation"
        />
      </div>
    </div>

    <CreateObservationSheet
      v-if="selectedDisasterId"
      v-model:open="showCreateSheet"
      :disaster-id="selectedDisasterId"
      :initial-type="createObservationType"
      @created="handleObservationCreated"
    />
  </section>
</template>
