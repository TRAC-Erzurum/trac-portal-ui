<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

type Segment = { type: 'text'; value: string } | { type: 'var'; key: string }

const props = defineProps<{
  modelValue: string
  placeholderKeys: readonly string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const knownKeys = computed(() => new Set<string>(props.placeholderKeys))

function parseToSegments(name: string): Segment[] {
  const keys = knownKeys.value
  const segments: Segment[] = []
  const re = /\{\{([^}]+)\}\}/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(name)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: name.slice(lastIndex, m.index) })
    }
    const key = (m[1] ?? '').trim()
    if (key && keys.has(key)) {
      segments.push({ type: 'var', key })
    } else {
      segments.push({ type: 'text', value: m[0] })
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < name.length) {
    segments.push({ type: 'text', value: name.slice(lastIndex) })
  }
  if (segments.length === 0) {
    segments.push({ type: 'text', value: '' })
  }
  return segments
}

function segmentsToName(segments: Segment[]): string {
  return segments
    .map((s) => (s.type === 'text' ? s.value : `{{${s.key}}}`))
    .join('')
}

const segments = ref<Segment[]>(parseToSegments(props.modelValue))
const segmentRefs = ref<(HTMLInputElement | HTMLElement | null)[]>([])

function setSegmentRef(i: number, el: unknown) {
  segmentRefs.value[i] = (el as HTMLInputElement | HTMLElement | null) ?? null
}

function focusSegment(idx: number) {
  if (idx < 0 || idx >= segments.value.length) return
  const el = segmentRefs.value[idx]
  if (el) (el as HTMLElement).focus()
}

function onVarKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    removeVar(i)
    nextTick(() => focusSegment(i > 0 ? i - 1 : 0))
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    focusSegment(i - 1)
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    focusSegment(i + 1)
  }
}

function onInputKeydown(e: KeyboardEvent, i: number) {
  const input = e.target as HTMLInputElement
  if (e.key === 'ArrowLeft' && input.selectionStart === 0) {
    e.preventDefault()
    focusSegment(i - 1)
    return
  }
  if (e.key === 'ArrowRight' && input.selectionStart === input.value.length) {
    e.preventDefault()
    focusSegment(i + 1)
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (segmentsToName(segments.value) !== val) {
      segments.value = parseToSegments(val)
    }
  }
)

function emitUpdate() {
  const str = segmentsToName(segments.value)
  if (str !== props.modelValue) {
    emit('update:modelValue', str)
  }
}

const availableKeys = computed(() =>
  props.placeholderKeys.filter(
    (key) => !segments.value.some((s) => s.type === 'var' && s.key === key)
  )
)

function addVariable(key: string) {
  segments.value.push({ type: 'var', key })
  segments.value.push({ type: 'text', value: '' })
  emitUpdate()
}

function removeVar(index: number) {
  const prev = segments.value[index - 1]
  const next = segments.value[index + 1]
  segments.value.splice(index, 1)
  if (prev?.type === 'text' && next?.type === 'text') {
    prev.value += next.value
    segments.value.splice(index, 1)
  }
  emitUpdate()
}

function onTextInput(index: number, val: string) {
  const seg = segments.value[index]
  if (seg?.type === 'text') {
    seg.value = val
    emitUpdate()
  }
}

function onDragStart(e: DragEvent, key: string) {
  e.dataTransfer?.setData('text/plain', key)
  ;(e.target as HTMLElement).style.opacity = '0.5'
}

function onDragEnd(e: DragEvent) {
  ;(e.target as HTMLElement).style.opacity = '1'
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const k = e.dataTransfer?.getData('text/plain')
  if (k && knownKeys.value.has(k)) {
    addVariable(k)
  }
}
</script>

<template>
  <div class="space-y-2">
    <!-- Available variables as blue badges above -->
    <div v-if="availableKeys.length" class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="key in availableKeys"
        :key="key"
        type="button"
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-700 dark:bg-blue-400/20 dark:text-blue-300 border border-blue-500/30 cursor-grab active:cursor-grabbing select-none"
        :draggable="true"
        @dblclick="addVariable(key)"
        @dragstart="(e: DragEvent) => onDragStart(e, key)"
        @dragend="onDragEnd"
      >
        {{ t(`scheduler.namePlaceholder.${key}`) }}
      </button>
    </div>
    <p v-else class="text-xs text-muted-foreground">
      {{ t('scheduler.allVariablesAdded') }}
    </p>

    <!-- Input area: text segments + var badges (no gap to avoid extra space) -->
    <div
      class="flex flex-wrap items-center min-h-9 w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background [&>*]:shrink-0"
      @dragover.prevent
      @drop="onDrop"
    >
      <template v-for="(seg, i) in segments" :key="i">
        <input
          v-if="seg.type === 'text'"
          :ref="(el) => setSegmentRef(i, el)"
          :value="seg.value"
          type="text"
          :class="[
            'min-h-6 py-0 px-0 border-0 bg-transparent outline-none text-foreground placeholder:text-muted-foreground shrink-0',
            i === segments.length - 1 ? 'flex-1 min-w-[1rem]' : 'flex-none',
          ]"
          :style="i < segments.length - 1 ? { width: `${Math.max(1, seg.value.length)}ch`, maxWidth: '100%' } : undefined"
          :placeholder="i === 0 && segments.length === 1 ? t('nets.netNamePlaceholder') : ''"
          @input="(e: Event) => onTextInput(i, (e.target as HTMLInputElement).value)"
          @keydown="(e: KeyboardEvent) => onInputKeydown(e, i)"
        />
        <span
          v-else
          :ref="(el) => setSegmentRef(i, el)"
          role="button"
          tabindex="0"
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-700 dark:bg-blue-400/20 dark:text-blue-300 border border-blue-500/30 shrink-0 -mx-px cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          @keydown="(e: KeyboardEvent) => onVarKeydown(e, i)"
        >
          {{ t(`scheduler.namePlaceholder.${seg.key}`) }}
          <button
            type="button"
            tabindex="-1"
            class="rounded p-0.5 hover:bg-blue-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="t('common.clear')"
            @click="removeVar(i)"
          >
            <X class="h-3 w-3" />
          </button>
        </span>
      </template>
    </div>
  </div>
</template>
