<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { LocationMapPicker, type LocationSelection } from '@/components/shared'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import type { Disaster, DisasterType } from '@/types/disaster'

const props = defineProps<{
  open: boolean
  disaster: Disaster | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  updated: [disaster: Disaster]
}>()

const { t } = useI18n()

const name = ref('')
const type = ref<DisasterType>('EARTHQUAKE_DRILL')
const magnitude = ref('')
const epicenterLocation = ref<LocationSelection | null>(null)
const affectedCitiesInput = ref('')
const isLoading = ref(false)

function loadFromDisaster(disaster: Disaster) {
  name.value = disaster.name
  type.value = disaster.type
  magnitude.value =
    disaster.metadata?.magnitude != null
      ? Number(disaster.metadata.magnitude).toFixed(1)
      : ''
  const lat = disaster.metadata?.epicenterLat
  const lng = disaster.metadata?.epicenterLng
  epicenterLocation.value =
    lat != null && lng != null
      ? { gridSquare: '', city: '', district: '', lat, lng, altitude: null }
      : null
  affectedCitiesInput.value = disaster.metadata?.affectedCities?.join(', ') ?? ''
}

function formatMagnitude() {
  const raw = magnitude.value.trim().replace(',', '.')
  if (!raw) {
    magnitude.value = ''
    return
  }
  const num = Number(raw)
  magnitude.value = Number.isNaN(num) ? '' : num.toFixed(1)
}

function epicenterLabel(location: LocationSelection): string {
  return [location.district, location.city].filter(Boolean).join(', ')
}

watch(
  () => [props.open, props.disaster] as const,
  ([isOpen, disaster]) => {
    if (isOpen && disaster) loadFromDisaster(disaster)
  },
)

function parseAffectedCities(): string[] | undefined {
  const cities = affectedCitiesInput.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return cities.length > 0 ? cities : undefined
}

async function handleSubmit() {
  if (!props.disaster || !name.value.trim()) {
    toast.error(t('form.validation.required'))
    return
  }

  isLoading.value = true
  try {
    const metadata: Record<string, unknown> = {}
    const magnitudeValue = Number(magnitude.value.trim().replace(',', '.'))
    if (magnitude.value.trim() !== '' && !Number.isNaN(magnitudeValue)) {
      metadata.magnitude = magnitudeValue
    }
    if (epicenterLocation.value) {
      metadata.epicenterLat = epicenterLocation.value.lat
      metadata.epicenterLng = epicenterLocation.value.lng
      const label = epicenterLabel(epicenterLocation.value)
      if (label) metadata.epicenter = label
    }
    const cities = parseAffectedCities()
    if (cities) metadata.affectedCities = cities

    const disaster = await api.patch<Disaster>(`/disaster/${props.disaster.id}`, {
      name: name.value.trim(),
      type: type.value,
      metadata,
    })

    toast.success(t('disaster.updateSuccess'))
    emit('updated', disaster)
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
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('disaster.edit') }}</SheetTitle>
        <SheetDescription>{{ t('disaster.editDescription') }}</SheetDescription>
      </SheetHeader>

      <form class="space-y-4 py-4 px-1" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="edit-disaster-name">{{ t('disaster.name') }}</Label>
          <Input id="edit-disaster-name" v-model="name" type="text" class="w-full" />
        </div>

        <div class="space-y-2">
          <Label for="edit-disaster-type">{{ t('disaster.type') }}</Label>
          <Select v-model="type">
            <SelectTrigger id="edit-disaster-type" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EARTHQUAKE_DRILL">
                {{ t('disaster.disasterType.EARTHQUAKE_DRILL') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="edit-disaster-magnitude">{{ t('disaster.magnitude') }}</Label>
          <Input
            id="edit-disaster-magnitude"
            v-model="magnitude"
            type="text"
            inputmode="decimal"
            class="w-full"
            @blur="formatMagnitude"
          />
        </div>

        <div class="space-y-2">
          <Label>{{ t('disaster.epicenter') }}</Label>
          <LocationMapPicker v-model="epicenterLocation" :standalone="false" />
        </div>

        <div class="space-y-2">
          <Label for="edit-disaster-cities">{{ t('disaster.affectedCities') }}</Label>
          <Input id="edit-disaster-cities" v-model="affectedCitiesInput" type="text" class="w-full" />
        </div>

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
</template>
