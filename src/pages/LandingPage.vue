<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ArrowRight, MapPin, Radio, Signal, Users, Waves } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import LangToggle from '@/components/layout/LangToggle.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import { AppVersionBox } from '@/components/shared'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header class="sticky top-0 z-50 border-b border-border bg-background">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <router-link
          to="/"
          class="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        >
          <img src="/logo-s.svg" alt="TRAC" class="h-10 w-auto" />
        </router-link>
        <nav class="flex items-center gap-2" :aria-label="t('landing.footer.ariaMainNav')">
          <Button variant="outline" size="sm" @click="$router.push('/register')">
            {{ t('auth.register') }}
          </Button>
          <Button variant="outline" size="sm" @click="$router.push('/login')">
            {{ t('auth.login') }}
          </Button>
        </nav>
      </div>
    </header>

    <main>
      <section class="bg-muted/10 border-b border-border/50">
        <div class="container mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <div class="max-w-2xl">
          <p class="text-sm font-medium text-muted-foreground mb-2">
            {{ t('brand.tracFull') }} · {{ t('brand.erzurumBranch') }}
          </p>
          <h1 class="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {{ t('brand.portalTitle') }}
          </h1>
          <p class="text-muted-foreground leading-relaxed mb-8">
            {{ t('landing.heroDescription') }}
          </p>
          <div class="flex flex-wrap gap-3">
            <Button variant="outline" size="lg" @click="$router.push('/register')">
              {{ t('auth.register') }}
            </Button>
            <Button variant="outline" size="lg" @click="$router.push('/login')">
              {{ t('auth.login') }}
            </Button>
          </div>
          </div>
        </div>
      </section>

      <section class="bg-muted/20 border-b border-border/50">
        <div class="container mx-auto px-4 py-10 md:py-14">
          <h2 class="text-sm font-medium text-muted-foreground mb-8">
            {{ t('landing.howItWorks.title') }}
          </h2>
          <ol class="grid gap-6 sm:grid-cols-3 list-none pl-0">
            <li class="flex gap-4 p-6 rounded-lg border border-border/50 bg-background/60">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-lg font-semibold text-foreground"
                aria-hidden="true"
              >
                1
              </span>
              <div class="min-w-0">
                <p class="font-medium text-foreground mb-1.5">{{ t('landing.howItWorks.step1') }}</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  {{ t('landing.howItWorks.step1Desc') }}
                </p>
              </div>
            </li>
            <li class="flex gap-4 p-6 rounded-lg border border-border/50 bg-background/60">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-lg font-semibold text-foreground"
                aria-hidden="true"
              >
                2
              </span>
              <div class="min-w-0">
                <p class="font-medium text-foreground mb-1.5">{{ t('landing.howItWorks.step2') }}</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  {{ t('landing.howItWorks.step2Desc') }}
                </p>
              </div>
            </li>
            <li class="flex gap-4 p-6 rounded-lg border border-border/50 bg-background/60">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-lg font-semibold text-foreground"
                aria-hidden="true"
              >
                3
              </span>
              <div class="min-w-0">
                <p class="font-medium text-foreground mb-1.5">{{ t('landing.howItWorks.step3') }}</p>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  {{ t('landing.howItWorks.step3Desc') }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section class="border-b border-border/50">
        <div class="container mx-auto px-4 py-10 md:py-14">
          <h2 class="text-sm font-medium text-muted-foreground mb-8">
            {{ t('landing.whatsHere.title') }}
          </h2>
          <ul class="space-y-0 list-none pl-0">
            <!-- 1: görsel sol, metin sağ - çevrimler / mic + el telsizi -->
            <li class="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 py-8 md:py-12 border-b border-border first:pt-0 last:border-b-0 odd:bg-muted/10 even:bg-transparent">
            <div class="md:w-2/5 flex justify-center md:justify-start shrink-0">
              <div class="relative flex h-40 w-40 md:h-48 md:w-48 items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground" aria-hidden="true">
                <!-- El telsizi silüeti (ön görünüm, anten sağda) -->
                <svg class="h-24 w-24 md:h-28 md:w-28 text-muted-foreground" viewBox="0 0 44 76" fill="currentColor" aria-hidden="true">
                  <!-- Gövde -->
                  <rect x="6" y="20" width="32" height="52" rx="8" ry="8" />
                  <!-- Anten (sağ üst) -->
                  <rect x="30" y="12" width="8" height="10" rx="2" />
                  <rect x="31" y="4" width="6" height="10" rx="1" />
                  <circle cx="34" cy="2" r="2" />
                  <!-- Hoparlör ızgarası (sol/orta) -->
                  <rect x="8" y="24" width="20" height="2" rx="0.5" opacity="0.85" />
                  <rect x="8" y="28" width="20" height="2" rx="0.5" opacity="0.85" />
                  <rect x="8" y="32" width="20" height="2" rx="0.5" opacity="0.85" />
                  <rect x="8" y="36" width="20" height="2" rx="0.5" opacity="0.85" />
                  <rect x="8" y="40" width="18" height="2" rx="0.5" opacity="0.75" />
                  <!-- Ekran -->
                  <rect x="8" y="46" width="22" height="10" rx="2" opacity="0.45" />
                  <!-- Tuş takımı (4x3) -->
                  <rect x="9" y="58" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="14" y="58" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="19" y="58" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="24" y="58" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="9" y="63" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="14" y="63" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="19" y="63" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="24" y="63" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="9" y="68" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="14" y="68" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="19" y="68" width="4" height="4" rx="0.8" opacity="0.7" />
                  <rect x="24" y="68" width="4" height="4" rx="0.8" opacity="0.7" />
                  <!-- PTT (sol kenar) -->
                  <rect x="2" y="44" width="5" height="18" rx="2" opacity="0.9" />
                </svg>
                <Waves class="absolute bottom-3 right-3 h-6 w-6 md:h-8 md:w-8 opacity-60" />
              </div>
            </div>
            <div class="md:w-3/5 flex flex-col justify-center gap-4 min-w-0">
              <h3 class="text-xl font-semibold">{{ t('landing.whatsHere.nets') }}</h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ t('landing.whatsHere.netsDesc') }}
              </p>
              <Button variant="outline" size="sm" class="w-fit" @click="$router.push('/login')">
                <ArrowRight class="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                {{ t('auth.login') }}
              </Button>
            </div>
          </li>
            <!-- 2: metin sol, görsel sağ - QTH harita -->
            <li class="flex flex-col md:flex-row-reverse md:items-center gap-6 md:gap-10 py-8 md:py-12 border-b border-border last:border-b-0 odd:bg-muted/10 even:bg-transparent">
            <div class="md:w-2/5 flex justify-center md:justify-end shrink-0">
              <div class="flex h-40 w-40 md:h-48 md:w-48 items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground" aria-hidden="true">
                <MapPin class="h-20 w-20 md:h-24 md:w-24" />
              </div>
            </div>
            <div class="md:w-3/5 flex flex-col justify-center gap-4 md:text-left min-w-0">
              <h3 class="text-xl font-semibold">{{ t('landing.whatsHere.map') }}</h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ t('landing.whatsHere.mapDesc') }}
              </p>
              <Button
                variant="outline"
                size="sm"
                class="w-fit border-primary text-primary hover:bg-primary/10 hover:text-primary"
                @click="$router.push('/map')"
              >
                <ArrowRight class="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                {{ t('landing.qth.cta') }}
              </Button>
            </div>
          </li>
            <!-- 3: görsel sol, metin sağ - röle / radio + signal -->
            <li class="flex flex-col md:flex-row md:items-center gap-6 md:gap-10 py-8 md:py-12 border-b border-border last:border-b-0 odd:bg-muted/10 even:bg-transparent">
            <div class="md:w-2/5 flex justify-center md:justify-start shrink-0">
              <div class="relative flex h-40 w-40 md:h-48 md:w-48 items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground" aria-hidden="true">
                <Radio class="h-20 w-20 md:h-24 md:w-24" />
                <Signal class="absolute top-4 right-4 h-8 w-8 md:h-10 md:w-10 opacity-70" />
              </div>
            </div>
            <div class="md:w-3/5 flex flex-col justify-center gap-4 min-w-0">
              <h3 class="text-xl font-semibold">{{ t('landing.whatsHere.channels') }}</h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ t('landing.whatsHere.channelsDesc') }}
              </p>
              <Button
                variant="outline"
                size="sm"
                class="w-fit border-primary text-primary hover:bg-primary/10 hover:text-primary"
                @click="$router.push('/communication-channels')"
              >
                <ArrowRight class="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                {{ t('landing.heroChannelsLink') }}
              </Button>
            </div>
          </li>
            <!-- 4: metin sol, görsel sağ - operatörler -->
            <li class="flex flex-col md:flex-row-reverse md:items-center gap-6 md:gap-10 py-8 md:py-12 border-b border-border last:border-b-0 odd:bg-muted/10 even:bg-transparent">
            <div class="md:w-2/5 flex justify-center md:justify-end shrink-0">
              <div class="flex h-40 w-40 md:h-48 md:w-48 items-center justify-center rounded-xl bg-muted/50 border border-border text-muted-foreground" aria-hidden="true">
                <Users class="h-20 w-20 md:h-24 md:w-24" />
              </div>
            </div>
            <div class="md:w-3/5 flex flex-col justify-center gap-4 md:text-left min-w-0">
              <h3 class="text-xl font-semibold">{{ t('landing.whatsHere.community') }}</h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ t('landing.whatsHere.communityDesc') }}
              </p>
              <Button variant="outline" size="sm" class="w-fit" @click="$router.push('/login')">
                <ArrowRight class="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                {{ t('auth.login') }}
              </Button>
            </div>
          </li>
          </ul>
        </div>
      </section>

      <section class="bg-muted/20 border-b border-border/50">
        <div class="container mx-auto px-4 py-10 md:py-14">
          <h2 class="text-lg font-semibold mb-2">
            {{ t('landing.cta.title') }}
          </h2>
          <p class="text-sm text-muted-foreground mb-6 max-w-xl">
            {{ t('landing.cta.line') }}
          </p>
          <Button variant="outline" size="lg" @click="$router.push('/register')">
            {{ t('auth.register') }}
          </Button>
        </div>
      </section>

      <footer class="border-t border-border bg-muted/30">
        <div class="container mx-auto px-4 py-10">
          <div class="flex flex-col md:flex-row justify-between gap-8">
            <div class="max-w-sm">
              <div class="flex items-center gap-3 mb-3">
                <img src="/logo-s.svg" alt="TRAC" class="h-8 w-auto" />
                <span class="font-semibold">{{ t('brand.erzurumBranch') }}</span>
              </div>
              <p class="text-sm text-muted-foreground leading-relaxed">
                {{ t('brand.developedBy') }}
              </p>
            </div>
            <nav class="flex gap-12" :aria-label="t('landing.footer.ariaFooterLinks')">
              <div>
                <h4 class="text-sm font-medium mb-3">{{ t('landing.footer.platform') }}</h4>
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li><router-link to="/register" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{{ t('auth.register') }}</router-link></li>
                  <li><router-link to="/login" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{{ t('auth.login') }}</router-link></li>
                  <li><router-link to="/map" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{{ t('landing.heroMapLink') }}</router-link></li>
                  <li><router-link to="/communication-channels" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{{ t('landing.heroChannelsLink') }}</router-link></li>
                </ul>
              </div>
              <div>
                <h4 class="text-sm font-medium mb-3">{{ t('landing.footer.links') }}</h4>
                <ul class="space-y-2 text-sm text-muted-foreground">
                  <li><a href="https://trac.org.tr" target="_blank" rel="noopener noreferrer" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">TRAC</a></li>
                  <li><router-link to="/privacy" class="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">{{ t('auth.privacyLink') }}</router-link></li>
                </ul>
              </div>
            </nav>
          </div>
          <div class="border-t border-border mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {{ new Date().getFullYear() }} {{ t('brand.erzurumBranch') }}</p>
            <div class="flex items-center gap-3">
              <ThemeToggle />
              <LangToggle />
              <AppVersionBox />
              <span aria-hidden="true">73!</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  </div>
</template>
