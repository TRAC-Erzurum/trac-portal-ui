<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AutocompleteCombobox } from '@/components/shared'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { useQthData } from '@/composables/useQthData'

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
  dmrId?: number | null
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
const { cities, getDistricts, isLoading: isFetchingCities, loadCities } = useQthData()

const fullName = ref('')
const city = ref('')
const district = ref('')
const gridSquare = ref('')
const dmrId = ref<number | undefined>()
const isLoading = ref(false)
const isInitializing = ref(false)

const districts = computed(() => getDistricts(city.value))

watch(city, () => {
  if (isInitializing.value) return
  if (!districts.value.includes(district.value)) {
    district.value = ''
  }
})

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    await loadCities()
    fullName.value = props.operator.fullName || props.operator.user?.fullName || ''
    city.value = props.operator.city?.trim() || ''
    district.value = props.operator.district?.trim() || ''
    gridSquare.value = props.operator.gridSquare || ''
    dmrId.value = props.operator.dmrId ?? undefined
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
      dmrId: dmrId.value || null,
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
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('operators.editOperator') }}</SheetTitle>
        <SheetDescription>{{ operator.callSign }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6 pb-6">
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
          <AutocompleteCombobox
            id="city"
            v-model="city"
            :options="cities"
            :placeholder="isFetchingCities ? t('common.loading') : t('form.cityPlaceholder')"
            :disabled="isFetchingCities"
          />
        </div>

        <div class="space-y-2">
          <Label for="district">{{ t('form.district') }}</Label>
          <AutocompleteCombobox
            id="district"
            v-model="district"
            :options="districts"
            :placeholder="city ? t('form.districtPlaceholder') : t('form.cityPlaceholder')"
            :disabled="!city"
          />
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

        <div class="space-y-2">
          <Label for="dmrId">{{ t('profile.dmrId') }}</Label>
          <Input
            id="dmrId"
            v-model.number="dmrId"
            type="number"
            placeholder="2860001"
          />
          <p class="text-xs text-muted-foreground">{{ t('profile.dmrIdHint') }}</p>
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
