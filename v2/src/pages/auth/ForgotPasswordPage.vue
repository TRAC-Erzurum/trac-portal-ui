<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  <div class="min-h-screen flex">
    <div class="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
      <div class="max-w-md text-center">
        <router-link to="/"><img src="/logo-s.svg" alt="TRAC" class="h-20 w-auto mx-auto mb-6" /></router-link>
        <h1 class="text-4xl font-bold mb-4">{{ t('brand.portalTitle') }}</h1>
        <p class="text-lg text-muted-foreground">
          {{ t('brand.tracFull') }}<br>
          {{ t('brand.erzurumBranch') }}
        </p>
        <div class="mt-8 text-8xl font-bold text-primary/10">
          73
        </div>
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8">
      <Card class="w-full max-w-md">
        <CardHeader class="text-center">
          <router-link to="/"><img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-4" /></router-link>
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
    </div>
  </div>
</template>
