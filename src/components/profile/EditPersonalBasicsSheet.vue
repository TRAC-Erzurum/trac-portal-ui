<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface UserProfile {
  fullName?: string
  profession?: string | null
  birthDate?: string | null
  idNumber?: string | null
}

const props = defineProps<{
  open: boolean
  initialProfile?: UserProfile | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()
const fullName = ref('')
const profession = ref('')
const birthDate = ref('')
const idNumber = ref('')
const isLoading = ref(false)

watch(() => props.open, (isOpen) => {
  if (isOpen && props.initialProfile) {
    fullName.value = props.initialProfile.fullName || ''
    profession.value = props.initialProfile.profession || ''
    const bDate = props.initialProfile.birthDate
    if (bDate) {
      const splitDate = bDate.split('T')[0]
      if (splitDate) {
        birthDate.value = splitDate
      } else {
        birthDate.value = ''
      }
    } else {
      birthDate.value = ''
    }
    idNumber.value = props.initialProfile.idNumber || ''
  }
})

async function handleSubmit() {
  isLoading.value = true
  try {
    const payload = {
      fullName: fullName.value || null,
      profession: profession.value || null,
      birthDate: birthDate.value || null,
      idNumber: idNumber.value || null,
    }

    await api.patch('/user', payload)
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
    <SheetContent class="sm:max-w-xl overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('account.personalInfo') }}</SheetTitle>
        <SheetDescription>{{ t('profile.editPersonalDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-6 pb-10">
        <div class="space-y-2">
          <Label>{{ t('form.fullName') }}</Label>
          <Input v-model="fullName" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>{{ t('account.profession') }}</Label>
            <Input v-model="profession" />
          </div>
          <div class="space-y-2">
            <Label>{{ t('account.birthDate') }}</Label>
            <Input 
              type="date" 
              v-model="birthDate" 
              class="w-full h-10 block"
            />
          </div>
        </div>
        <div class="space-y-2">
          <Label>{{ t('account.idNumber') }}</Label>
          <Input 
            v-model="idNumber"
            @input="idNumber = ($event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 11)"
            maxlength="11"
            inputmode="numeric"
            placeholder="12345678901"
          />
        </div>

        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t bg-background sticky bottom-0 z-10 -mx-4 px-4 pb-2 mt-auto">
          <Button type="button" variant="ghost" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" :loading="isLoading">
            {{ t('common.save') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
