<script setup lang="ts">
import { computed, nextTick, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
} from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import {
  applyHeadingToFirstLine,
  applyLineBlockTransform,
  bulletListLines,
  insertAtCursor,
  insertLink,
  insertWrap,
  numberedListLines,
  quoteLines,
} from '@/lib/feedback-editor'
import { renderFeedbackMarkdown } from '@/lib/feedback-markdown'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string
  label: string
  placeholder: string
  inputId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()
const slots = useSlots()

const panel = ref<'write' | 'preview'>('write')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const previewHtml = computed(() => renderFeedbackMarkdown(props.modelValue))

const isEmptyPreview = computed(() => !props.modelValue.trim())

const toolBtnClass =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50'

function focusTextarea(start: number, end: number) {
  nextTick(() => {
    const el = textareaRef.value
    if (!el) return
    el.focus()
    const len = el.value.length
    el.setSelectionRange(Math.min(start, len), Math.min(end, len))
  })
}

function applyEdit(next: string, focusStart: number, focusEnd: number) {
  emit('update:modelValue', next)
  focusTextarea(focusStart, focusEnd)
}

function onToolbar(fn: () => void) {
  if (panel.value !== 'write') {
    panel.value = 'write'
    nextTick(() => fn())
    return
  }
  fn()
}

function doWrap(before: string, after: string) {
  const el = textareaRef.value
  const text = props.modelValue
  const start = el?.selectionStart ?? text.length
  const end = el?.selectionEnd ?? text.length
  const { next, focusStart, focusEnd } = insertWrap(text, start, end, before, after)
  applyEdit(next, focusStart, focusEnd)
}

function doBlock(mapLines: (lines: string[]) => string[]) {
  const el = textareaRef.value
  const text = props.modelValue
  const start = el?.selectionStart ?? 0
  const end = el?.selectionEnd ?? 0
  const { next, focusStart, focusEnd } = applyLineBlockTransform(text, start, end, mapLines)
  applyEdit(next, focusStart, focusEnd)
}

function doHeading() {
  const el = textareaRef.value
  const text = props.modelValue
  const start = el?.selectionStart ?? 0
  const end = el?.selectionEnd ?? 0
  const { next, focusStart, focusEnd } = applyHeadingToFirstLine(text, start, end)
  applyEdit(next, focusStart, focusEnd)
}

function doLink() {
  const el = textareaRef.value
  const text = props.modelValue
  const start = el?.selectionStart ?? 0
  const end = el?.selectionEnd ?? 0
  const { next, focusStart, focusEnd } = insertLink(
    text,
    start,
    end,
    t('feedback.toolbarLinkPlaceholder'),
  )
  applyEdit(next, focusStart, focusEnd)
}

function doHorizontalRule() {
  const el = textareaRef.value
  const text = props.modelValue
  const start = el?.selectionStart ?? text.length
  const end = el?.selectionEnd ?? text.length
  const chunk = start === 0 ? '---\n\n' : '\n\n---\n\n'
  const { next, focusStart, focusEnd } = insertAtCursor(text, start, end, chunk)
  applyEdit(next, focusStart, focusEnd)
}

const hasFooter = computed(() => !!slots.footer)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
    <Label :for="inputId" class="text-xs text-muted-foreground font-normal">
      {{ label }}
    </Label>

    <div
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-input bg-background"
    >
      <div
        class="flex shrink-0 flex-col gap-2 border-b border-border px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      >
        <div
          class="flex items-stretch gap-0"
          role="tablist"
          :aria-label="t('feedback.markdownTabsAria')"
        >
          <button
            :id="`${inputId}-tab-write`"
            type="button"
            role="tab"
            :aria-selected="panel === 'write'"
            :aria-controls="`${inputId}-panel-write`"
            :class="cn(
              'border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors -mb-px',
              panel === 'write'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )"
            @click="panel = 'write'"
          >
            {{ t('feedback.markdownWrite') }}
          </button>
          <button
            :id="`${inputId}-tab-preview`"
            type="button"
            role="tab"
            :aria-selected="panel === 'preview'"
            :aria-controls="`${inputId}-panel-preview`"
            :class="cn(
              'border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors -mb-px',
              panel === 'preview'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )"
            @click="panel = 'preview'"
          >
            {{ t('feedback.markdownPreview') }}
          </button>
        </div>

        <div
          v-show="panel === 'write'"
          role="toolbar"
          :aria-label="t('feedback.toolbarAria')"
          class="flex flex-wrap items-center justify-end gap-px"
        >
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarHeading')"
            :aria-label="t('feedback.toolbarHeading')"
            @click="onToolbar(doHeading)"
          >
            <Heading2 class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarBold')"
            :aria-label="t('feedback.toolbarBold')"
            @click="onToolbar(() => doWrap('**', '**'))"
          >
            <Bold class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarItalic')"
            :aria-label="t('feedback.toolbarItalic')"
            @click="onToolbar(() => doWrap('*', '*'))"
          >
            <Italic class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarQuote')"
            :aria-label="t('feedback.toolbarQuote')"
            @click="onToolbar(() => doBlock(quoteLines))"
          >
            <Quote class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarCode')"
            :aria-label="t('feedback.toolbarCode')"
            @click="onToolbar(() => doWrap('`', '`'))"
          >
            <Code class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarLink')"
            :aria-label="t('feedback.toolbarLink')"
            @click="onToolbar(doLink)"
          >
            <Link2 class="h-3.5 w-3.5" />
          </button>

          <span class="mx-0.5 hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarBulletList')"
            :aria-label="t('feedback.toolbarBulletList')"
            @click="onToolbar(() => doBlock(bulletListLines))"
          >
            <List class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarNumberedList')"
            :aria-label="t('feedback.toolbarNumberedList')"
            @click="onToolbar(() => doBlock(numberedListLines))"
          >
            <ListOrdered class="h-3.5 w-3.5" />
          </button>

          <span class="mx-0.5 hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden="true" />

          <button
            type="button"
            :class="toolBtnClass"
            :title="t('feedback.toolbarDivider')"
            :aria-label="t('feedback.toolbarDivider')"
            @click="onToolbar(doHorizontalRule)"
          >
            <Minus class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          v-show="panel === 'write'"
          :id="`${inputId}-panel-write`"
          role="tabpanel"
          :aria-labelledby="`${inputId}-tab-write`"
          class="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <textarea
            :id="inputId"
            ref="textareaRef"
            :value="modelValue"
            :placeholder="placeholder"
            :class="cn(
              'min-h-[200px] w-full max-h-full flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-3 text-sm leading-relaxed',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-0',
            )"
            @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
          />
        </div>

        <div
          v-show="panel === 'preview'"
          :id="`${inputId}-panel-preview`"
          role="tabpanel"
          :aria-labelledby="`${inputId}-tab-preview`"
          :class="cn(
            'feedback-md-preview min-h-[200px] max-h-[min(50vh,420px)] flex-1 overflow-y-auto px-3 py-3 text-sm',
          )"
        >
          <p
            v-if="isEmptyPreview"
            class="py-1 text-sm text-muted-foreground"
          >
            {{ t('feedback.previewEmpty') }}
          </p>
          <!-- markdown-it with html:false; links get rel noopener -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div
            v-else
            class="feedback-md-preview-inner leading-relaxed"
            v-html="previewHtml"
          />
        </div>
      </div>

      <div
        v-if="hasFooter"
        class="shrink-0 border-t border-border bg-muted/20"
      >
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-md-preview-inner :deep(h1),
.feedback-md-preview-inner :deep(h2),
.feedback-md-preview-inner :deep(h3) {
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}
.feedback-md-preview-inner :deep(h1:first-child),
.feedback-md-preview-inner :deep(h2:first-child),
.feedback-md-preview-inner :deep(h3:first-child) {
  margin-top: 0;
}
.feedback-md-preview-inner :deep(p) {
  margin-bottom: 0.5rem;
}
.feedback-md-preview-inner :deep(ul),
.feedback-md-preview-inner :deep(ol) {
  margin: 0.25rem 0 0.5rem;
  padding-left: 1.25rem;
}
.feedback-md-preview-inner :deep(li) {
  margin-bottom: 0.125rem;
}
.feedback-md-preview-inner :deep(code) {
  font-size: 0.8125rem;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: hsl(var(--muted));
}
.feedback-md-preview-inner :deep(pre) {
  margin: 0.5rem 0;
  padding: 0.75rem;
  border-radius: 0.375rem;
  background: hsl(var(--muted));
  overflow-x: auto;
  font-size: 0.8125rem;
}
.feedback-md-preview-inner :deep(pre code) {
  padding: 0;
  background: transparent;
}
.feedback-md-preview-inner :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.feedback-md-preview-inner :deep(blockquote) {
  margin: 0.5rem 0;
  padding-left: 0.75rem;
  border-left: 2px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
}
.feedback-md-preview-inner :deep(hr) {
  margin: 0.75rem 0;
  border: 0;
  border-top: 1px solid hsl(var(--border));
}
</style>
