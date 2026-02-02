<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Captcha from '@/components/Captcha.vue'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import type { ApiError } from '@/lib/api'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const callSign = ref('')
const password = ref('')
const captchaToken = ref('')
const captchaRef = ref<InstanceType<typeof Captcha>>()
const isLoading = ref(false)

async function handleSubmit() {
  if (captchaRef.value?.isEnabled && !captchaToken.value) {
    toast.error(t('error.pleaseWaitForCaptcha'))
    return
  }
  
  isLoading.value = true
  try {
    const response = await authStore.login(callSign.value, password.value, captchaToken.value || undefined)
    
    if (response.isTemporaryPassword) {
      router.push('/change-password')
    } else {
      toast.success(t('auth.loginSuccess'))
      const redirect = route.query.redirect as string
      router.push(redirect || '/dashboard')
    }
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

function handleGoogleLogin() {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
}
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-2xl font-bold">{{ t('auth.login') }}</h1>
        <p class="text-muted-foreground mt-1 hidden sm:block">{{ t('auth.loginSubtitle') }}</p>
      </div>

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
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="password">{{ t('form.password') }}</Label>
            <router-link to="/forgot-password" class="text-sm text-primary hover:underline">
              {{ t('auth.forgotPassword') }}
            </router-link>
          </div>
          <PasswordInput 
            id="password" 
            v-model="password"
            placeholder="••••••••" 
            required
          />
        </div>
        
        <Captcha ref="captchaRef" v-model="captchaToken" />

        <Button type="submit" class="w-full" :disabled="isLoading || (captchaRef?.isEnabled && !captchaToken)">
          {{ isLoading ? t('auth.loggingIn') : t('auth.login') }}
        </Button>
      </form>

      <div class="relative my-6 flex items-center">
        <div class="flex-1 border-t border-border"></div>
        <span class="px-4 text-sm text-muted-foreground">{{ t('auth.or') }}</span>
        <div class="flex-1 border-t border-border"></div>
      </div>

      <Button variant="outline" class="w-full" @click="handleGoogleLogin">
        <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {{ t('auth.loginWithGoogle') }}
      </Button>
      
      <div class="mt-6 text-center text-sm text-muted-foreground">
        {{ t('auth.noAccount') }}
        <router-link to="/register" class="text-primary hover:underline font-medium ml-1">
          {{ t('auth.register') }}
        </router-link>
      </div>

      <p class="mt-4 text-center text-xs text-muted-foreground">
        {{ t('auth.privacyConsentPrefix') }}
        <router-link to="/privacy" class="text-primary hover:underline">{{ t('auth.privacyLink') }}</router-link>
        {{ t('auth.privacyConsentSuffix') }}
      </p>
    </div>
  </AuthLayout>
</template>
