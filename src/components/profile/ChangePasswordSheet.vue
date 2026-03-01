<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { translateError } from '@/i18n'
import type { ApiError } from '@/lib/api'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)

const canSubmit = computed(() => {
  return newPassword.value.length >= 6 && newPassword.value === confirmPassword.value
})

function resetForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

async function handleSubmit() {
  if (!canSubmit.value) return

  isLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/user/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: currentPassword.value || undefined,
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'error.serverError' }))
      throw { message: error.message } as ApiError
    }

    toast.success(t('profile.passwordChanged'))
    resetForm()
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
  <Sheet :open="open" @update:open="val => { if (!val) resetForm(); emit('update:open', val) }">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('profile.changePassword') }}</SheetTitle>
        <SheetDescription>{{ t('profile.changePasswordDesc') }}</SheetDescription>
      </SheetHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 pb-6">
        <div class="space-y-2">
          <Label for="currentPassword">{{ t('profile.currentPassword') }}</Label>
          <PasswordInput
            id="currentPassword"
            v-model="currentPassword"
            placeholder="••••••••"
          />
          <p class="text-xs text-muted-foreground">{{ t('profile.currentPasswordHint') }}</p>
        </div>

        <div class="space-y-2">
          <Label for="newPassword">{{ t('profile.newPassword') }}</Label>
          <PasswordInput
            id="newPassword"
            v-model="newPassword"
            placeholder="••••••••"
          />
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">{{ t('form.passwordConfirm') }}</Label>
          <PasswordInput
            id="confirmPassword"
            v-model="confirmPassword"
            placeholder="••••••••"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="emit('update:open', false)">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" variant="outline" :disabled="!canSubmit || isLoading">
            {{ isLoading ? t('common.loading') : t('profile.changePassword') }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
