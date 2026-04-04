<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CERTIFICATE_PREVIEW_FONT_FAMILY,
  REFERENCE_HEIGHT,
  type CertificateTemplateElement,
} from '@/components/certificates/certificate-template-defaults'

const props = withDefaults(
  defineProps<{
    imagePath: string
    elements: CertificateTemplateElement[]
    placeholders: Record<string, string>
    /** Optional: max height in px for the preview container. */
    maxHeight?: number
  }>(),
  { maxHeight: undefined }
)

const imageUrl = computed(() => {
  const path = props.imagePath
  if (!path) return ''
  if (path.startsWith('http')) return path
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')
  return `${base}${path}`
})

const containerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(REFERENCE_HEIGHT)

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!containerRef.value) return
  containerHeight.value = containerRef.value.offsetHeight || REFERENCE_HEIGHT
  resizeObserver = new ResizeObserver((entries) => {
    const el = entries[0]?.target as HTMLElement
    if (el) containerHeight.value = el.offsetHeight || REFERENCE_HEIGHT
  })
  resizeObserver.observe(containerRef.value)
})
onUnmounted(() => {
  resizeObserver?.disconnect()
})

function getText(el: CertificateTemplateElement): string {
  if (el.type === 'placeholder' && el.placeholderKey)
    return props.placeholders[el.placeholderKey] ?? el.placeholderKey
  if (el.type === 'static' && el.content) return el.content
  return ''
}

function scaledFontSize(fontSize: number): number {
  return Math.max(1, Math.round((fontSize * containerHeight.value) / REFERENCE_HEIGHT))
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30"
    :style="maxHeight != null ? { maxHeight: `${maxHeight}px` } : undefined"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl"
      alt=""
      class="block w-full h-auto min-w-0"
    />
    <div
      v-if="imageUrl"
      class="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <div
        v-for="(el, idx) in elements"
        :key="idx"
        class="absolute whitespace-nowrap"
        :style="{
          left: `${el.x}%`,
          top: `${el.y}%`,
          fontSize: `${scaledFontSize(el.fontSize || 12)}px`,
          fontFamily: CERTIFICATE_PREVIEW_FONT_FAMILY,
          color: el.color || '#000000',
        }"
      >
        {{ getText(el) }}
      </div>
    </div>
  </div>
</template>
