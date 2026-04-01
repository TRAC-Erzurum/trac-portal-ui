<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LangToggle from '@/components/layout/LangToggle.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import { AppVersionBox, GithubMarkIcon } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { useAppVersion } from '@/composables'

const { t } = useI18n()
const { githubRepoUrl } = useAppVersion()

const githubHref = computed(() => (githubRepoUrl.value ?? '').trim() || '')
</script>

<template>
  <footer class="border-t border-border/20 mt-6 pt-4 flex-shrink-0">
    <div class="flex justify-between items-center text-xs text-muted-foreground/80 gap-2 flex-wrap">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <AppVersionBox />
      </div>
      <p class="shrink-0">© {{ new Date().getFullYear() }} YM9KE
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <LangToggle class="hidden" />
        <Button
          v-if="githubHref"
          variant="outline"
          size="icon-sm"
          class="shrink-0"
          as-child
        >
          <a
            :href="githubHref"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('footer.githubProjectAria')"
          >
            <GithubMarkIcon class="h-3.5 w-3.5" />
          </a>
        </Button>
        <span>73!</span>
      </div>
    </div>
  </footer>
</template>
