<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { AlertTriangle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api } from '@/lib/api'
import type { ApiError } from '@/lib/api'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  
  if (newPassword.value.length < 6) {
    error.value = t('admin.passwordTooShort')
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = t('admin.passwordMismatch')
    return
  }
  
  isLoading.value = true
  try {
    await api.post('/user/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    })
    
    authStore.clearTemporaryPassword()
    await authStore.checkAuth()
    toast.success(t('auth.passwordChanged'))
    router.push('/dashboard')
  } catch (e) {
    const err = e as ApiError
    error.value = translateError(err.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-2xl font-bold">{{ t('auth.mustChangePassword') }}</h1>
        <p class="text-muted-foreground mt-1 hidden sm:block">
          {{ t('auth.mustChangePasswordDescription') }}
        </p>
      </div>

      <div class="flex items-center gap-2 p-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <AlertTriangle class="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p class="text-sm text-amber-700 dark:text-amber-300">
          {{ t('auth.temporaryPasswordNotice') }}
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <Label for="currentPassword">{{ t('auth.temporaryPassword') }}</Label>
          <PasswordInput 
            id="currentPassword" 
            v-model="currentPassword"
            :placeholder="t('auth.temporaryPasswordPlaceholder')"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="newPassword">{{ t('admin.newPassword') }}</Label>
          <PasswordInput 
            id="newPassword" 
            v-model="newPassword"
            :placeholder="t('admin.newPasswordPlaceholder')"
            required
          />
        </div>
        
        <div class="space-y-2">
          <Label for="confirmPassword">{{ t('admin.confirmPassword') }}</Label>
          <PasswordInput 
            id="confirmPassword" 
            v-model="confirmPassword"
            :placeholder="t('admin.confirmPasswordPlaceholder')"
            required
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>

        <Button type="submit" class="w-full" :disabled="isLoading">
          {{ isLoading ? t('common.loading') : t('auth.changePassword') }}
        </Button>
      </form>
    </div>
  </AuthLayout>
</template>
