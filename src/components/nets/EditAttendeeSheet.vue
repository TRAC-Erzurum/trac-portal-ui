<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AutocompleteCombobox } from '@/components/shared'
import { api } from '@/lib/api'
import { toast } from 'vue-sonner'
import { useQthData } from '@/composables/useQthData'
import { useFormValidation } from '@/composables'

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
const { cities, getDistricts, loadCities } = useQthData()

const isSubmitting = ref(false)
const isSubmitted = ref(false)
const form = ref({
  name: '',
  country: 'Türkiye',
  city: '',
  district: '',
  readability: 5,
  signalStrength: 9
})

// Form validation setup
const validators = computed(() => ({
  name: [
    (value: string) => {
      const name = form.value.name?.trim()
      return name && name.length > 0 ? true : t('form.validation.required')
    }
  ]
}))

const { validateForm, getFieldError, shouldShowError, fieldErrors } = useFormValidation(
  validators.value,
  { name: form }
)

const isInitializing = ref(true)

const districts = computed(() => getDistricts(form.value.city))

watch(() => props.open, async (open) => {
  if (open && props.attendee) {
    isSubmitted.value = false
    fieldErrors.value = {}
    isInitializing.value = true
    form.value = {
      name: props.attendee.name || '',
      country: props.attendee.country || 'Türkiye',
      city: props.attendee.city?.trim() || '',
      district: props.attendee.district?.trim() || '',
      readability: props.attendee.readability || 5,
      signalStrength: props.attendee.signalStrength || 9
    }
    
    await loadCities()
    isInitializing.value = false
  }
})

watch(() => form.value.city, (city, oldCity) => {
  if (isInitializing.value) return
  if (city !== oldCity) {
    form.value.district = ''
  }
})

const handleSubmit = async () => {
  isSubmitted.value = true

  // Validate form
  const isFormValid = validateForm()
  if (!isFormValid) {
    return
  }

  isSubmitting.value = true
  try {
    await api.patch(`/net/${props.netId}/attendee/${props.attendee.id}`, {
      name: (form.value.name || '').trim() || null,
      country: (form.value.country || '').trim() || null,
      city: (form.value.city || '').trim() || null,
      district: (form.value.district || '').trim() || null,
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
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('netDetail.editAttendee') }}</SheetTitle>
        <SheetDescription>
          {{ attendee.callSign }}
        </SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-6 pb-6">
        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.fullName') }}</label>
          <Input
            v-model="form.name"
            :placeholder="t('form.fullNamePlaceholder')"
            :class="shouldShowError('name', isSubmitted) ? 'border-destructive' : ''"
          />
          <p v-if="shouldShowError('name', isSubmitted)" class="text-xs text-destructive mt-1">
            {{ getFieldError('name') }}
          </p>
        </div>

        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.city') }}</label>
          <AutocompleteCombobox
            id="edit-attendee-city"
            :model-value="form.city"
            :options="cities"
            :placeholder="t('form.cityPlaceholder')"
            @update:model-value="(v) => (form.city = v)"
          />
        </div>

        <div>
          <label class="text-sm font-medium mb-1.5 block">{{ t('form.district') }}</label>
          <AutocompleteCombobox
            id="edit-attendee-district"
            :model-value="form.district"
            :options="districts"
            :placeholder="form.city ? t('form.districtPlaceholder') : '-'"
            :disabled="!form.city"
            @update:model-value="(v) => (form.district = v)"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium mb-1.5 block">{{ t('operators.readability') }}</label>
            <Select v-model="form.readability">
              <SelectTrigger class="w-full">
                <SelectValue>{{ form.readability }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in 5" :key="r" :value="r">{{ r }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label class="text-sm font-medium mb-1.5 block">{{ t('operators.signal') }}</label>
            <Select v-model="form.signalStrength">
              <SelectTrigger class="w-full">
                <SelectValue>{{ form.signalStrength }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in 9" :key="s" :value="s">{{ s }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="isSubmitting">
            {{ t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
