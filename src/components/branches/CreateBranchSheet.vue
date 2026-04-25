<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Plus, Trash2, Star, X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CallSignInput } from '@/components/ui/call-sign-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { AutocompleteCombobox } from '@/components/shared'
import { translateError } from '@/i18n'
import { isValidCallSignFormat } from '@/lib/callsign'
import { api, type ApiError } from '@/lib/api'
import { useQthData, useFormValidation } from '@/composables'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()
const { cities, loadCities } = useQthData()

const name = ref('')
const type = ref<'branch' | 'representative'>('branch')
const city = ref('')
const address = ref('')
const phone = ref('')
const email = ref('')
const callSigns = ref<Array<{ callSign: string; isDefault: boolean }>>([{ callSign: '', isDefault: true }])
const isLoading = ref(false)
const isSubmitted = ref(false)

const getNormalizedCallSigns = () =>
  callSigns.value
    .map(cs => ({
      callSign: cs.callSign.trim(),
      isDefault: cs.isDefault
    }))
    .filter(cs => cs.callSign)

// Form validation setup
const validators = computed(() => ({
  name: [
    (_value: string) => name.value.trim() ? true : t('form.validation.required')
  ],
  callSigns: [
    (_value: any) => {
      const filledCount = callSigns.value.filter(cs => cs.callSign.trim()).length
      if (filledCount === 0) return true
      return filledCount === callSigns.value.length ? true : t('form.validation.required')
    },
    (_value: any) => {
      const invalid = callSigns.value.find(cs => cs.callSign.trim() && !isValidCallSignFormat(cs.callSign, { allowSlashes: false }))
      return !invalid ? true : t('error.callSignPlainOnly')
    },
  ],
  email: [
    (_value: string) => {
      if (!email.value) return true
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email.value) ? true : t('form.validation.invalid')
    }
  ]
}))

const { validateForm, getFieldError, shouldShowError, fieldErrors } = useFormValidation(
  validators.value,
  { name: name, email: email, callSigns: callSigns }
)

const addCallSign = () => {
  callSigns.value.push({ callSign: '', isDefault: false })
}

const removeCallSign = (index: number) => {
  const item = callSigns.value[index]
  if (!item) return
  const wasDefault = item.isDefault
  callSigns.value.splice(index, 1)
  if (wasDefault) {
    const firstItem = callSigns.value[0]
    if (firstItem) {
      firstItem.isDefault = true
    }
  }
}

const setDefaultCallSign = (index: number) => {
  callSigns.value.forEach((cs, i) => {
    cs.isDefault = i === index
  })
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    isSubmitted.value = false
    fieldErrors.value = {}
    loadCities()
    name.value = ''
    type.value = 'branch'
    city.value = ''
    address.value = ''
    phone.value = ''
    email.value = ''
    callSigns.value = [{ callSign: '', isDefault: true }]
  }
})

async function handleSubmit() {
  isSubmitted.value = true

  // Validate form
  const isFormValid = validateForm()
  if (!isFormValid) {
    return
  }

  const normalizedCallSigns = getNormalizedCallSigns()

  isLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      name: name.value.trim(),
      type: type.value,
      city: city.value.trim() || undefined,
      address: address.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      email: email.value.trim() || undefined
    }

    if (normalizedCallSigns.length > 0) {
      payload.callSigns = normalizedCallSigns
    }

    await api.post('/branches', payload)

    toast.success(t('branches.createSuccess'))
    emit('created')
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
        <SheetTitle>{{ t('branches.create') }}</SheetTitle>
        <SheetDescription>{{ t('branches.createDescription') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <Label for="name">{{ t('branches.name') }} <span class="text-destructive">*</span></Label>
          <Input
            id="name"
            v-model="name"
            type="text"
            :placeholder="t('branches.namePlaceholder')"
            :class="shouldShowError('name', isSubmitted) ? 'border-destructive' : ''"
            required
          />
          <p v-if="shouldShowError('name', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('name') }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="type">{{ t('branches.type') }} <span class="text-destructive">*</span></Label>
          <Select v-model="type">
            <SelectTrigger id="type" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="branch">{{ t('branches.typeBranch') }}</SelectItem>
              <SelectItem value="representative">{{ t('branches.typeRepresentative') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="city">{{ t('form.city') }}</Label>
          <AutocompleteCombobox
            id="city"
            v-model="city"
            :options="cities"
            :placeholder="t('form.cityPlaceholder')"
          />
        </div>

        <Separator />

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>{{ t('branches.callSigns') }}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="addCallSign"
              class="h-8"
            >
              <Plus class="h-3 w-3 mr-1" />
              {{ t('branches.addCallSign') }}
            </Button>
          </div>

          <div v-for="(callSign, index) in callSigns" :key="index" class="flex items-center gap-2">
            <div class="flex-1 relative">
              <CallSignInput
                v-model="callSign.callSign"
              />
              <button
                v-if="callSign.isDefault"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                :aria-label="t('branches.defaultCallSign')"
              >
                <Star class="h-4 w-4 text-amber-500 fill-amber-500" />
              </button>
              <button
                v-else
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-500 cursor-pointer transition-colors"
                @click="setDefaultCallSign(index)"
                :aria-label="t('branches.setDefault')"
              >
                <Star class="h-4 w-4" />
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              @click="removeCallSign(index)"
              :aria-label="t('branches.removeCallSign')"
            >
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
          <p v-if="shouldShowError('callSigns', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('callSigns') }}
          </p>
        </div>

        <Separator />

        <div class="space-y-2">
          <Label for="address">{{ t('branches.address') }}</Label>
          <Input
            id="address"
            v-model="address"
            type="text"
            :placeholder="t('branches.addressPlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="phone">{{ t('branches.phone') }}</Label>
          <Input
            id="phone"
            v-model="phone"
            type="tel"
            :placeholder="t('branches.phonePlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="email">{{ t('branches.email') }}</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            :placeholder="t('branches.emailPlaceholder')"
            :class="shouldShowError('email', isSubmitted) ? 'border-destructive' : ''"
          />
          <p v-if="shouldShowError('email', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('email') }}
          </p>
        </div>

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" class="trac-sheet-btn" :disabled="isLoading">
            <Check class="h-4 w-4 mr-2" />
            {{ isLoading ? t('common.loading') : t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
