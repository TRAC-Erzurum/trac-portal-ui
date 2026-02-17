<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Info } from 'lucide-vue-next'
import { PopoverContent, PopoverRoot, PopoverTrigger } from 'reka-ui'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import Captcha from '@/components/Captcha.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { LocatorMapPicker } from '@/components/shared'
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
const city = ref('')
const district = ref('')
const gridSquare = ref('')
const privacyAccepted = ref<boolean>(false)
const captchaToken = ref('')
const captchaRef = ref<InstanceType<typeof Captcha>>()
const isLoading = ref(false)
const branches = ref<Branch[]>([])
const branchesLoading = ref(true)
const selectedBranchIds = ref<string[]>([])

const locatorSelection = computed({
  get() {
    if (!gridSquare.value?.trim() && !city.value?.trim() && !district.value?.trim()) return null
    return {
      gridSquare: gridSquare.value?.trim()?.toUpperCase() ?? '',
      city: city.value?.trim() ?? '',
      district: district.value?.trim() ?? ''
    }
  },
  set(val: { gridSquare: string; city: string; district: string } | null) {
    if (!val) {
      city.value = ''
      district.value = ''
      gridSquare.value = ''
      return
    }
    city.value = val.city
    district.value = val.district
    gridSquare.value = val.gridSquare
  }
})

const headquartersId = computed(() => branches.value.find((b) => b.isHeadquarters)?.id ?? null)

function toggleBranch(branchId: string) {
  if (branchId === headquartersId.value) return
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
    const res = await api.get<{ data: Branch[]; total: number }>('/auth/branches')
    const data = res.data ?? []
    branches.value = [...data].sort((a, b) => (b.isHeadquarters ? 1 : 0) - (a.isHeadquarters ? 1 : 0))
    const hq = branches.value.find((b) => b.isHeadquarters)
    if (hq && !selectedBranchIds.value.includes(hq.id)) {
      selectedBranchIds.value = [hq.id, ...selectedBranchIds.value.filter((id) => id !== hq.id)]
    }
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
      country: (city.value || '').trim() ? t('form.country') : undefined,
      gridSquare: (gridSquare.value || '').trim() ? gridSquare.value.trim().toUpperCase() : undefined,
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
            <Label class="text-xs text-muted-foreground">{{ t('auth.branchSelection') }}</Label>
            <PopoverRoot>
              <PopoverTrigger
                type="button"
                class="inline-flex items-center justify-center rounded-full border border-border bg-muted/50 w-5 h-5 text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
                :aria-label="t('auth.whatIsBranch')"
              >
                <Info class="h-3 w-3" />
              </PopoverTrigger>
              <PopoverContent
                class="z-50 max-w-xs rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                :side-offset="6"
              >
                <p class="text-xs text-muted-foreground">{{ t('auth.whatIsBranch') }}</p>
              </PopoverContent>
            </PopoverRoot>
          </div>
          <div v-if="branchesLoading" class="text-sm text-muted-foreground py-2">{{ t('common.loading') }}</div>
          <div v-else class="border border-border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            <label
              v-for="b in branches"
              :key="b.id"
              :class="[
                'flex items-center gap-2 rounded px-2 py-1.5 -mx-2 -my-1.5',
                b.isHeadquarters ? 'cursor-default opacity-90' : 'cursor-pointer hover:bg-muted/50'
              ]"
            >
              <input
                type="checkbox"
                :checked="b.isHeadquarters || selectedBranchIds.includes(b.id)"
                :disabled="b.isHeadquarters"
                class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background disabled:opacity-70"
                @change="toggleBranch(b.id)"
              />
              <span class="font-medium">{{ b.name }}</span>
              <span v-if="b.isHeadquarters" class="text-xs text-muted-foreground ml-1">({{ t('branches.headquarters') }})</span>
            </label>
          </div>
        </div>

        <div class="space-y-2">
          <Label>{{ t('profile.qth') }}</Label>
          <LocatorMapPicker
            v-model="locatorSelection"
            :standalone="false"
          />
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
