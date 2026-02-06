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

interface Profile {
  fullName?: string
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const { t } = useI18n()

const fullName = ref('')
const isLoading = ref(false)

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    try {
      const profile = await api.get<Profile>('/user/profile')
      fullName.value = profile.fullName || ''
    } catch {
      // ignore
    }
  }
})

async function handleSubmit() {
  isLoading.value = true
  try {
    await api.patch('/user/profile', { fullName: fullName.value })
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
        <SheetTitle>{{ t('profile.editPersonal') }}</SheetTitle>
        <SheetDescription>{{ t('profile.editPersonalDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="mt-6 space-y-6 pb-6">
        <div class="space-y-2">
          <Label for="fullName">{{ t('form.fullName') }}</Label>
          <Input
            id="fullName"
            v-model="fullName"
            type="text"
            :placeholder="t('form.fullName')"
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
