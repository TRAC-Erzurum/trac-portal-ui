<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Captcha from '@/components/Captcha.vue'
import { api, type ApiError } from '@/lib/api'
import { translateError } from '@/i18n'

const { t } = useI18n()

const callSign = ref('')
const captchaToken = ref('')
const captchaRef = ref<InstanceType<typeof Captcha>>()
const isLoading = ref(false)

async function handleSubmit() {
  if (!callSign.value.trim()) return
  if (captchaRef.value?.isEnabled && !captchaToken.value) return
  
  isLoading.value = true
  
  try {
    await api.post('/auth/password-reset-request', {
      callSign: callSign.value,
      captchaToken: captchaToken.value || undefined
    })
    toast.success(t('auth.passwordResetRequestSent'))
    callSign.value = ''
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
    <Card class="w-full max-w-md">
      <CardHeader class="text-center">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-4" />
        </router-link>
        <CardTitle class="text-2xl">{{ t('auth.forgotPasswordTitle') }}</CardTitle>
        <CardDescription class="hidden sm:block">
          {{ t('auth.forgotPasswordSubtitle') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <Label for="callSign">{{ t('form.callSign') }}</Label>
            <Input
              id="callSign"
              v-model="callSign"
              type="text"
              placeholder="TA9XXX"
              required
              class="uppercase"
              @input="callSign = callSign.toUpperCase()"
            />
          </div>

          <Captcha ref="captchaRef" v-model="captchaToken" />

          <Button type="submit" class="w-full" :disabled="isLoading || !callSign.trim() || (captchaRef?.isEnabled && !captchaToken)">
            {{ isLoading ? t('auth.sendingRequest') : t('auth.sendRequest') }}
          </Button>

          <div class="text-center text-sm text-muted-foreground">
            <RouterLink to="/login" class="text-primary hover:underline">
              {{ t('auth.backToLogin') }}
            </RouterLink>
          </div>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
