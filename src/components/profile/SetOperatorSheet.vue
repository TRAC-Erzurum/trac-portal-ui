<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { CallSignInput } from '@/components/ui/call-sign-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocatorMapPicker } from '@/components/shared'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { isValidCallSignFormat } from '@/lib/callsign'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const callSign = ref('')
const city = ref('')
const district = ref('')
const gridSquare = ref('')
const dmrId = ref<number | undefined>()
const isLoading = ref(false)
const isSubmitted = ref(false)

const locatorSelection = computed({
  get() {
    if (!gridSquare.value?.trim() && !city.value?.trim() && !district.value?.trim()) return null
    return {
      gridSquare: gridSquare.value?.trim()?.toUpperCase() ?? '',
      city: city.value?.trim() ?? '',
      district: district.value?.trim() ?? '',
    }
  },
  set(val: { gridSquare: string; city: string; district: string } | null) {
    if (!val) {
      city.value = ''
      district.value = ''
      gridSquare.value = ''
      return
    }
    city.value = val.city
    district.value = val.district
    gridSquare.value = val.gridSquare
  },
})

const callSignError = computed(() => {
  if (!isSubmitted.value) return ''
  const value = callSign.value.trim()
  if (!value) return t('form.validation.required')
  if (!isValidCallSignFormat(value, { allowSlashes: false })) {
    return t('error.callSignPlainOnly')
  }
  return ''
})

function resetForm() {
  callSign.value = ''
  city.value = ''
  district.value = ''
  gridSquare.value = ''
  dmrId.value = undefined
  isSubmitted.value = false
}

function handleOpenChange(isOpen: boolean) {
  if (!isOpen) resetForm()
  emit('update:open', isOpen)
}

async function handleSubmit() {
  isSubmitted.value = true
  if (callSignError.value) return

  isLoading.value = true
  try {
    await api.post('/user/operator', {
      callSign: callSign.value.trim(),
      city: city.value?.trim() || undefined,
      district: district.value?.trim() || undefined,
      gridSquare: gridSquare.value?.trim() ? gridSquare.value.trim().toUpperCase() : undefined,
      country: city.value?.trim() ? t('form.country') : undefined,
      dmrId: dmrId.value ?? undefined,
    })

    await authStore.checkAuth()
    toast.success(t('profile.operatorSetSuccess'))
    emit('updated')
    emit('update:open', false)
    resetForm()
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="handleOpenChange">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('profile.setOperator') }}</SheetTitle>
        <SheetDescription>{{ t('profile.setOperatorDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 pb-6">
        <div class="space-y-2">
          <Label for="setOperatorCallSign">{{ t('form.callSign') }} {{ t('form.required') }}</Label>
          <CallSignInput
            id="setOperatorCallSign"
            v-model="callSign"
            :class="callSignError ? 'border-destructive' : ''"
          />
          <p v-if="callSignError" class="text-xs text-destructive">{{ callSignError }}</p>
        </div>

        <div class="space-y-2">
          <Label for="setOperatorDmrId">{{ t('profile.dmrId') }}</Label>
          <Input
            id="setOperatorDmrId"
            v-model.number="dmrId"
            type="number"
            placeholder="2860001"
          />
          <p class="text-xs text-muted-foreground">{{ t('profile.dmrIdHint') }}</p>
        </div>

        <div class="space-y-2">
          <Label>{{ t('profile.qth') }}</Label>
          <LocatorMapPicker
            v-model="locatorSelection"
            :standalone="false"
          />
        </div>

        <div class="trac-sheet-actions">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="handleOpenChange(false)">
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
