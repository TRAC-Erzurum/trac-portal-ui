<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Edit, FileImage, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { REFERENCE_HEIGHT } from '@/components/certificates/certificate-template-defaults'

export interface CertificateTemplate {
  id: string
  name: string
  imagePath: string
  elements?: unknown[]
}

interface ParsedElement {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  x: number
  y: number
  fontFamily: string
  fontSize: number
  color: string
}

const props = withDefaults(
  defineProps<{
    template: CertificateTemplate
    canManage: boolean
  }>(),
  {}
)

const emit = defineEmits<{
  edit: [template: CertificateTemplate]
  delete: [template: CertificateTemplate]
}>()

const { t } = useI18n()

const imageUrl = computed(() => {
  const path = props.template?.imagePath
  if (!path) return ''
  if (path.startsWith('http')) return path
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')
  return `${baseUrl}${path}`
})

const parsedElements = computed((): ParsedElement[] => {
  const raw = props.template?.elements
  if (!Array.isArray(raw)) return []
  return raw.map((el: unknown) => {
    const e = el as Record<string, unknown>
    return {
      type: (e.type === 'placeholder' ? 'placeholder' : 'static') as 'static' | 'placeholder',
      content: e.content as string | undefined,
      placeholderKey: e.placeholderKey as string | undefined,
      x: Number(e.x) || 0,
      y: Number(e.y) || 0,
      fontFamily: (e.fontFamily as string) ?? 'Arial',
      fontSize: Number(e.fontSize) || 16,
      color: (e.color as string) ?? '#000000',
    }
  })
})

const previewLabel = (el: ParsedElement) => {
  if (el.type === 'static') return el.content || '…'
  const key = el.placeholderKey || 'operator_callsign'
  return t(`certificates.placeholders.${key}`)
}

/** x,y veritabanında % (0-100) veya eski piksel (0-400, 0-300) olabilir; gösterim için %'e çeviriyoruz */
const toPercent = (e: ParsedElement) => ({
  ...e,
  x: e.x > 100 ? (e.x / 400) * 100 : e.x,
  y: e.y > 100 ? (e.y / 300) * 100 : e.y,
})
const elementsPercent = computed(() => parsedElements.value.map(toPercent))

const previewRef = ref<HTMLElement | null>(null)
const previewHeight = ref(REFERENCE_HEIGHT)
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!previewRef.value) return
  previewHeight.value = previewRef.value.offsetHeight || REFERENCE_HEIGHT
  resizeObserver = new ResizeObserver((entries) => {
    const el = entries[0]?.target as HTMLElement
    if (el) previewHeight.value = el.offsetHeight || REFERENCE_HEIGHT
  })
  resizeObserver.observe(previewRef.value)
})
onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    class="flex flex-col rounded-lg border bg-card text-card-foreground shadow-xs overflow-hidden max-w-[240px]"
  >
    <!-- Önizleme: x,y % ile görselle aynı konumda -->
    <div
      ref="previewRef"
      class="aspect-[4/3] h-36 bg-muted/50 flex items-center justify-center overflow-hidden relative shrink-0"
    >
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="template.name"
        class="absolute inset-0 w-full h-full object-contain object-center"
      />
      <template v-else>
        <FileImage class="h-8 w-8 text-muted-foreground/50" />
      </template>
      <!-- Overlay: x,y % ile; her boyutta görselle aynı konumda -->
      <template v-if="imageUrl && elementsPercent.length > 0">
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            v-for="(el, idx) in elementsPercent"
            :key="idx"
            class="absolute whitespace-nowrap"
            :style="{
              left: el.x + '%',
              top: el.y + '%',
              fontFamily: el.fontFamily,
              fontSize: (el.fontSize * (previewHeight / REFERENCE_HEIGHT)) + 'px',
              color: el.color,
              textShadow: '0 0 2px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)',
            }"
          >
            {{ previewLabel(el) }}
          </div>
        </div>
      </template>
    </div>
    <div class="p-2 flex flex-col flex-1 min-w-0 gap-1.5">
      <p class="text-xs font-medium truncate" :title="template.name">
        {{ template.name }}
      </p>
      <Separator class="my-0.5" />
      <div v-if="canManage" class="flex items-center gap-1.5 mt-auto pt-1">
        <Button
          variant="outline"
          size="sm"
          class="flex-1 h-8 text-xs"
          @click="emit('edit', template)"
        >
          <Edit class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.edit') }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs shrink-0 trac-btn-destructive-outlined"
          @click="emit('delete', template)"
        >
          <Trash2 class="h-3.5 w-3.5 mr-1.5" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </div>
  </div>
</template>
