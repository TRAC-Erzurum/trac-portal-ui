<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'

interface Props {
  userId: string
  callSign: string
}

const props = defineProps<Props>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()

const newPassword = ref('')
const confirmPassword = ref('')
const isResetting = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    newPassword.value = ''
    confirmPassword.value = ''
  }
})

const handleSubmit = async () => {
  if (newPassword.value.length < 6) {
    toast.error(t('admin.passwordTooShort'))
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t('admin.passwordMismatch'))
    return
  }
  
  isResetting.value = true
  try {
    await api.post(`/user/${props.userId}/reset-password`, { newPassword: newPassword.value })
    toast.success(t('admin.passwordReset'))
    open.value = false
  } catch (error) {
    console.error('Failed to reset password:', error)
    toast.error(t('error.serverError'))
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('admin.resetPassword') }}</SheetTitle>
        <SheetDescription>
          {{ t('admin.resetPasswordDescription', { callSign }) }}
        </SheetDescription>
      </SheetHeader>

      <div class="space-y-4 py-6">
        <div class="space-y-2">
          <Label for="newPassword">{{ t('admin.newPassword') }}</Label>
          <Input 
            id="newPassword" 
            v-model="newPassword" 
            type="password" 
            :placeholder="t('admin.newPasswordPlaceholder')"
          />
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">{{ t('admin.confirmPassword') }}</Label>
          <Input 
            id="confirmPassword" 
            v-model="confirmPassword" 
            type="password" 
            :placeholder="t('admin.confirmPasswordPlaceholder')"
          />
        </div>
      </div>

      <div class="trac-sheet-actions">
        <Button variant="outline" class="trac-sheet-btn" @click="open = false">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button 
          class="trac-sheet-btn"
          @click="handleSubmit" 
          :disabled="isResetting || !newPassword || !confirmPassword"
        >
          <Check class="h-4 w-4 mr-2" />
          {{ isResetting ? t('common.loading') : t('admin.resetPassword') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
