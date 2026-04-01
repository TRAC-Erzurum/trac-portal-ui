<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCookieConsentStore } from '@/stores/cookieConsent'
import type { CookieConsentStatus } from '@/stores/cookieConsent'

const { t, tm } = useI18n()
const router = useRouter()
const cookieStore = useCookieConsentStore()

function currentChoiceLabel(status: CookieConsentStatus): string {
  if (status === 'all') return t('cookies.allowAll')
  if (status === 'necessary') return t('cookies.allowNecessary')
  return t('privacy.cookiePreference.notSet')
}

const handleBack = () => {
  if (window.history.state && window.history.state.back) {
    router.back()
  } else {
    router.push('/register')
  }
}

const getSectionItems = (section: string) => {
  const items = tm(`privacy.sections.${section}`) as Record<string, string>
  if (!items) return {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { title, ...rest } = items
  return rest
}
</script>

<template>
  <div class="min-h-screen p-8 bg-background">
    <div class="max-w-3xl mx-auto">
      <Button variant="outline" size="sm" class="mb-6 gap-2" @click="handleBack">
        <ArrowLeft class="size-4" />
        {{ t('common.back') }}
      </Button>

      <h1 class="text-2xl font-semibold text-foreground pt-4">
        {{ t('privacy.title') }}
      </h1>
      <p class="leading-relaxed text-muted-foreground mt-4">
        {{ t('privacy.intro') }}
      </p>

      <div v-for="section in ['data', 'retention', 'purpose', 'visibility', 'rights', 'githubFeedback', 'cookies']" :key="section">
        <Separator class="my-8" />
        <h3 class="text-xl font-semibold mb-3 text-foreground">
          {{ t(`privacy.sections.${section}.title`) }}
        </h3>
        <ul class="space-y-3 list-none pl-0">
          <li v-for="(_, itemKey) in getSectionItems(section)" :key="itemKey" class="flex gap-3">
            <span class="text-primary/70 mt-1"></span>
            <span class="text-muted-foreground leading-relaxed">
              {{ t(`privacy.sections.${section}.${itemKey}`) }}
            </span>
          </li>
        </ul>
        <div v-if="section === 'cookies'" class="mt-6 p-4 rounded-lg border border-border bg-muted/20">
          <p class="text-sm font-medium text-muted-foreground mb-3">
            {{ t('privacy.cookiePreference.yourChoice') }}
          </p>
          <p class="font-medium mb-4">
            {{ currentChoiceLabel(cookieStore.status) }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="cookieStore.status !== 'necessary'"
              variant="outline"
              size="sm"
              @click="cookieStore.allowNecessary()"
            >
              {{ t('privacy.cookiePreference.changeToNecessary') }}
            </Button>
            <Button
              v-if="cookieStore.status !== 'all'"
              variant="outline"
              size="sm"
              @click="cookieStore.allowAll()"
            >
              {{ t('privacy.cookiePreference.changeToAll') }}
            </Button>
            <Button
              v-if="cookieStore.isAccepted"
              variant="outline"
              size="sm"
              @click="cookieStore.revokeConsent()"
            >
              {{ t('privacy.cookiePreference.revoke') }}
            </Button>
          </div>
        </div>
      </div>

      <Separator class="my-8" />
      <h3 class="text-xl font-semibold mb-3 text-foreground">
        {{ t('privacy.sections.contact.title') }}
      </h3>
      <div class="bg-muted/30 p-4 rounded-lg border border-border/50">
        <p class="text-muted-foreground">{{ t('privacy.sections.contact.text') }}</p>
      </div>
    </div>
  </div>
</template>
