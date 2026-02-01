<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface City {
  name: string
  districts: { name: string }[]
}

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
    id: string
    fullName?: string
    email?: string
  }
}

const props = defineProps<{
  open: boolean
  operator: Operator
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const fullName = ref('')
const city = ref('')
const district = ref('')
const gridSquare = ref('')
const isLoading = ref(false)
const isFetchingCities = ref(false)
const isInitializing = ref(false)

const cities = ref<City[]>([])

const districts = computed(() => {
  const cityData = cities.value.find(c => c.name === city.value)
  return cityData?.districts.map(d => d.name) || []
})

watch(city, () => {
  if (isInitializing.value) return
  if (!districts.value.includes(district.value)) {
    district.value = ''
  }
})

async function fetchCities() {
  if (cities.value.length > 0) return
  isFetchingCities.value = true
  try {
    cities.value = await api.get<City[]>('/qth/countries/Türkiye/cities')
  } catch {
    cities.value = []
  } finally {
    isFetchingCities.value = false
  }
}

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    await fetchCities()
    fullName.value = props.operator.fullName || props.operator.user?.fullName || ''
    city.value = props.operator.city?.trim() || ''
    district.value = props.operator.district?.trim() || ''
    gridSquare.value = props.operator.gridSquare || ''
    isInitializing.value = false
  }
})

async function handleSubmit() {
  isLoading.value = true
  try {
    await api.patch(`/operator/${props.operator.id}`, {
      fullName: fullName.value || undefined,
      city: city.value || undefined,
      district: district.value || undefined,
      gridSquare: gridSquare.value?.toUpperCase() || undefined,
      country: city.value ? 'Türkiye' : undefined,
    })

    toast.success(t('profile.profileUpdated'))
    emit('updated')
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
    <SheetContent class="sm:max-w-md px-6 overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{{ t('operators.editOperator') }}</SheetTitle>
        <SheetDescription>{{ operator.callSign }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
        <div class="space-y-2">
          <Label for="fullName">{{ t('form.fullName') }}</Label>
          <Input
            id="fullName"
            v-model="fullName"
            type="text"
            :placeholder="t('form.fullNamePlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="city">{{ t('form.city') }}</Label>
          <Select v-model="city">
            <SelectTrigger id="city" class="w-full" :disabled="isFetchingCities">
              <SelectValue :placeholder="isFetchingCities ? t('common.loading') : t('form.cityPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in cities" :key="c.name" :value="c.name">
                {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="district">{{ t('form.district') }}</Label>
          <Select v-model="district" :disabled="!city">
            <SelectTrigger id="district" class="w-full">
              <SelectValue :placeholder="city ? t('form.district') : t('form.cityPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="d in districts" :key="d" :value="d">
                {{ d }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="gridSquare">{{ t('profile.locator') }}</Label>
          <Input
            id="gridSquare"
            v-model="gridSquare"
            type="text"
            placeholder="KN40ab"
            maxlength="6"
            class="uppercase"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isLoading">
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
