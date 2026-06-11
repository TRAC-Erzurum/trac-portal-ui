<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Archive, CalendarPlus, Pencil, RotateCcw, Siren, Users } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import AddInformationSheet from '@/components/disasters/AddInformationSheet.vue'
import CreateObservationSheet from '@/components/disasters/CreateObservationSheet.vue'
import DisasterObservationsMap from '@/components/disasters/DisasterObservationsMap.vue'
import EditDisasterSheet from '@/components/disasters/EditDisasterSheet.vue'
import ManageMembersSheet from '@/components/disasters/ManageMembersSheet.vue'
import ObservationTypeButtons from '@/components/disasters/ObservationTypeButtons.vue'
import { ObservationCard } from '@/components/shared'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import { ROOT_OBSERVATION_TYPES } from '@/lib/observation-hierarchy'
import type {
  Disaster,
  DisasterMembership,
  Observation,
  ObservationFeedbackType,
  ObservationType,
  RankedObservation,
} from '@/types/disaster'

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const disasterId = computed(() => route.params.id as string)

const disaster = ref<Disaster | null>(null)
const isLoading = ref(true)
const isDisasterAdmin = ref(false)
const members = ref<DisasterMembership[]>([])
const allObservations = ref<RankedObservation[]>([])
const isLoadingObservations = ref(false)
const userFeedbackMap = ref<Record<string, ObservationFeedbackType | null>>({})

const showEditSheet = ref(false)
const showCreateObservationSheet = ref(false)
const createObservationType = ref<ObservationType | undefined>(undefined)
const createObservationLat = ref<number | undefined>(undefined)
const createObservationLng = ref<number | undefined>(undefined)
const showAddInformationSheet = ref(false)
const showManageMembersSheet = ref(false)
const addInformationParent = ref<Observation | null>(null)
const addInformationType = ref<ObservationType | undefined>(undefined)
const highlightedObservationId = ref<string | null>(null)

const showArchiveDialog = ref(false)
const showReactivateDialog = ref(false)
const isArchiving = ref(false)

const isArchived = computed(() => !!disaster.value?.archivedAt)
const readOnly = computed(() => isArchived.value)

const rootObservations = computed(() =>
  allObservations.value.filter(o => !o.parentObservationId),
)

const childrenByParentId = computed(() => {
  const map = new Map<string, Observation[]>()
  for (const obs of allObservations.value) {
    if (!obs.parentObservationId) continue
    const list = map.get(obs.parentObservationId) ?? []
    list.push(obs)
    map.set(obs.parentObservationId, list)
  }
  return map
})

async function fetchDisaster() {
  isLoading.value = true
  try {
    disaster.value = await api.get<Disaster>(`/disaster/${disasterId.value}`)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
    disaster.value = null
  } finally {
    isLoading.value = false
  }
}

async function fetchAdminStatus() {
  if (authStore.isSuperAdmin) {
    isDisasterAdmin.value = true
    await fetchMembers()
    return
  }
  try {
    members.value = await api.get<DisasterMembership[]>(`/disaster/${disasterId.value}/members`)
    isDisasterAdmin.value = true
  } catch (e) {
    const error = e as ApiError
    if (error.statusCode === 403) {
      isDisasterAdmin.value = false
      members.value = []
    }
  }
}

async function fetchMembers() {
  try {
    members.value = await api.get<DisasterMembership[]>(`/disaster/${disasterId.value}/members`)
  } catch {
    members.value = []
  }
}

async function fetchObservations() {
  isLoadingObservations.value = true
  try {
    allObservations.value = await api.get<RankedObservation[]>(
      `/disaster/${disasterId.value}/observations?rootOnly=false`,
    )
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
    allObservations.value = []
  } finally {
    isLoadingObservations.value = false
  }
}

async function handleFeedback(observationId: string, type: ObservationFeedbackType) {
  const current = userFeedbackMap.value[observationId]
  try {
    if (current === type) {
      await api.delete(`/observation/${observationId}/feedback`)
      userFeedbackMap.value = { ...userFeedbackMap.value, [observationId]: null }
      toast.success(t('disaster.feedbackRemoved'))
    } else {
      await api.post(`/observation/${observationId}/feedback`, { type })
      userFeedbackMap.value = { ...userFeedbackMap.value, [observationId]: type }
      toast.success(t('disaster.feedbackSuccess'))
    }
    await fetchObservations()
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  }
}

function openAddInformation(observation: Observation, type?: ObservationType) {
  addInformationParent.value = observation
  addInformationType.value = type
  showAddInformationSheet.value = true
}

function openCreateObservation(obsType: ObservationType) {
  createObservationType.value = obsType
  createObservationLat.value = undefined
  createObservationLng.value = undefined
  showCreateObservationSheet.value = true
}

function handleCreateAt(payload: { lat: number; lng: number; type: ObservationType }) {
  createObservationType.value = payload.type
  createObservationLat.value = payload.lat
  createObservationLng.value = payload.lng
  showCreateObservationSheet.value = true
}

function handleMapSelect(id: string) {
  highlightedObservationId.value = id
  nextTick(() => {
    document.getElementById(`observation-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function handleShowOnMap(id: string) {
  highlightedObservationId.value = id
  nextTick(() => {
    document.getElementById('disaster-map-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function confirmArchive() {
  if (!disaster.value) return
  isArchiving.value = true
  try {
    disaster.value = await api.post<Disaster>(`/disaster/${disaster.value.id}/archive`)
    toast.success(t('disaster.archiveSuccess'))
    showArchiveDialog.value = false
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isArchiving.value = false
  }
}

async function confirmReactivate() {
  if (!disaster.value) return
  isArchiving.value = true
  try {
    disaster.value = await api.post<Disaster>(`/disaster/${disaster.value.id}/reactivate`)
    toast.success(t('disaster.reactivateSuccess'))
    showReactivateDialog.value = false
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isArchiving.value = false
  }
}

function handleDisasterUpdated(updated: Disaster) {
  disaster.value = updated
}

function handleObservationCreated() {
  fetchObservations()
}

function handleAddInformationFromCreate(observation: Observation) {
  openAddInformation(observation)
}

watch(disasterId, () => {
  fetchDisaster()
  fetchAdminStatus()
  fetchObservations()
})

onMounted(() => {
  fetchDisaster()
  fetchAdminStatus()
  fetchObservations()
})
</script>

<template>
  <AppLayout
    :title="disaster?.name?.toLocaleUpperCase(locale) ?? t('nav.disasters').toLocaleUpperCase(locale)"
    :breadcrumb-label="disaster?.name"
  >
    <div v-if="isLoading" class="space-y-4">
      <Skeleton class="h-8 w-64" />
      <Skeleton class="h-24 w-full" />
    </div>

    <div v-else-if="!disaster" class="py-8 text-center text-sm text-muted-foreground">
      {{ t('error.notFound') }}
    </div>

    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div class="flex flex-wrap items-center gap-2 min-w-0">
          <Siren class="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span class="text-sm font-medium">
            {{ t(`disaster.disasterType.${disaster.type}`) }}
          </span>
          <span
            v-if="isArchived"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
          >
            {{ t('disaster.archived') }}
          </span>
        </div>

        <p class="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0" :title="t('disaster.createdAt')">
          <CalendarPlus class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {{ formatDateTime(disaster.createdAt, locale) }}
        </p>
      </div>

      <div v-if="isDisasterAdmin" class="flex flex-wrap gap-2">
        <Button v-if="!isArchived" variant="outline" size="sm" @click="showEditSheet = true">
          <Pencil class="h-4 w-4 mr-2" />
          {{ t('disaster.edit') }}
        </Button>
        <Button v-if="!isArchived" variant="outline" size="sm" @click="showArchiveDialog = true">
          <Archive class="h-4 w-4 mr-2" />
          {{ t('disaster.archive') }}
        </Button>
        <Button v-if="isArchived" variant="outline" size="sm" @click="showReactivateDialog = true">
          <RotateCcw class="h-4 w-4 mr-2" />
          {{ t('disaster.reactivate') }}
        </Button>
        <Button variant="outline" size="sm" @click="showManageMembersSheet = true">
          <Users class="h-4 w-4 mr-2" />
          {{ t('disaster.manageMembers') }}
        </Button>
      </div>

      <p v-if="isArchived" class="text-sm text-amber-700 dark:text-amber-400">
        {{ t('disaster.archivedReadOnly') }}
      </p>

      <div v-if="disaster.metadata" class="space-y-2">
        <p class="text-sm font-medium text-muted-foreground">{{ t('disaster.metadata') }}</p>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div v-if="disaster.metadata.magnitude != null">
            <dt class="text-xs text-muted-foreground">{{ t('disaster.magnitude') }}</dt>
            <dd class="font-medium">{{ Number(disaster.metadata.magnitude).toFixed(1) }}</dd>
          </div>
          <div v-if="disaster.metadata.epicenter">
            <dt class="text-xs text-muted-foreground">{{ t('disaster.epicenter') }}</dt>
            <dd class="font-medium">{{ disaster.metadata.epicenter }}</dd>
          </div>
          <div v-if="disaster.metadata.affectedCities?.length" class="sm:col-span-2">
            <dt class="text-xs text-muted-foreground">{{ t('disaster.affectedCities') }}</dt>
            <dd class="font-medium">{{ disaster.metadata.affectedCities.join(', ') }}</dd>
          </div>
        </dl>
      </div>

      <Separator class="my-6" />

      <ObservationTypeButtons
        v-if="!readOnly"
        :types="ROOT_OBSERVATION_TYPES"
        variant="card"
        class="mb-4"
        @select="openCreateObservation"
      />

      <section id="disaster-map-heading" :aria-label="t('disaster.mapTitle')" class="scroll-mt-4">
        <DisasterObservationsMap
          :observations="rootObservations"
          :highlighted-id="highlightedObservationId"
          :allow-create="!readOnly"
          @select="handleMapSelect"
          @create-at="handleCreateAt"
        />
      </section>

      <Separator class="my-8" />

      <section :aria-label="t('disaster.observations')">
        <div v-if="isLoadingObservations" class="space-y-3">
          <Skeleton v-for="i in 3" :key="i" class="h-32 w-full" />
        </div>

        <div v-else-if="rootObservations.length === 0" class="py-8 text-center">
          <p class="text-sm text-muted-foreground">{{ t('disaster.observationsEmpty') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ObservationCard
            v-for="obs in rootObservations"
            :key="obs.id"
            :observation="obs"
            :children="childrenByParentId.get(obs.id) ?? []"
            :read-only="readOnly"
            :user-feedback-map="userFeedbackMap"
            :highlighted="highlightedObservationId === obs.id"
            :current-user-id="authStore.user?.id"
            @support="(id) => handleFeedback(id, 'SUPPORT')"
            @contradict="(id) => handleFeedback(id, 'CONTRADICT')"
            @add-information="(type) => openAddInformation(obs, type)"
            @show-on-map="handleShowOnMap(obs.id)"
          />
        </div>
      </section>

    </div>

    <EditDisasterSheet
      v-model:open="showEditSheet"
      :disaster="disaster"
      @updated="handleDisasterUpdated"
    />

    <CreateObservationSheet
      v-model:open="showCreateObservationSheet"
      :disaster-id="disasterId"
      :initial-type="createObservationType"
      :initial-lat="createObservationLat"
      :initial-lng="createObservationLng"
      @created="handleObservationCreated"
      @add-information="handleAddInformationFromCreate"
      @feedback-support="handleObservationCreated"
    />

    <AddInformationSheet
      v-model:open="showAddInformationSheet"
      :disaster-id="disasterId"
      :parent-observation="addInformationParent"
      :initial-type="addInformationType"
      @created="handleObservationCreated"
    />

    <ManageMembersSheet
      v-model:open="showManageMembersSheet"
      :disaster-id="disasterId"
      :members="members"
      @updated="fetchMembers"
    />

    <Dialog v-model:open="showArchiveDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('disaster.archive') }}</DialogTitle>
          <DialogDescription>{{ t('disaster.archiveConfirm') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" :disabled="isArchiving" @click="showArchiveDialog = false">
            {{ t('common.cancel') }}
          </Button>
          <Button variant="destructive" class="trac-btn-destructive-outlined" :disabled="isArchiving" @click="confirmArchive">
            {{ isArchiving ? t('common.loading') : t('disaster.archive') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showReactivateDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('disaster.reactivate') }}</DialogTitle>
          <DialogDescription>{{ t('disaster.reactivateConfirm') }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" :disabled="isArchiving" @click="showReactivateDialog = false">
            {{ t('common.cancel') }}
          </Button>
          <Button variant="outline" :disabled="isArchiving" @click="confirmReactivate">
            {{ isArchiving ? t('common.loading') : t('disaster.reactivate') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
