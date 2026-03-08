<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCookieConsentStore } from '@/stores/cookieConsent'
import { Button } from '@/components/ui/button'
import { Cookie } from 'lucide-vue-next'

const { t } = useI18n()
const store = useCookieConsentStore()

function handleAllowAll() {
  store.allowAll()
}

function handleAllowNecessary() {
  store.allowNecessary()
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="!store.isAccepted"
      class="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-background/95 backdrop-blur-sm border-t shadow-2xl safe-area-pb"
    >
      <div class="container max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between">
        <div class="flex items-start gap-4">
          <div class="p-2 bg-primary/10 rounded-full hidden md:block">
            <Cookie class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="font-bold text-lg leading-tight mb-1">
              {{ t('cookies.title') }}
            </h3>
            <p class="text-sm text-muted-foreground max-w-3xl">
              {{ t('cookies.description') }}
              <router-link to="/privacy" class="text-primary hover:underline font-medium ml-1">
                {{ t('cookies.privacyPolicy') }}
              </router-link>
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            class="flex-1 sm:flex-none order-2 sm:order-1"
            @click="handleAllowNecessary"
          >
            {{ t('cookies.allowNecessary') }}
          </Button>
          <Button
            size="sm"
            class="flex-1 sm:flex-none order-1 sm:order-2"
            @click="handleAllowAll"
          >
            {{ t('cookies.allowAll') }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.safe-area-pb {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}
</style>
