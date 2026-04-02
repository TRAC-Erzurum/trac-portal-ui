<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Bug, HelpCircle, Lock, Paperclip, Sparkles, Wrench } from 'lucide-vue-next'
import Captcha from '@/components/Captcha.vue'
import FeedbackMarkdownField from '@/components/feedback/FeedbackMarkdownField.vue'
import { GithubMarkIcon } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useFeedbackStore,
  type FeedbackCategoryUi,
} from '@/stores/feedback'
import { useAppVersion } from '@/composables'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const feedbackStore = useFeedbackStore()
const { githubIssuesUrl, githubRepoUrl } = useAppVersion()

const captchaToken = ref('')
const isSubmitting = ref(false)

const githubHref = computed(
  () => githubIssuesUrl.value || githubRepoUrl.value || '',
)

const categoryItems: {
  value: FeedbackCategoryUi
  icon: typeof Bug
}[] = [
  { value: 'bug', icon: Bug },
  { value: 'enhancement', icon: Sparkles },
  { value: 'improvement', icon: Wrench },
  { value: 'question', icon: HelpCircle },
  { value: 'security', icon: Lock },
]

const attachments = ref<File[]>([])

watch(
  () => feedbackStore.sheetOpen,
  (open) => {
    if (open) {
      captchaToken.value = ''
      attachments.value = []
    }
  },
)

function onFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  const list = input.files ? Array.from(input.files) : []
  const next = [...attachments.value, ...list].slice(0, 3)
  attachments.value = next
  input.value = ''
}

function removeAttachment(i: number) {
  attachments.value = attachments.value.filter((_, idx) => idx !== i)
}

async function submit() {
  if (isSubmitting.value || !feedbackStore.category) return
  isSubmitting.value = true
  try {
    const fd = new FormData()
    fd.append('category', feedbackStore.category)
    fd.append('summary', feedbackStore.summary.trim())
    fd.append('body', feedbackStore.body.trim())
    fd.append('captchaToken', captchaToken.value)
    for (const f of attachments.value) {
      fd.append('attachments', f)
    }
    await api.post<{ success: boolean; issueUrl: string }>('/feedback', fd)
    toast.success(t('feedback.submitted'))
    feedbackStore.closeSheet()
  } catch {
    toast.error(t('error.serverError'))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Sheet
    :open="feedbackStore.sheetOpen"
    @update:open="feedbackStore.setSheetOpen"
  >
    <SheetContent
      side="right"
      class="flex h-full min-h-0 w-full flex-col gap-0 px-4 pt-2 pb-0 sm:max-w-xl sm:px-6"
    >
      <SheetHeader class="shrink-0 text-left space-y-1.5 pr-8">
        <SheetTitle>{{ t('feedback.sheetTitle') }}</SheetTitle>
        <p class="text-sm text-muted-foreground leading-relaxed">
          {{ t('feedback.intro') }}
          <a
            v-if="githubHref"
            :href="githubHref"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline ml-1"
          >
            <GithubMarkIcon class="h-3.5 w-3.5 shrink-0" />
            {{ t('feedback.openOnGithub') }}
          </a>
        </p>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain py-5 flex flex-col gap-6">
        <div>
          <p id="fb-category-label" class="mb-2 text-xs text-muted-foreground">
            {{ t('feedback.categoryLabel') }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </p>
          <div
            class="grid grid-cols-1 gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-labelledby="fb-category-label"
            aria-required="true"
          >
            <button
              v-for="item in categoryItems"
              :key="item.value"
              type="button"
              role="radio"
              :aria-checked="feedbackStore.category === item.value"
              :class="cn(
                'flex items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                feedbackStore.category === item.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40',
              )"
              @click="feedbackStore.category = item.value"
            >
              <component :is="item.icon" class="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span class="text-sm">
                <span class="font-medium block">{{ t(`feedback.categories.${item.value}.title`) }}</span>
                <span class="text-xs text-muted-foreground block mt-0.5">
                  {{ t(`feedback.categories.${item.value}.hint`) }}
                </span>
              </span>
            </button>
          </div>
          <p
            v-if="!feedbackStore.category"
            class="mt-2 text-xs text-muted-foreground"
            role="status"
          >
            {{ t('feedback.categoryRequiredHint') }}
          </p>
        </div>

        <div
          v-if="feedbackStore.category === 'security'"
          class="text-xs text-amber-700 dark:text-amber-400 border border-amber-500/40 rounded-md p-3 bg-amber-500/5"
          role="status"
        >
          {{ t('feedback.securityWarning') }}
        </div>

        <div class="space-y-2">
          <Label for="fb-summary">{{ t('feedback.summaryLabel') }}</Label>
          <Input
            id="fb-summary"
            v-model="feedbackStore.summary"
            maxlength="120"
            :placeholder="t('feedback.summaryPlaceholder')"
          />
        </div>

        <FeedbackMarkdownField
          v-model="feedbackStore.body"
          input-id="fb-body"
          :label="t('feedback.bodyLabel')"
          :placeholder="t('feedback.bodyPlaceholder')"
        >
          <template #footer>
            <div class="px-3 py-2">
              <label
                for="fb-files"
                class="flex cursor-pointer items-center gap-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Paperclip class="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                <span>{{ t('feedback.attachFilesHint') }}</span>
              </label>
              <input
                id="fb-files"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                class="sr-only"
                :aria-label="t('feedback.attachmentsLabel')"
                @change="onFilesChange"
              />
              <ul
                v-if="attachments.length"
                class="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-xs text-muted-foreground"
              >
                <li
                  v-for="(f, i) in attachments"
                  :key="i"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="min-w-0 truncate">{{ f.name }}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="shrink-0"
                    @click="removeAttachment(i)"
                  >
                    {{ t('feedback.removeFile') }}
                  </Button>
                </li>
              </ul>
            </div>
          </template>
        </FeedbackMarkdownField>

        <Captcha v-model="captchaToken" />
      </div>

      <SheetFooter
        class="mt-0 shrink-0 flex-col gap-2 border-t border-border px-0 pt-4 sm:flex-row sm:justify-end sm:gap-2 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          @click="feedbackStore.closeSheet()"
        >
          {{ t('common.cancel') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          class="w-full sm:w-auto"
          :disabled="isSubmitting || !feedbackStore.category || !feedbackStore.summary.trim() || !feedbackStore.body.trim()"
          @click="submit"
        >
          {{ t('feedback.submit') }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
