<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, Plus, Trash2, Type } from 'lucide-vue-next'
import {
  CERTIFICATE_PREVIEW_FONT_FAMILY,
  REFERENCE_HEIGHT,
  type CertificateTemplateElement,
} from '@/components/certificates/certificate-template-defaults'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const PLACEHOLDER_KEYS = [
  'operator_callsign',
  'operator_name',
  'operator_country',
  'operator_city',
  'operator_district',
  'net_name',
  'net_date',
  'net_operator_callsign',
  'net_operator_name',
  'branch_name',
  'branch_callsign',
  'certificate_serial',
  'participant_number',
  'issue_date',
] as const

const props = withDefaults(
  defineProps<{
    modelValue: CertificateTemplateElement[]
    imagePath: string
    disabled?: boolean
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: CertificateTemplateElement[]]
}>()

const { t } = useI18n()

const imageUrl = computed(() => {
  const path = props.imagePath
  if (!path) return ''
  if (path.startsWith('http')) return path
  const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '')
  return `${baseUrl}${path}`
})

const elements = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const usedPlaceholderKeys = computed(() => {
  const set = new Set<string>()
  for (const el of elements.value) {
    if (el.type === 'placeholder' && el.placeholderKey) set.add(el.placeholderKey)
  }
  return set
})

const availablePlaceholderKeys = computed(() =>
  PLACEHOLDER_KEYS.filter((k) => !usedPlaceholderKeys.value.has(k))
)

const addStaticText = () => {
  const next: CertificateTemplateElement = {
    type: 'static',
    content: '',
    x: 50,
    y: 50,
    fontSize: 16,
    color: '#000000',
  }
  elements.value = [...elements.value, next]
}

const addPlaceholder = (key: string) => {
  const next: CertificateTemplateElement = {
    type: 'placeholder',
    placeholderKey: key,
    x: 50,
    y: 50,
    fontSize: 16,
    color: '#000000',
  }
  elements.value = [...elements.value, next]
}

/** x,y % (0-100); eski piksel verisi varsa gösterim için %'e çeviriyoruz */
const normalizedElements = computed(() =>
  elements.value.map((el) => ({
    ...el,
    x: el.x > 100 ? (el.x / 400) * 100 : el.x,
    y: el.y > 100 ? (el.y / 300) * 100 : el.y,
  }))
)

const canvasRef = ref<HTMLElement | null>(null)
const canvasHeight = ref(REFERENCE_HEIGHT)
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (!canvasRef.value) return
  canvasHeight.value = canvasRef.value.offsetHeight || REFERENCE_HEIGHT
  resizeObserver = new ResizeObserver((entries) => {
    const el = entries[0]?.target as HTMLElement
    if (el) canvasHeight.value = el.offsetHeight || REFERENCE_HEIGHT
  })
  resizeObserver.observe(canvasRef.value)
})
onUnmounted(() => {
  resizeObserver?.disconnect()
})

const scaledFontSize = (fontSize: number) =>
  Math.round((fontSize * canvasHeight.value) / REFERENCE_HEIGHT)

const elementCardTitle = (el: CertificateTemplateElement) => {
  if (el.type === 'static') return el.content?.trim() || t('certificates.elementStatic')
  const key = el.placeholderKey || 'operator_callsign'
  return t(`certificates.placeholders.${key}`)
}

const updateElement = (index: number, patch: Partial<CertificateTemplateElement>) => {
  const list = [...elements.value]
  const current = list[index]
  if (current == null) return
  list[index] = {
    type: patch.type ?? current.type,
    content: patch.content !== undefined ? patch.content : current.content,
    placeholderKey: patch.placeholderKey !== undefined ? patch.placeholderKey : current.placeholderKey,
    x: patch.x ?? current.x,
    y: patch.y ?? current.y,
    fontSize: patch.fontSize ?? current.fontSize,
    color: patch.color ?? current.color,
  }
  elements.value = list
}

const isSerialElement = (el: CertificateTemplateElement) =>
  el.type === 'placeholder' && el.placeholderKey === 'certificate_serial'

const removeElement = (index: number) => {
  const el = elements.value[index]
  if (el && isSerialElement(el)) return
  elements.value = elements.value.filter((_, i) => i !== index)
}

const previewLabel = (el: CertificateTemplateElement) => {
  if (el.type === 'static') return el.content || '…'
  const key = el.placeholderKey || 'operator_callsign'
  return t(`certificates.placeholders.${key}`)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h4 class="text-sm font-medium text-muted-foreground mb-1">
        {{ t('certificates.elementsSection') }}
      </h4>
      <p class="text-xs text-muted-foreground">
        {{ t('certificates.elementsHint') }}
      </p>
    </div>

    <!-- Canvas preview: x,y % ile; font yüksekliğe göre ölçeklenir -->
    <div
      ref="canvasRef"
      v-if="imageUrl"
      class="relative w-full rounded-md border border-input bg-muted/30 overflow-hidden"
      style="aspect-ratio: 4/3; max-height: 240px;"
    >
      <img
        :src="imageUrl"
        alt=""
        class="absolute inset-0 w-full h-full object-contain"
        draggable="false"
      />
      <div
        v-for="(el, idx) in normalizedElements"
        :key="idx"
        class="absolute pointer-events-none whitespace-nowrap"
        :style="{
          left: el.x + '%',
          top: el.y + '%',
          fontFamily: CERTIFICATE_PREVIEW_FONT_FAMILY,
          fontSize: scaledFontSize(el.fontSize) + 'px',
          color: el.color,
        }"
      >
        {{ previewLabel(el) }}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="disabled || !imagePath"
        @click="addStaticText"
      >
        <Type class="h-4 w-4 mr-2" />
        {{ t('certificates.addStaticText') }}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="disabled || !imagePath || availablePlaceholderKeys.length === 0"
          >
            <Plus class="h-4 w-4 mr-2" />
            {{ t('certificates.addPlaceholder') }}
            <ChevronDown class="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            v-for="key in availablePlaceholderKeys"
            :key="key"
            @select="addPlaceholder(key)"
          >
            {{ t(`certificates.placeholders.${key}`) }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Element list -->
    <div v-if="elements.length > 0" class="space-y-3">
      <Separator />
      <details
        v-for="(el, idx) in elements"
        :key="idx"
        class="group rounded-md border border-input bg-background"
      >
        <summary
          class="flex items-center justify-between gap-2 cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md [&::-webkit-details-marker]:hidden"
        >
          <span class="flex items-center gap-2">
            <ChevronDown class="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 text-muted-foreground" />
            {{ elementCardTitle(el) }}
          </span>
          <Button
            v-if="!isSerialElement(el)"
            type="button"
            variant="outline"
            size="icon-sm"
            class="shrink-0 text-muted-foreground hover:text-destructive"
            :disabled="disabled"
            @click.stop="removeElement(idx)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
          <span v-else class="text-xs text-muted-foreground shrink-0" :title="t('certificates.serialNoCannotDelete')">
            {{ t('certificates.serialNoFixed') }}
          </span>
        </summary>
        <div class="px-3 pb-3 pt-0 space-y-3 border-t border-border pt-3">
          <div v-if="el.type === 'static'" class="space-y-1">
            <Label class="text-xs">{{ t('certificates.elementStatic') }}</Label>
            <Input
              :model-value="el.content ?? ''"
              class="mt-1"
              @update:model-value="(v) => updateElement(idx, { content: v == null ? undefined : String(v) })"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <Label class="text-xs">{{ t('certificates.positionHorizontal') }} (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                :model-value="String(normalizedElements[idx]?.x ?? el.x)"
                class="mt-1"
                @update:model-value="(v) => updateElement(idx, { x: Number(v) || 0 })"
              />
            </div>
            <div class="space-y-1">
              <Label class="text-xs">{{ t('certificates.positionVertical') }} (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                :model-value="String(normalizedElements[idx]?.y ?? el.y)"
                class="mt-1"
                @update:model-value="(v) => updateElement(idx, { y: Number(v) || 0 })"
              />
            </div>
          </div>
          <div class="space-y-1">
            <Label class="text-xs">{{ t('certificates.fontSize') }}</Label>
            <Input
              type="number"
              min="8"
              max="120"
              :model-value="String(el.fontSize)"
              class="mt-1 max-w-[8rem]"
              @update:model-value="(v) => updateElement(idx, { fontSize: Number(v) || 16 })"
            />
          </div>
          <div class="space-y-1">
            <Label class="text-xs">{{ t('certificates.color') }}</Label>
            <div class="flex gap-2 mt-1 items-center">
              <input
                type="color"
                :value="el.color"
                class="h-9 w-14 rounded border border-input cursor-pointer"
                @input="(e) => updateElement(idx, { color: (e.target as HTMLInputElement).value })"
              />
              <Input
                :model-value="el.color"
                class="flex-1 font-mono text-sm"
                @update:model-value="(v) => updateElement(idx, { color: v == null ? undefined : String(v) })"
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
