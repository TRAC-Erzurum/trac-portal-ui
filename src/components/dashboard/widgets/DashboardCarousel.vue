<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, onMounted, onUnmounted, ref, watch, type Component, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DashboardWidget from './DashboardWidget.vue'
import type { RouteLocationRaw } from 'vue-router'

const CAROUSEL_INTERVAL_MS = 4200

const props = defineProps({
  icon: {
    type: [Object, Function] as PropType<Component>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  to: {
    type: [String, Object] as PropType<RouteLocationRaw>,
    default: '',
  },
  buttonText: {
    type: String,
    required: true,
  },
  items: {
    type: Array as PropType<T[]>,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  autoplay: {
    type: Boolean,
    default: false,
  },
  itemKey: {
    type: String,
    default: 'id',
  },
})

const { t } = useI18n()
defineSlots<{
  default(props: { item: T; index: number; isActive: boolean }): unknown
  loading?(): unknown
  empty?(): unknown
}>()

const selectedIndex = ref(0)
const isHovering = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

const carouselItems = computed(() => props.items ?? [])
const hasCarousel = computed(() => carouselItems.value.length > 1)
const isEmpty = computed(() => !props.isLoading && carouselItems.value.length === 0)

function resolveItemKey(item: T, index: number): PropertyKey {
  const value = (item as Record<string, unknown>)[props.itemKey]
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'symbol' ? value : index
}

function stopCarousel() {
  if (!intervalId) return
  clearInterval(intervalId)
  intervalId = null
}

function startCarousel() {
  if (intervalId || !hasCarousel.value || !props.autoplay) return
  intervalId = setInterval(() => {
    selectedIndex.value = (selectedIndex.value + 1) % carouselItems.value.length
  }, CAROUSEL_INTERVAL_MS)
}

function maybeStartCarousel() {
  if (!props.autoplay) return
  if (!hasCarousel.value) return
  if (isHovering.value) return
  startCarousel()
}

function scrollPrev() {
  if (!hasCarousel.value) return
  stopCarousel()
  selectedIndex.value = (selectedIndex.value - 1 + carouselItems.value.length) % carouselItems.value.length
  maybeStartCarousel()
}

function scrollNext() {
  if (!hasCarousel.value) return
  stopCarousel()
  selectedIndex.value = (selectedIndex.value + 1) % carouselItems.value.length
  maybeStartCarousel()
}

function goToSlide(index: number) {
  if (!hasCarousel.value) return
  stopCarousel()
  selectedIndex.value = index
  maybeStartCarousel()
}

watch(
  () => [carouselItems.value.length, props.isLoading, props.autoplay],
  () => {
    if (props.isLoading || carouselItems.value.length <= 1 || !props.autoplay) {
      selectedIndex.value = 0
      stopCarousel()
      return
    }

    if (selectedIndex.value >= carouselItems.value.length) {
      selectedIndex.value = 0
    }

    stopCarousel()
    maybeStartCarousel()
  },
  { flush: 'post' },
)

onMounted(() => {
  maybeStartCarousel()
})

onUnmounted(() => {
  stopCarousel()
})
</script>

<template>
  <DashboardWidget :icon="icon" :title="title" :action="{ to, text: buttonText }">
    <div class="flex-1 min-h-0 flex flex-col items-center justify-center p-3">
      <div v-if="isLoading" class="h-full min-h-[160px] flex items-center justify-center text-sm text-muted-foreground">
        <slot name="loading">
          {{ t('common.loading') }}
        </slot>
      </div>
      <template v-else-if="isEmpty">
        <div class="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <slot name="empty">
            <p class="text-sm text-muted-foreground">
              {{ t('common.noData') }}
            </p>
          </slot>
        </div>
      </template>
      <template v-else>
        <div
          class="relative w-full max-w-md mx-auto"
          @mouseenter="isHovering = true; stopCarousel()"
          @mouseleave="isHovering = false; maybeStartCarousel()"
        >
          <div v-if="hasCarousel" class="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-9 w-9 p-0 rounded-full bg-background/90 shadow-sm"
              :aria-label="t('dashboard.carouselPrev')"
              @click="scrollPrev"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
          </div>
          <div v-if="hasCarousel" class="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 -mr-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-9 w-9 p-0 rounded-full bg-background/90 shadow-sm"
              :aria-label="t('dashboard.carouselNext')"
              @click="scrollNext"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>

          <div class="overflow-hidden rounded-xl">
            <div
              class="flex transition-transform duration-500 ease-out"
              :style="{ transform: `translate3d(-${selectedIndex * 100}%, 0, 0)` }"
            >
              <div
                v-for="(item, index) in carouselItems"
                :key="resolveItemKey(item, index)"
                class="min-w-0 shrink-0 grow-0 basis-full flex justify-center px-2"
              >
                <slot :item="item" :index="index" :is-active="index === selectedIndex" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <template #footer>
      <div
        v-if="hasCarousel && !isLoading && !isEmpty"
        class="flex gap-1.5 p-3 justify-center flex-wrap"
        role="tablist"
        :aria-label="t('dashboard.carouselIndicators')"
      >
        <button
          v-for="(_, idx) in carouselItems"
          :key="idx"
          type="button"
          class="h-2 w-2 min-h-2 min-w-2 rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          :class="idx === selectedIndex ? 'bg-primary' : 'bg-muted-foreground/40'"
          :aria-label="t('dashboard.carouselSlide', { current: idx + 1, total: carouselItems.length })"
          :aria-selected="idx === selectedIndex"
          @click="goToSlide(idx)"
        />
      </div>
    </template>
  </DashboardWidget>
</template>
