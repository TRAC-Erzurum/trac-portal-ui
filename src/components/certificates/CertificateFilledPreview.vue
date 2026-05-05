<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CERTIFICATE_PREVIEW_FONT_FAMILY,
  normalizeCertificateTemplateElement,
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

const containerRef = ref<Element | null>(null)
const containerHeight = ref(REFERENCE_HEIGHT)

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!containerRef.value) return
  const height = (containerRef.value as HTMLElement).offsetHeight
  containerHeight.value = height || REFERENCE_HEIGHT
  resizeObserver = new ResizeObserver((entries) => {
    const el = entries[0]?.target as HTMLElement
    if (el) containerHeight.value = el.offsetHeight || REFERENCE_HEIGHT
  })
  resizeObserver.observe(containerRef.value as any)
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

const normalizedElements = computed(() =>
  props.elements.map((el) => normalizeCertificateTemplateElement(el))
)

const getAlignmentClass = (align: CertificateTemplateElement['textAlign']) => {
  if (align === 'left') return 'justify-start text-left'
  if (align === 'right') return 'justify-end text-right'
  return 'justify-center text-center'
}

const CERTIFICATE_BOX_CLASS = 'absolute'
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
        v-for="(el, idx) in normalizedElements"
        :key="idx"
        :class="CERTIFICATE_BOX_CLASS"
        :style="{
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.boxWidth}%`,
          height: `${el.boxHeight}%`,
        }"
      >
        <div
          class="flex h-full w-full items-start whitespace-nowrap overflow-hidden"
          :class="getAlignmentClass(el.textAlign)"
          :style="{
            fontSize: `${scaledFontSize(el.fontSize || 12)}px`,
            fontFamily: CERTIFICATE_PREVIEW_FONT_FAMILY,
            color: el.color || '#000000',
          }"
        >
          {{ getText(el) }}
        </div>
      </div>
    </div>
  </div>
</template>
