<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const { t, tm } = useI18n()
const router = useRouter()

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
      
      <Card>
        <CardHeader>
          <CardTitle class="text-2xl pt-4">{{ t('privacy.title') }}</CardTitle>
        </CardHeader>
        <CardContent class="prose prose-invert max-w-none pt-2">
          <p class="leading-relaxed text-muted-foreground">
            {{ t('privacy.intro') }}
          </p>

          <div v-for="section in ['data', 'retention', 'purpose', 'visibility', 'rights']" :key="section" class="mt-8">
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
          </div>

          <div class="mt-10 pt-6 border-t border-border">
            <h3 class="text-xl font-semibold mb-3 text-foreground">
              {{ t('privacy.sections.contact.title') }}
            </h3>
            <div class="bg-muted/30 p-4 rounded-lg border border-border/50">
              <p class="text-muted-foreground">{{ t('privacy.sections.contact.text') }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
