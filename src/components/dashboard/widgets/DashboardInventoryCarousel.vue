<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Package } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getUploadedFileUrl } from '@/composables'
import EquipmentDetailSheet from '@/components/inventory/EquipmentDetailSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'

interface Equipment {
  id: string
  categoryId: string
  category: { id: string; name: string; photoPath?: string }
  isVisible: boolean
  photos: Array<{ id: string; filePath: string; sortOrder: number }>
  label?: string
}

const CAROUSEL_INTERVAL_MS = 4000

const { t } = useI18n()
const authStore = useAuthStore()

const operatorId = computed(() => authStore.user?.operator?.id ?? null)
const inventoryLink = computed(() =>
  operatorId.value ? `/operators/${operatorId.value}/inventory` : ''
)

const items = ref<{ equipmentId: string; imageUrl: string; alt: string }[]>([])
const isLoading = ref(true)
const currentIndex = ref(0)
const detailEquipmentId = ref<string | null>(null)
const showDetailSheet = ref(false)
const isHovering = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function getEquipmentImageUrl(eq: Equipment): string | null {
  const photo = eq.photos?.length
    ? eq.photos.sort((a, b) => a.sortOrder - b.sortOrder)[0]
    : null
  if (photo?.filePath) return getUploadedFileUrl(photo.filePath) || null
  if (eq.category?.photoPath) return getUploadedFileUrl(eq.category.photoPath) || null
  return null
}

async function fetchInventory() {
  const opId = operatorId.value
  if (!opId) {
    items.value = []
    isLoading.value = false
    return
  }
  isLoading.value = true
  try {
    const res = await api.get<{ data: Equipment[]; total: number }>(
      `/equipment/operator/${opId}?pageSize=200`
    )
    const visible = (res.data ?? []).filter((e) => e.isVisible !== false)
    const withImage: { equipmentId: string; imageUrl: string; alt: string }[] = []
    for (const e of visible) {
      const url = getEquipmentImageUrl(e)
      if (url) {
        withImage.push({
          equipmentId: e.id,
          imageUrl: url,
          alt: e.label || e.category?.name || t('inventory.equipment'),
        })
      }
    }
    items.value = shuffle(withImage)
    currentIndex.value = 0
  } catch {
    items.value = []
  } finally {
    isLoading.value = false
  }
}

function startCarousel() {
  if (items.value.length <= 1) return
  intervalId = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % items.value.length
  }, CAROUSEL_INTERVAL_MS)
}

function stopCarousel() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/** Start carousel only when not hovering and detail sheet is closed. */
function maybeStartCarousel() {
  if (items.value.length <= 1 || isHovering.value || showDetailSheet.value) return
  startCarousel()
}

/** Slots around center: offset -2, -1, 0, 1, 2 with item and scale/opacity. */
const visibleSlots = computed(() => {
  const list = items.value
  const n = list.length
  if (!n) return []
  const cur = currentIndex.value
  const offsets = [-2, -1, 0, 1, 2] as const
  return offsets.map((offset) => {
    const item = list[(cur + offset + n * 10) % n]!
    const abs = Math.abs(offset)
    const scale = 1 - 0.22 * abs
    const opacity = 1 - 0.35 * abs
    const zIndex = 10 - abs
    return { item, offset, scale, opacity, zIndex }
  })
})

const isEmpty = computed(() => !isLoading.value && items.value.length === 0)
const showCarousel = computed(() => !isLoading.value && items.value.length > 0)

function openDetail(id: string) {
  detailEquipmentId.value = id
  showDetailSheet.value = true
}

function onDetailClose(open: boolean) {
  showDetailSheet.value = open
  if (!open) detailEquipmentId.value = null
}

/** Center click: open sheet. Side click: bring that item to center. */
function handleSlotClick(slot: { item: { equipmentId: string }; offset: number }) {
  if (slot.offset === 0) {
    openDetail(slot.item.equipmentId)
  } else {
    const n = items.value.length
    currentIndex.value = (currentIndex.value + slot.offset + n * 10) % n
    stopCarousel()
    maybeStartCarousel()
  }
}

onMounted(() => {
  fetchInventory()
})

watch(items, (list) => {
  stopCarousel()
  if (list.length > 1) maybeStartCarousel()
}, { immediate: true })

watch(showDetailSheet, (open) => {
  if (open) stopCarousel()
  else maybeStartCarousel()
})

watch(operatorId, () => {
  fetchInventory()
})

onUnmounted(() => {
  stopCarousel()
})
</script>

<template>
  <div
    class="rounded-lg border border-border bg-background overflow-hidden flex flex-col min-h-[200px] lg:min-h-[240px]"
  >
    <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Package class="h-4 w-4 shrink-0" aria-hidden="true" />
        {{ t('dashboard.myInventoryTitle') }}
      </h3>
      <RouterLink v-if="inventoryLink" :to="inventoryLink" class="shrink-0">
        <Button variant="outline" size="sm" class="gap-1.5">
          {{ t('inventory.viewInventory') }}
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </Button>
      </RouterLink>
    </div>

    <div class="flex-1 min-h-0 flex flex-col items-center justify-center p-3">
      <div
        v-if="isLoading"
        class="h-full min-h-[160px] flex items-center justify-center text-sm text-muted-foreground"
      >
        {{ t('common.loading') }}
      </div>
      <template v-else-if="isEmpty">
        <div class="flex flex-col items-center justify-center py-8 gap-3">
          <Package
            class="h-16 w-16 text-muted-foreground/50 shrink-0"
            aria-hidden="true"
          />
          <p class="text-sm text-muted-foreground text-center">
            {{ t('inventory.noEquipmentYet') }}
          </p>
        </div>
      </template>
      <template v-else-if="showCarousel">
        <div
          class="relative w-full h-[180px] lg:h-[200px] flex items-center justify-center overflow-hidden"
          @mouseenter="isHovering = true; stopCarousel()"
          @mouseleave="isHovering = false; maybeStartCarousel()"
        >
          <button
            v-for="slot in visibleSlots"
            :key="`${slot.offset}-${slot.item.equipmentId}`"
            type="button"
            class="absolute left-1/2 top-1/2 flex items-center justify-center overflow-hidden border border-border/50 bg-muted/30 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring carousel-slot"
            :class="[
              slot.offset === 0
                ? 'w-[120px] h-[120px] lg:w-[140px] lg:h-[140px] rounded-[1.25rem]'
                : 'w-[88px] h-[88px] lg:w-[100px] lg:h-[100px] rounded-xl',
            ]"
            :style="{
              transform: `translate(-50%, -50%) translateX(${slot.offset * 64}px) scale(${slot.scale})`,
              opacity: slot.opacity,
              zIndex: slot.zIndex,
            }"
            :aria-label="slot.offset === 0 ? slot.item.alt : undefined"
            @click="handleSlotClick(slot)"
          >
            <img
              :src="slot.item.imageUrl"
              :alt="slot.item.alt"
              class="w-full h-full object-cover"
            >
          </button>
        </div>
        <div
          v-if="items.length > 1"
          class="flex gap-1 mt-3 justify-center"
          role="tablist"
          :aria-label="t('dashboard.carouselIndicators')"
        >
          <button
            v-for="(_, idx) in items"
            :key="idx"
            type="button"
            class="h-1.5 w-1.5 rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="idx === currentIndex ? 'bg-primary' : 'bg-muted-foreground/40'"
            :aria-label="t('dashboard.carouselSlide', { current: idx + 1, total: items.length })"
            :aria-selected="idx === currentIndex"
            @click="currentIndex = idx"
          />
        </div>
      </template>
    </div>
  </div>

  <EquipmentDetailSheet
    :open="showDetailSheet"
    :equipment-id="detailEquipmentId"
    :can-edit="true"
    @update:open="onDetailClose"
  />
</template>

<style scoped>
.carousel-slot {
  transition:
    transform 0.55s cubic-bezier(0.25, 0.1, 0.25, 1),
    opacity 0.55s cubic-bezier(0.25, 0.1, 0.25, 1);
}
</style>
