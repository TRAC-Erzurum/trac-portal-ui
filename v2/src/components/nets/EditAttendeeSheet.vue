<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'vue-sonner'

interface Attendee {
  id: string
  callSign: string
  name?: string
  country?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
}

const props = defineProps<{
  open: boolean
  attendee: Attendee
  netId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const isSubmitting = ref(false)
const form = ref({
  name: '',
  country: 'Türkiye',
  city: '',
  district: '',
  readability: 5,
  signalStrength: 9
})

const cities = ref<string[]>([])
const districts = ref<string[]>([])
const isLoadingCities = ref(false)
const isLoadingDistricts = ref(false)
const isInitializing = ref(true)

const fetchCities = async () => {
  isLoadingCities.value = true
  try {
    const data = await api.get<{ cities: { name: string }[] }>('/qth/countries/Türkiye/cities')
    cities.value = data.cities.map(c => c.name).sort((a, b) => a.localeCompare(b, 'tr'))
  } catch (error) {
    console.error('Failed to fetch cities:', error)
  } finally {
    isLoadingCities.value = false
  }
}

const fetchDistricts = async (city: string) => {
  if (!city) {
    districts.value = []
    return
  }
  isLoadingDistricts.value = true
  try {
    const data = await api.get<{ districts: string[] }>(`/qth/countries/Türkiye/cities/${encodeURIComponent(city)}/districts`)
    districts.value = data.districts.sort((a, b) => a.localeCompare(b, 'tr'))
  } catch (error) {
    console.error('Failed to fetch districts:', error)
  } finally {
    isLoadingDistricts.value = false
  }
}

watch(() => props.open, async (open) => {
  if (open && props.attendee) {
    isInitializing.value = true
    form.value = {
      name: props.attendee.name || '',
      country: props.attendee.country || 'Türkiye',
      city: props.attendee.city?.trim() || '',
      district: props.attendee.district?.trim() || '',
      readability: props.attendee.readability || 5,
      signalStrength: props.attendee.signalStrength || 9
    }
    
    await fetchCities()
    if (form.value.city) {
      await fetchDistricts(form.value.city)
    }
    isInitializing.value = false
  }
})

watch(() => form.value.city, (city, oldCity) => {
  if (isInitializing.value) return
  if (city !== oldCity) {
    form.value.district = ''
    fetchDistricts(city)
  }
})

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    await api.patch(`/net/${props.netId}/attendee/${props.attendee.id}`, {
      name: form.value.name || null,
      country: form.value.country || null,
      city: form.value.city || null,
      district: form.value.district || null,
      readability: form.value.readability,
      signalStrength: form.value.signalStrength
    })
    
    toast.success(t('netDetail.attendeeUpdated'))
    emit('updated')
  } catch (error) {
    toast.error(t('error.serverError'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="px-6">
      <SheetHeader>
        <SheetTitle>{{ t('netDetail.editAttendee') }}</SheetTitle>
        <SheetDescription>
          {{ attendee.callSign }}
        </SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-6">
        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.fullName') }}</label>
          <Input
            v-model="form.name"
            :placeholder="t('form.fullNamePlaceholder')"
          />
        </div>

        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.city') }}</label>
          <Select v-model="form.city">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('form.cityPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="city in cities" :key="city" :value="city">
                {{ city }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.district') }}</label>
          <Select v-model="form.district" :disabled="!form.city">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="form.city ? t('form.district') : '-'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="district in districts" :key="district" :value="district">
                {{ district }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium mb-1.5 block">{{ t('operators.readability') }}</label>
            <Select v-model="form.readability">
              <SelectTrigger class="w-full">
                <SelectValue>R{{ form.readability }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in 5" :key="r" :value="r">R{{ r }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label class="text-sm font-medium mb-1.5 block">{{ t('operators.signal') }}</label>
            <Select v-model="form.signalStrength">
              <SelectTrigger class="w-full">
                <SelectValue>S{{ form.signalStrength }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in 9" :key="s" :value="s">S{{ s }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            {{ t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
