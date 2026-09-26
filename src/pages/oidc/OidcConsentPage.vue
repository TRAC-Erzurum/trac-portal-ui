<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ShieldCheck, ShieldX } from 'lucide-vue-next'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { Button } from '@/components/ui/button'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import type { OidcClaim, OidcConsentContext, OidcRedirect } from '@/types/oidc'

const { t } = useI18n()
const route = useRoute()

const isLoading = ref(true)
const isSubmitting = ref(false)
const isRedirecting = ref(false)
const errorMessage = ref<string | null>(null)
const clientName = ref('')
const claims = ref<OidcClaim[]>([])

/** The original authorization request, forwarded untouched to the API. */
const authorizationRequest = computed(() => {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(route.query)) {
    if (typeof value === 'string') params[key] = value
  }
  return params
})

function leaveTo(url: string) {
  isRedirecting.value = true
  window.location.replace(url)
}

function showError(e: unknown) {
  errorMessage.value = translateError((e as ApiError).message)
}

async function loadContext() {
  isLoading.value = true
  try {
    const context = await api.post<OidcConsentContext>('/oidc/consent/context', authorizationRequest.value)
    if (!context.consentRequired) {
      leaveTo(context.redirectTo)
      return
    }
    clientName.value = context.clientName
    claims.value = context.claims
  } catch (e) {
    showError(e)
  } finally {
    isLoading.value = false
  }
}

async function decide(decision: 'approve' | 'deny') {
  isSubmitting.value = true
  try {
    const { redirectTo } = await api.post<OidcRedirect>(`/oidc/consent/${decision}`, authorizationRequest.value)
    leaveTo(redirectTo)
  } catch (e) {
    toast.error(translateError((e as ApiError).message))
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadContext)
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-sm">
      <div class="text-center mb-6">
        <img src="/logo-s.svg" alt="TRAC" class="lg:hidden h-12 w-auto mx-auto mb-6" />
      </div>

      <p v-if="isLoading || isRedirecting" class="text-center text-muted-foreground" role="status">
        {{ isRedirecting ? t('oidc.consent.redirecting') : t('oidc.consent.loading') }}
      </p>

      <div v-else-if="errorMessage" class="text-center space-y-3">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10">
          <ShieldX class="h-7 w-7 text-destructive" />
        </div>
        <h1 class="text-xl font-bold">{{ t('oidc.consent.errorTitle') }}</h1>
        <p class="text-muted-foreground">{{ errorMessage }}</p>
      </div>

      <div v-else class="space-y-6">
        <div class="text-center space-y-3">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
            <ShieldCheck class="h-7 w-7 text-primary" />
          </div>
          <h1 class="text-xl font-bold break-words">{{ t('oidc.consent.heading', { client: clientName }) }}</h1>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t('oidc.consent.sharedFields') }}</p>
          <ul class="rounded-lg border border-border divide-y divide-border text-sm">
            <li v-for="claim in claims" :key="claim" class="px-3 py-2">
              {{ t(`oidc.consent.claims.${claim}`) }}
            </li>
          </ul>
          <p class="text-xs text-muted-foreground">{{ t('oidc.consent.notShared') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('oidc.consent.remembered') }}</p>
        </div>

        <div class="flex gap-3">
          <Button variant="outline" class="flex-1" :disabled="isSubmitting" @click="decide('deny')">
            {{ t('oidc.consent.deny') }}
          </Button>
          <Button class="flex-1" :disabled="isSubmitting" @click="decide('approve')">
            {{ t('oidc.consent.approve') }}
          </Button>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>
