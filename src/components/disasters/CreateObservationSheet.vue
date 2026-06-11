<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import ObservationPhotoInput from '@/components/disasters/ObservationPhotoInput.vue'
import SeverityRadioGroup from '@/components/disasters/SeverityRadioGroup.vue'
import { LocationMapPicker, type LocationSelection } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useQthData } from '@/composables'
import { translateError } from '@/i18n'
import { ROOT_OBSERVATION_TYPES } from '@/lib/observation-hierarchy'
import { api, type ApiError } from '@/lib/api'
import type { Observation, ObservationSeverity, ObservationType } from '@/types/disaster'

const props = defineProps<{
  open: boolean
  disasterId: string
  initialType?: ObservationType
  initialLat?: number
  initialLng?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
  addInformation: [observation: Observation]
  feedbackSupport: [observationId: string]
}>()

const { t } = useI18n()
const { cities, getDistricts, loadCities } = useQthData()

const type = ref<ObservationType | ''>('')
const severity = ref<ObservationSeverity | 'NONE'>('NONE')
const description = ref('')
const eventTime = ref('')
const photoFiles = ref<File[]>([])
const location = ref<LocationSelection | null>(null)
const selectedProvince = ref('')
const selectedDistrict = ref('')
const isLoading = ref(false)
const isLocating = ref(false)
const isSyncingFromMap = ref(false)
const similarObservations = ref<Observation[]>([])
const showSimilarDialog = ref(false)

const districts = computed(() =>
  selectedProvince.value ? getDistricts(selectedProvince.value) : [],
)

const sheetTitle = computed(() =>
  props.initialType && type.value
    ? t(`disaster.observationType.${type.value}`)
    : t('disaster.createObservation'),
)

function toLocalDatetimeValue(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function normalizeForCompare(value: string): string {
  return value.trim().toLocaleLowerCase('tr')
}

function findMatch(options: string[], target: string): string | null {
  const normalized = normalizeForCompare(target)
  if (!normalized) return null
  return options.find((option) => normalizeForCompare(option) === normalized) ?? null
}

function buildLocationLabel(): string | undefined {
  const parts: string[] = []
  if (selectedDistrict.value) parts.push(selectedDistrict.value)
  if (selectedProvince.value) parts.push(selectedProvince.value)
  if (parts.length > 0) return parts.join(', ')
  if (location.value?.city || location.value?.district) {
    return [location.value.district, location.value.city].filter(Boolean).join(', ')
  }
  return undefined
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ province: string; district: string } | null> {
  try {
    const data = await api.get<{ address?: Record<string, string> } | null>(
      `/qth/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
    )
    if (!data?.address) return null
    const addr = data.address
    const province = addr.province ?? addr.state ?? addr.state_district ?? addr.region ?? ''
    const district = addr.town ?? addr.county ?? addr.municipality ?? addr.village ?? ''
    return { province, district }
  } catch {
    return null
  }
}

async function applyReverseGeocode(lat: number, lng: number) {
  const place = await reverseGeocode(lat, lng)
  if (!place) return
  if (!location.value || location.value.lat !== lat || location.value.lng !== lng) return
  location.value = {
    ...location.value,
    city: place.province,
    district: place.district,
  }
}

function attemptDeviceLocation() {
  if (!navigator.geolocation) return
  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      location.value = {
        lat,
        lng,
        gridSquare: '',
        city: '',
        district: '',
        altitude: null,
      }
      isLocating.value = false
      applyReverseGeocode(lat, lng)
    },
    () => {
      isLocating.value = false
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    type.value = props.initialType ?? ROOT_OBSERVATION_TYPES[0] ?? ''
    severity.value = 'NONE'
    description.value = ''
    eventTime.value = toLocalDatetimeValue()
    photoFiles.value = []
    location.value = null
    selectedProvince.value = ''
    selectedDistrict.value = ''
    similarObservations.value = []
    showSimilarDialog.value = false
    await loadCities()
    if (props.initialLat != null && props.initialLng != null) {
      location.value = {
        lat: props.initialLat,
        lng: props.initialLng,
        gridSquare: '',
        city: '',
        district: '',
        altitude: null,
      }
      applyReverseGeocode(props.initialLat, props.initialLng)
    } else {
      attemptDeviceLocation()
    }
  }
})

watch(selectedProvince, (newVal, oldVal) => {
  if (isSyncingFromMap.value) return
  if (newVal !== oldVal) {
    selectedDistrict.value = ''
  }
})

watch([selectedProvince, selectedDistrict], () => {
  if (isSyncingFromMap.value) return
  if (!location.value) return
  const city = selectedProvince.value || location.value.city
  const district = selectedDistrict.value || location.value.district
  if (city === location.value.city && district === location.value.district) return
  location.value = {
    ...location.value,
    city,
    district,
  }
})

watch(location, async (loc) => {
  if (!loc?.city && !loc?.district) return
  isSyncingFromMap.value = true
  try {
    if (loc.city) {
      const provinceMatch = findMatch(cities.value, loc.city)
      if (provinceMatch && provinceMatch !== selectedProvince.value) {
        selectedProvince.value = provinceMatch
        await nextTick()
      }
    }
    if (loc.district && selectedProvince.value) {
      const districtMatch = findMatch(getDistricts(selectedProvince.value), loc.district)
      if (districtMatch && districtMatch !== selectedDistrict.value) {
        selectedDistrict.value = districtMatch
      }
    }
  } finally {
    await nextTick()
    isSyncingFromMap.value = false
  }
}, { deep: true })

async function uploadPhotos(observationId: string) {
  if (photoFiles.value.length === 0) return
  const formData = new FormData()
  for (const file of photoFiles.value) {
    formData.append('photos', file)
  }
  try {
    await api.post(`/observation/${observationId}/photos`, formData)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  }
}

async function createObservation(manageLoading = true) {
  if (!type.value || !location.value) {
    toast.error(t('form.validation.required'))
    return false
  }

  if (manageLoading) isLoading.value = true
  try {
    const created = await api.post<Observation>(
      `/disaster/${props.disasterId}/observations`,
      {
        type: type.value,
        lat: location.value.lat,
        lng: location.value.lng,
        locationLabel: buildLocationLabel(),
        severity: severity.value === 'NONE' ? undefined : severity.value,
        description: description.value.trim() || undefined,
        eventTime: eventTime.value ? new Date(eventTime.value).toISOString() : undefined,
      },
    )
    await uploadPhotos(created.id)
    toast.success(t('disaster.createObservationSuccess'))
    emit('created')
    emit('update:open', false)
    return true
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
    return false
  } finally {
    if (manageLoading) isLoading.value = false
  }
}

async function checkSimilarAndSubmit() {
  if (!type.value || !location.value) {
    toast.error(t('form.validation.required'))
    return
  }

  isLoading.value = true
  try {
    const similar = await api.get<Observation[]>(
      `/disaster/${props.disasterId}/observations/similar?lat=${location.value.lat}&lng=${location.value.lng}&type=${type.value}`,
    )
    if (similar.length > 0) {
      similarObservations.value = similar
      showSimilarDialog.value = true
      return
    }
    await createObservation(false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

async function handleSimilarSupport(observation: Observation) {
  showSimilarDialog.value = false
  isLoading.value = true
  try {
    await api.post(`/observation/${observation.id}/feedback`, { type: 'SUPPORT' })
    toast.success(t('disaster.feedbackSuccess'))
    emit('feedbackSupport', observation.id)
    emit('update:open', false)
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

function handleSimilarAddInformation(observation: Observation) {
  showSimilarDialog.value = false
  emit('addInformation', observation)
  emit('update:open', false)
}

async function handleCreateAnyway() {
  showSimilarDialog.value = false
  await createObservation()
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ sheetTitle }}</SheetTitle>
        <SheetDescription>{{ t('disaster.createObservationDescription') }}</SheetDescription>
      </SheetHeader>

      <form class="space-y-4 py-4 px-1" @submit.prevent="checkSimilarAndSubmit">
        <div v-if="!initialType" class="space-y-2">
          <Label for="obs-type">{{ t('disaster.typeLabel') }}</Label>
          <Select v-model="type">
            <SelectTrigger id="obs-type" class="w-full">
              <SelectValue :placeholder="t('disaster.selectType')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in ROOT_OBSERVATION_TYPES" :key="opt" :value="opt">
                {{ t(`disaster.observationType.${opt}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>{{ t('disaster.location') }}</Label>
          <div class="relative">
            <LocationMapPicker v-model="location" :standalone="false" />
            <div
              v-if="isLocating"
              class="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center py-2 bg-background/80 backdrop-blur-sm"
            >
              <p class="text-xs font-medium text-muted-foreground">{{ t('common.loading') }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-2">
            <Label for="obs-province">{{ t('disaster.province') }}</Label>
            <Select v-model="selectedProvince">
              <SelectTrigger id="obs-province" class="w-full">
                <SelectValue :placeholder="t('disaster.selectProvince')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="city in cities" :key="city" :value="city">
                  {{ city }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="obs-district">{{ t('disaster.district') }}</Label>
            <Select v-model="selectedDistrict" :disabled="!selectedProvince">
              <SelectTrigger id="obs-district" class="w-full">
                <SelectValue :placeholder="t('disaster.selectDistrict')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="d in districts" :key="d" :value="d">
                  {{ d }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label id="obs-severity-label">{{ t('disaster.severity') }}</Label>
          <SeverityRadioGroup v-model="severity" label-id="obs-severity-label" />
        </div>

        <div class="space-y-2">
          <Label for="obs-event-time">{{ t('disaster.eventTime') }}</Label>
          <input
            id="obs-event-time"
            v-model="eventTime"
            type="datetime-local"
            class="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>

        <div class="space-y-2">
          <Label for="obs-description">{{ t('disaster.description') }}</Label>
          <Textarea
            id="obs-description"
            v-model="description"
            :placeholder="t('disaster.descriptionPlaceholder')"
            rows="3"
          />
        </div>

        <ObservationPhotoInput v-model="photoFiles" />

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" class="trac-sheet-btn" :disabled="isLoading">
            <Check class="h-4 w-4 mr-2" />
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <Dialog v-model:open="showSimilarDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('disaster.similarFound') }}</DialogTitle>
        <DialogDescription>{{ t('disaster.similarFoundDescription') }}</DialogDescription>
      </DialogHeader>
      <ul class="space-y-2 max-h-48 overflow-y-auto">
        <li
          v-for="obs in similarObservations"
          :key="obs.id"
          class="p-3 rounded-lg border border-border/50 text-sm"
        >
          <p class="font-medium">{{ t(`disaster.observationType.${obs.type}`) }}</p>
          <p class="text-muted-foreground text-xs mt-1">
            {{ obs.locationLabel || `${obs.lat.toFixed(4)}, ${obs.lng.toFixed(4)}` }}
          </p>
        </li>
      </ul>
      <DialogFooter class="flex-col sm:flex-col gap-2">
        <Button
          variant="outline"
          class="w-full"
          @click="handleSimilarSupport(similarObservations[0]!)"
        >
          {{ t('disaster.observedToo') }}
        </Button>
        <Button
          variant="outline"
          class="w-full"
          @click="handleSimilarAddInformation(similarObservations[0]!)"
        >
          {{ t('disaster.addInformation') }}
        </Button>
        <Button variant="outline" class="w-full" :disabled="isLoading" @click="handleCreateAnyway">
          {{ t('disaster.createNewAnyway') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
