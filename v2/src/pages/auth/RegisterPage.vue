<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Info } from 'lucide-vue-next'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Captcha from '@/components/Captcha.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import turkeyData from '@/data/turkey.json'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface Branch {
  id: string
  name: string
  type: string
  isHeadquarters: boolean
  isActive: boolean
  callSigns?: Array<{ callSign: string; isDefault: boolean }>
}

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const callSign = ref('')
const fullName = ref('')
const password = ref('')
const passwordConfirm = ref('')
const city = ref<string>()
const district = ref('')
const privacyAccepted = ref<boolean>(false)
const captchaToken = ref('')
const captchaRef = ref<InstanceType<typeof Captcha>>()
const isLoading = ref(false)
const branches = ref<Branch[]>([])
const branchesLoading = ref(true)
const selectedBranchIds = ref<string[]>([])

const cities = turkeyData.cities

function toggleBranch(branchId: string) {
  const idx = selectedBranchIds.value.indexOf(branchId)
  if (idx === -1) {
    selectedBranchIds.value = [...selectedBranchIds.value, branchId]
  } else {
    selectedBranchIds.value = selectedBranchIds.value.filter((id) => id !== branchId)
  }
}

function handleCallSignInput() {
  callSign.value = callSign.value.toUpperCase()
}

const isFormValid = computed(() => {
  const baseValid = email.value.trim() !== '' &&
         callSign.value.trim() !== '' &&
         password.value.length >= 6 &&
         passwordConfirm.value === password.value &&
         privacyAccepted.value === true &&
         selectedBranchIds.value.length >= 1
  if (captchaRef.value?.isEnabled) {
    return baseValid && captchaToken.value !== ''
  }
  return baseValid
})

async function loadBranches() {
  branchesLoading.value = true
  try {
    branches.value = await api.get<Branch[]>('/auth/branches')
  } catch {
    branches.value = []
  } finally {
    branchesLoading.value = false
  }
}

onMounted(loadBranches)

async function handleSubmit() {
  if (!isFormValid.value) return

  isLoading.value = true
  try {
    await authStore.register({
      email: email.value.trim(),
      callSign: callSign.value.trim(),
      password: password.value,
      branchIds: selectedBranchIds.value,
      fullName: (fullName.value || '').trim() || undefined,
      city: (city.value || '').trim() || undefined,
      district: (district.value || '').trim() || undefined,
      country: t('form.country'),
      captchaToken: captchaToken.value || undefined
    })
    toast.success(t('auth.registerSuccess'))
    router.push('/dashboard')
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
    <div class="w-full max-w-lg my-8">
      <div class="text-center mb-8">
        <router-link to="/">
          <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
        </router-link>
        <h1 class="text-2xl font-bold">{{ t('auth.register') }}</h1>
        <p class="text-muted-foreground mt-1 hidden sm:block">{{ t('auth.registerSubtitle') }}</p>
      </div>

      <Button variant="outline" class="w-full" @click="handleGoogleLogin">
        <svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {{ t('auth.registerWithGoogle') }}
      </Button>
      <p class="text-xs text-muted-foreground text-center mt-2 mb-2">
        {{ t('auth.privacyConsentRegisterPrefix') }}
        <router-link to="/privacy" target="_blank" class="text-primary hover:underline">{{ t('auth.privacyLink') }}</router-link>
        {{ t('auth.privacyConsentSuffix') }}
      </p>

      <div class="relative my-6 flex items-center">
        <div class="flex-1 border-t border-border"></div>
        <span class="px-4 text-sm text-muted-foreground">{{ t('auth.or') }}</span>
        <div class="flex-1 border-t border-border"></div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="email">{{ t('form.email') }} {{ t('form.required') }}</Label>
            <Input 
              id="email" 
              v-model="email"
              type="email" 
              :placeholder="t('form.emailPlaceholder')" 
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="callSign">{{ t('form.callSign') }} {{ t('form.required') }}</Label>
            <Input 
              id="callSign" 
              v-model="callSign"
              type="text" 
              placeholder="TA9XXX"
              @input="handleCallSignInput"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="password">{{ t('form.password') }} {{ t('form.required') }}</Label>
            <PasswordInput 
              id="password" 
              v-model="password"
              placeholder="••••••••" 
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="passwordConfirm">{{ t('form.passwordConfirm') }} {{ t('form.required') }}</Label>
            <PasswordInput 
              id="passwordConfirm" 
              v-model="passwordConfirm"
              placeholder="••••••••" 
              required
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="fullName">{{ t('form.fullName') }}</Label>
          <Input 
            id="fullName" 
            v-model="fullName"
            type="text" 
            placeholder=""
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label class="text-xs text-muted-foreground">{{ t('auth.branchSelection') }} {{ t('form.required') }}</Label>
            <span
              class="inline-flex items-center justify-center rounded-full border border-border bg-muted/50 w-5 h-5 text-muted-foreground cursor-help"
              :title="t('auth.whatIsBranch')"
            >
              <Info class="h-3 w-3" />
            </span>
          </div>
          <p class="text-xs text-muted-foreground mb-2">{{ t('auth.whatIsBranch') }}</p>
          <div v-if="branchesLoading" class="text-sm text-muted-foreground py-2">{{ t('common.loading') }}</div>
          <div v-else class="border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            <label
              v-for="b in branches"
              :key="b.id"
              class="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 -my-1.5"
            >
              <Checkbox
                :checked="selectedBranchIds.includes(b.id)"
                @update:checked="() => toggleBranch(b.id)"
              />
              <span class="font-medium">{{ b.name }}</span>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="city">{{ t('form.city') }}</Label>
            <Select v-model="city">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('form.cityPlaceholder')" />
              </SelectTrigger>
              <SelectContent class="max-h-60">
                <SelectItem v-for="c in cities" :key="c" :value="c">
                  {{ c }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="district">{{ t('form.district') }}</Label>
            <Input 
              id="district" 
              v-model="district"
              type="text" 
              placeholder=""
            />
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <input 
            id="privacy" 
            type="checkbox"
            v-model="privacyAccepted"
            class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background"
          />
          <label for="privacy" class="text-sm cursor-pointer select-none">
            {{ t('auth.privacyConsentCheckboxPrefix') }}
            <router-link to="/privacy" target="_blank" class="text-primary hover:underline" @click.stop>{{ t('auth.privacyLink') }}</router-link>
            {{ t('auth.privacyConsentCheckboxSuffix') }}
          </label>
        </div>

        <Captcha ref="captchaRef" v-model="captchaToken" />

        <Button type="submit" class="w-full" :disabled="!isFormValid || isLoading">
          {{ isLoading ? t('auth.registering') : t('auth.register') }}
        </Button>
      </form>
      
      <div class="mt-6 text-center text-sm text-muted-foreground">
        {{ t('auth.hasAccount') }}
        <router-link to="/login" class="text-primary hover:underline font-medium ml-1">
          {{ t('auth.login') }}
        </router-link>
      </div>
    </div>
  </AuthLayout>
</template>
