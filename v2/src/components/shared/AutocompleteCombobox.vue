<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: string[]
    placeholder?: string
    disabled?: boolean
    id?: string
    class?: string
  }>(),
  { placeholder: '', disabled: false, class: '' }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const query = ref(props.modelValue)
const highlightedIndex = ref(-1)

const filteredOptions = computed(() => {
  if (!query.value.trim()) return props.options
  const q = query.value.trim().toLowerCase()
  return props.options.filter((opt) => opt.toLowerCase().includes(q))
})

const showDropdown = computed(() => isOpen.value && filteredOptions.value.length > 0)

function open() {
  if (props.disabled) return
  isOpen.value = true
  query.value = props.modelValue
  highlightedIndex.value = -1
}

function close() {
  isOpen.value = false
  query.value = props.modelValue
  highlightedIndex.value = -1
}

function select(value: string) {
  emit('update:modelValue', value)
  query.value = value
  close()
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  query.value = target.value
  isOpen.value = true
  highlightedIndex.value = -1
  emit('update:modelValue', target.value)
}

function onFocus() {
  open()
}

function onBlur() {
  setTimeout(close, 150)
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
    return
  }
  if (e.key === 'Enter' && highlightedIndex.value >= 0 && filteredOptions.value[highlightedIndex.value]) {
    e.preventDefault()
    select(filteredOptions.value[highlightedIndex.value])
    return
  }
  if (e.key === 'Escape') {
    close()
    inputRef.value?.blur()
  }
}

function handleOptionClick(value: string) {
  select(value)
}

watch(
  () => props.modelValue,
  (v) => {
    query.value = v
  }
)

watch(
  () => props.options,
  () => {
    highlightedIndex.value = -1
  }
)

const rootRef = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <div class="relative">
      <input
        :id="id"
        ref="inputRef"
        type="text"
        :value="query"
        :placeholder="placeholder"
        :disabled="disabled"
        autocomplete="off"
        role="combobox"
        :aria-expanded="showDropdown"
        aria-autocomplete="list"
        :aria-controls="id ? `${id}-listbox` : undefined"
        class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent pl-3 pr-9 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        :class="cn(props.class)"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <ChevronDown
        class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 opacity-50"
        aria-hidden
      />
    </div>
    <ul
      v-if="showDropdown"
      :id="id ? `${id}-listbox` : undefined"
      role="listbox"
      class="border-input bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border py-1 shadow-md"
    >
      <li
        v-for="(opt, idx) in filteredOptions"
        :key="opt"
        role="option"
        :aria-selected="idx === highlightedIndex"
        class="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        :class="{ 'bg-accent text-accent-foreground': idx === highlightedIndex }"
        @mousedown.prevent="handleOptionClick(opt)"
      >
        {{ opt }}
      </li>
    </ul>
  </div>
</template>
