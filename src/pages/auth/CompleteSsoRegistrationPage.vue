<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CallSignInput } from '@/components/ui/call-sign-input'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { useFormValidation } from '@/composables'
import { isValidCallSignFormat } from '@/lib/callsign'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const pending = ref<{ email: string; fullName: string; picture: string | null } | null>(null)
const callSign = ref('')
const fullName = ref('')
const privacyAccepted = ref(false)
const isLoading = ref(false)
const isSubmitted = ref(false)

const { validateForm, shouldShowError, getFieldError } = useFormValidation(
  {
    callSign: [
      (value: string) => value.trim() ? true : t('form.validation.required'),
      (value: string) =>
        isValidCallSignFormat(value, { allowSlashes: false })
          ? true
          : t('error.callSignPlainOnly'),
    ],
    privacyAccepted: [
      (value: boolean) => value ? true : t('form.validation.required'),
    ],
  },
  {
    callSign,
    privacyAccepted,
  }
)

onMounted(async () => {
  try {
    pending.value = await api.get<{ email: string; fullName: string; picture: string | null }>(
      '/auth/pending-sso'
    )
    fullName.value = pending.value?.fullName ?? ''
  } catch {
    router.replace({ name: 'login' })
  }
})

async function handleSubmit() {
  isSubmitted.value = true
  if (!validateForm()) return

  isLoading.value = true
  try {
    await api.post('/auth/complete-sso-registration', {
      callSign: callSign.value.trim(),
      privacyAccepted: privacyAccepted.value,
      fullName: (fullName.value || '').trim() || undefined,
    })
    await authStore.checkAuth()
    toast.success(t('auth.registerSuccess'))
    router.push('/dashboard')
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-lg my-8">
      <div class="text-center mb-8">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-2xl font-bold">{{ t('auth.completeSsoTitle') }}</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ t('auth.completeSsoSubtitle') }}
        </p>
      </div>

      <form
        v-if="pending"
        @submit.prevent="handleSubmit"
        class="space-y-4"
      >
        <div class="space-y-2">
          <Label for="email">{{ t('form.email') }}</Label>
          <Input
            id="email"
            :model-value="pending.email"
            type="email"
            disabled
            class="bg-muted"
          />
        </div>

        <div class="space-y-2">
          <Label for="fullName">{{ t('form.fullName') }}</Label>
          <Input
            id="fullName"
            v-model="fullName"
            type="text"
          />
        </div>

        <div class="space-y-2">
          <Label for="callSign">{{ t('form.callSign') }} {{ t('form.required') }}</Label>
          <CallSignInput
            id="callSign"
            v-model="callSign"
            :class="shouldShowError('callSign', isSubmitted) ? 'border-destructive' : ''"
            required
          />
          <p v-if="shouldShowError('callSign', isSubmitted)" class="text-xs text-destructive">
            {{ getFieldError('callSign') }}
          </p>
        </div>

        <div class="flex items-start gap-2">
          <input
            id="privacy"
            v-model="privacyAccepted"
            type="checkbox"
            :class="['h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background mt-0.5', shouldShowError('privacyAccepted', isSubmitted) ? 'border-destructive' : '']"
          />
          <label for="privacy" class="text-sm cursor-pointer select-none">
            {{ t('auth.privacyConsentCheckboxPrefix') }}
            <router-link to="/privacy" target="_blank" class="text-primary hover:underline" @click.stop>
              {{ t('auth.privacyLink') }}
            </router-link>
            {{ t('auth.privacyConsentCheckboxSuffix') }}
          </label>
        </div>
        <p v-if="shouldShowError('privacyAccepted', isSubmitted)" class="text-xs text-destructive">
          {{ getFieldError('privacyAccepted') }}
        </p>

        <Button
          type="submit"
          variant="outline"
          class="w-full"
          :disabled="isLoading"
        >
          {{ isLoading ? t('auth.registering') : t('auth.completeSsoSubmit') }}
        </Button>
      </form>

      <p v-else class="text-muted-foreground text-center">
        {{ t('common.loading') }}
      </p>
    </div>
  </AuthLayout>
</template>
