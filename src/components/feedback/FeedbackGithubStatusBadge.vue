<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn } from '@/lib/utils'
import type { FeedbackGithubStatus } from '@/types/feedback'

const props = defineProps<{
  status: FeedbackGithubStatus
  issueNumber?: number | null
  /** When set and the status is `sent`, the badge links to the GitHub issue (new tab). */
  issueUrl?: string | null
}>()

const { t } = useI18n()

const badgeClass = computed(() => {
  switch (props.status) {
    case 'sent':
      return 'bg-primary/10 text-primary'
    case 'failed':
      return 'bg-destructive/10 text-destructive'
    case 'pending':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
})

const linkHref = computed(() =>
  props.status === 'sent' && props.issueUrl ? props.issueUrl : null,
)
</script>

<template>
  <a
    v-if="linkHref"
    :href="linkHref"
    target="_blank"
    rel="noopener noreferrer"
    :class="cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      badgeClass,
    )"
  >
    {{ t(`feedback.admin.status.${status}`) }}<span v-if="issueNumber">#{{ issueNumber }}</span>
    <span class="sr-only">({{ t('feedback.admin.opensInNewTab') }})</span>
  </a>
  <span
    v-else
    :class="cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeClass)"
  >
    {{ t(`feedback.admin.status.${status}`) }}
  </span>
</template>
