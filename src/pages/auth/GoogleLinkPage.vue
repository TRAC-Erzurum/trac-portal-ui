<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Captcha from '@/components/Captcha.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

/**
 * One-time step after a Google sign-in matched an account that has a password
 * but no Google identity yet. The API keeps the pending sign-in in an httpOnly
 * cookie; this page only chooses how to finish it.
 */
const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref<string | null>(null)

const currentPassword = ref('')
const captchaToken = ref('')
const captchaRef = ref<InstanceType<typeof Captcha>>()
const confirmSubmitted = ref(false)

const newPassword = ref('')
const confirmPassword = ref('')
const newSubmitted = ref(false)

const isLoading = ref(false)

onMounted(async () => {
  try {
    const link = await api.get<{ email: string }>('/auth/google-link')
    email.value = link.email
  } catch {
    toast.error(t('auth.googleLinkExpired'))
    router.replace({ name: 'login' })
  }
})

function currentPasswordError(): string | null {
  return currentPassword.value ? null : t('form.validation.required')
}

function newPasswordError(): string | null {
  if (!newPassword.value.trim()) return t('form.validation.required')
  if (newPassword.value.length < 6) return t('admin.passwordTooShort')
  return null
}

function confirmPasswordError(): string | null {
  if (!confirmPassword.value) return t('form.validation.required')
  if (confirmPassword.value !== newPassword.value) return t('admin.passwordMismatch')
  return null
}

async function finish(response: { isTemporaryPassword?: boolean }) {
  authStore.isTemporaryPassword = response.isTemporaryPassword || false
  await authStore.checkAuth()
  if (authStore.isTemporaryPassword) {
    router.push({ name: 'force-change-password' })
  } else {
    toast.success(t('auth.loginSuccess'))
    router.push('/dashboard')
  }
}

function handleFailure(e: unknown) {
  const error = e as ApiError
  if (error.statusCode === 404) {
    toast.error(t('auth.googleLinkExpired'))
    router.replace({ name: 'login' })
    return
  }
  toast.error(translateError(error.message))
}

async function confirmCurrentPassword() {
  confirmSubmitted.value = true
  if (currentPasswordError()) return
  if (captchaRef.value?.isEnabled && !captchaToken.value) {
    toast.error(t('error.pleaseWaitForCaptcha'))
    return
  }

  isLoading.value = true
  try {
    const response = await api.post<{ isTemporaryPassword?: boolean }>(
      '/auth/google-link/confirm-password',
      { password: currentPassword.value, captchaToken: captchaToken.value || undefined },
    )
    await finish(response)
  } catch (e) {
    handleFailure(e)
  } finally {
    isLoading.value = false
  }
}

async function setNewPassword() {
  newSubmitted.value = true
  if (newPasswordError() || confirmPasswordError()) return

  isLoading.value = true
  try {
    const response = await api.post<{ isTemporaryPassword?: boolean }>(
      '/auth/google-link/set-password',
      { newPassword: newPassword.value },
    )
    await finish(response)
  } catch (e) {
    handleFailure(e)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-sm my-8">
      <div class="text-center mb-8">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-2xl font-bold">{{ t('auth.googleLinkTitle') }}</h1>
        <p v-if="email" class="text-muted-foreground mt-1 text-sm break-words">
          {{ t('auth.googleLinkSubtitle', { email }) }}
        </p>
      </div>

      <template v-if="email">
        <form class="space-y-4" @submit.prevent="confirmCurrentPassword">
          <div class="space-y-1">
            <h2 class="font-semibold">{{ t('auth.googleLinkConfirmTitle') }}</h2>
            <p class="text-sm text-muted-foreground">{{ t('auth.googleLinkConfirmDescription') }}</p>
          </div>
          <div class="space-y-2">
            <Label for="currentPassword">{{ t('form.password') }}</Label>
            <PasswordInput
              id="currentPassword"
              v-model="currentPassword"
              :class="confirmSubmitted && currentPasswordError() ? 'border-destructive' : ''"
            />
            <p v-if="confirmSubmitted && currentPasswordError()" class="text-xs text-destructive">
              {{ currentPasswordError() }}
            </p>
          </div>

          <Captcha ref="captchaRef" v-model="captchaToken" />

          <Button type="submit" class="w-full" :disabled="isLoading">
            {{ t('auth.googleLinkConfirmSubmit') }}
          </Button>
        </form>

        <div class="relative my-6 flex items-center">
          <div class="flex-1 border-t border-border"></div>
          <span class="px-4 text-sm text-muted-foreground">{{ t('auth.or') }}</span>
          <div class="flex-1 border-t border-border"></div>
        </div>

        <form class="space-y-4" @submit.prevent="setNewPassword">
          <div class="space-y-1">
            <h2 class="font-semibold">{{ t('auth.googleLinkNewTitle') }}</h2>
            <p class="text-sm text-muted-foreground">{{ t('auth.googleLinkNewDescription') }}</p>
          </div>
          <div class="space-y-2">
            <Label for="newPassword">{{ t('admin.newPassword') }}</Label>
            <PasswordInput
              id="newPassword"
              v-model="newPassword"
              :placeholder="t('admin.newPasswordPlaceholder')"
              :class="newSubmitted && newPasswordError() ? 'border-destructive' : ''"
            />
            <p v-if="newSubmitted && newPasswordError()" class="text-xs text-destructive">
              {{ newPasswordError() }}
            </p>
          </div>
          <div class="space-y-2">
            <Label for="confirmPassword">{{ t('admin.confirmPassword') }}</Label>
            <PasswordInput
              id="confirmPassword"
              v-model="confirmPassword"
              :placeholder="t('admin.confirmPasswordPlaceholder')"
              :class="newSubmitted && confirmPasswordError() ? 'border-destructive' : ''"
            />
            <p v-if="newSubmitted && confirmPasswordError()" class="text-xs text-destructive">
              {{ confirmPasswordError() }}
            </p>
          </div>

          <Button type="submit" variant="outline" class="w-full" :disabled="isLoading">
            {{ t('auth.googleLinkNewSubmit') }}
          </Button>
        </form>
      </template>

      <p v-else class="text-muted-foreground text-center">
        {{ t('common.loading') }}
      </p>
    </div>
  </AuthLayout>
</template>
