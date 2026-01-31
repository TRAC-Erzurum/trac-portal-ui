<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <img src="/logo-s.svg" alt="TRAC" class="h-10 w-auto" />
        <div class="flex items-center gap-2">
          <Button variant="ghost" @click="$router.push('/login')">{{ t('auth.login') }}</Button>
          <Button @click="$router.push('/register')">{{ t('auth.register') }}</Button>
        </div>
      </div>
    </header>

    <main class="flex-1 pt-16">
      <section class="container mx-auto px-4 py-24 md:py-32 lg:py-40">
        <div class="max-w-5xl">
          <p class="text-primary font-medium mb-6 tracking-wide">
            {{ t('brand.tracFullUpper') }} <span class="block md:inline">{{ t('brand.erzurumBranchUpper') }}</span>
          </p>
          
          <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-[1.1] tracking-tight">
            {{ t('brand.portalTitle') }}
          </h1>
          
          <p class="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            {{ t('landing.heroDescription') }}
          </p>

          <div class="flex flex-col sm:flex-row gap-4">
            <Button size="lg" class="text-base px-8 h-12" @click="$router.push('/register')">
              {{ t('auth.register') }}
            </Button>
            <Button size="lg" variant="outline" class="text-base px-8 h-12" @click="$router.push('/login')">
              {{ t('auth.login') }}
            </Button>
          </div>
        </div>
      </section>

      <section class="border-t border-border/40">
        <div class="container mx-auto px-4 py-16 md:py-20">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div>
              <div class="text-3xl md:text-4xl font-bold mb-1">500+</div>
              <div class="text-muted-foreground">{{ t('landing.stats.operators') }}</div>
            </div>
            <div>
              <div class="text-3xl md:text-4xl font-bold mb-1">1,000+</div>
              <div class="text-muted-foreground">{{ t('landing.stats.activities') }}</div>
            </div>
            <div>
              <div class="text-3xl md:text-4xl font-bold mb-1">10,000+</div>
              <div class="text-muted-foreground">{{ t('landing.stats.participations') }}</div>
            </div>
            <div>
              <div class="text-3xl md:text-4xl font-bold mb-1">40+</div>
              <div class="text-muted-foreground">{{ t('landing.stats.cities') }}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-border/40 bg-muted/30">
        <div class="container mx-auto px-4 py-20 md:py-24">
          <div class="max-w-5xl">
            <h2 class="text-2xl md:text-3xl font-bold mb-12">
              {{ t('landing.features.title') }}
            </h2>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.activityTracking') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.activityTrackingDesc') }}
                </p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.statistics') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.statisticsDesc') }}
                </p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.operatorDirectory') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.operatorDirectoryDesc') }}
                </p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.leaderboards') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.leaderboardsDesc') }}
                </p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.reporting') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.reportingDesc') }}
                </p>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-2">{{ t('landing.features.mobile') }}</h3>
                <p class="text-muted-foreground leading-relaxed">
                  {{ t('landing.features.mobileDesc') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="border-t border-border/40">
        <div class="container mx-auto px-4 py-20 md:py-24">
          <div class="max-w-2xl">
            <h2 class="text-2xl md:text-3xl font-bold mb-4">
              {{ t('landing.cta.title') }}
            </h2>
            <p class="text-muted-foreground text-lg mb-8">
              {{ t('landing.cta.description') }}
            </p>
            <Button size="lg" class="text-base px-8 h-12" @click="$router.push('/register')">
              {{ t('auth.register') }}
            </Button>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-border/40">
      <div class="container mx-auto px-4 py-8 md:py-12">
        <div class="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div class="flex items-center gap-3 mb-4">
              <img src="/logo-s.svg" alt="TRAC" class="h-8 w-auto" />
              <span class="font-semibold">{{ t('brand.tracPortal') }}</span>
            </div>
            <p class="text-sm text-muted-foreground max-w-sm">
              {{ t('brand.developedBy') }}
            </p>
          </div>
          
          <div class="flex gap-12">
            <div>
              <h4 class="font-medium mb-3 text-sm">{{ t('landing.footer.platform') }}</h4>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li><router-link to="/login" class="hover:text-foreground transition-colors">{{ t('auth.login') }}</router-link></li>
                <li><router-link to="/register" class="hover:text-foreground transition-colors">{{ t('auth.register') }}</router-link></li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium mb-3 text-sm">{{ t('landing.footer.links') }}</h4>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://trac.org.tr" target="_blank" rel="noopener" class="hover:text-foreground transition-colors">TRAC</a></li>
                <li><router-link to="/privacy" class="hover:text-foreground transition-colors">{{ t('auth.privacyLink') }}</router-link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="border-t border-border/40 mt-8 pt-6 flex justify-between items-center text-sm text-muted-foreground">
          <p>© {{ new Date().getFullYear() }} {{ t('brand.tracPortal') }}</p>
          <p>73</p>
        </div>
      </div>
    </footer>
  </div>
</template>
