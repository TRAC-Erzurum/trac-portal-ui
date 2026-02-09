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

interface Profile {
  operator?: {
    district?: string
    city?: string
    gridSquare?: string
    dmrId?: number | null
  }
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()
const { cities, getDistricts, isLoading: isFetchingCities, loadCities } = useQthData()

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
    try {
      const profile = await api.get<Profile>('/user/profile')
      city.value = profile.operator?.city || ''
      district.value = profile.operator?.district || ''
      gridSquare.value = profile.operator?.gridSquare || ''
      dmrId.value = profile.operator?.dmrId ?? undefined
    } catch {
      // ignore
    } finally {
      isInitializing.value = false
    }
  }
})

async function handleSubmit() {
  isLoading.value = true
  try {
    await api.patch('/user/operator', {
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
        <SheetTitle>{{ t('profile.editOperator') }}</SheetTitle>
        <SheetDescription>{{ t('profile.editOperatorDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6 pb-6">
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
