<script setup lang="ts">
import { nextTick, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LocatorMapPicker } from '@/components/shared'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
export interface ProfileOperator {
  district?: string
  city?: string
  gridSquare?: string
  dmrId?: number | null
}

interface Profile {
  operator?: ProfileOperator
}

const props = withDefaults(
  defineProps<{
    open: boolean
    initialProfile?: Profile | null
  }>(),
  { initialProfile: null }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const city = ref('')
const district = ref('')
const gridSquare = ref('')
const dmrId = ref<number | undefined>()
const isLoading = ref(false)
const isInitializing = ref(false)

const locatorSelection = computed({
  get() {
    if (!gridSquare.value?.trim() && !city.value?.trim() && !district.value?.trim()) return null
    return {
      gridSquare: gridSquare.value?.trim()?.toUpperCase() ?? '',
      city: city.value?.trim() ?? '',
      district: district.value?.trim() ?? ''
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
  }
})

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    isInitializing.value = true
    try {
      const profile = props.initialProfile ?? await api.get<Profile>('/user/profile')
      const op = profile.operator
      city.value = op?.city || ''
      district.value = op?.district || ''
      gridSquare.value = op?.gridSquare || ''
      dmrId.value = op?.dmrId ?? undefined
      await nextTick()
      city.value = op?.city || ''
      district.value = op?.district || ''
      gridSquare.value = op?.gridSquare || ''
      dmrId.value = op?.dmrId ?? undefined
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
      city: city.value?.trim() || null,
      district: district.value?.trim() || null,
      gridSquare: gridSquare.value?.trim() ? gridSquare.value.trim().toUpperCase() : null,
      country: city.value?.trim() ? 'Türkiye' : null,
      dmrId: dmrId.value ?? null,
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
          <Label for="dmrId">{{ t('profile.dmrId') }}</Label>
          <Input
            id="dmrId"
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
