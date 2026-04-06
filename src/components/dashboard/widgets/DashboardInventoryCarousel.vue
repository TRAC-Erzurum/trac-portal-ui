<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight, ImageOff, Package } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getUploadedFileUrl } from '@/composables'
import EquipmentDetailSheet from '@/components/inventory/EquipmentDetailSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'

interface Equipment {
  id: string
  category: { id: string; name: string; photoPath?: string }
  isVisible: boolean
  photos: Array<{ id: string; filePath: string; sortOrder: number }>
  label?: string
}

interface CarouselItem {
  equipmentId: string
  imageUrl: string | null
  alt: string
}

const CAROUSEL_INTERVAL_MS = 4200

const { t } = useI18n()
const authStore = useAuthStore()

const operatorId = computed(() => authStore.user?.operator?.id ?? null)
const inventoryLink = computed(() => (operatorId.value ? `/operators/${operatorId.value}/inventory` : ''))

const items = ref<CarouselItem[]>([])
const isLoading = ref(true)
const selectedIndex = ref(0)
const detailEquipmentId = ref<string | null>(null)
const showDetailSheet = ref(false)
const isHovering = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function getEquipmentImageUrl(eq: Equipment): string | null {
  const sorted = [...(eq.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const firstPhoto = sorted[0]
  if (firstPhoto?.filePath) return getUploadedFileUrl(firstPhoto.filePath) || null
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
    const response = await api.get<{ data: Equipment[]; total: number }>(`/equipment/operator/${opId}?pageSize=200`)
    const visible = (response.data ?? []).filter((equipment) => equipment.isVisible !== false)

    const nextItems: CarouselItem[] = visible.map((equipment) => ({
      equipmentId: equipment.id,
      imageUrl: getEquipmentImageUrl(equipment),
      alt: equipment.label || equipment.category?.name || t('inventory.equipment'),
    }))

    items.value = shuffle(nextItems)
    selectedIndex.value = 0
  } catch {
    items.value = []
  } finally {
    isLoading.value = false
  }
}

function stopCarousel() {
  if (!intervalId) return
  clearInterval(intervalId)
  intervalId = null
}

function startCarousel() {
  if (intervalId || items.value.length <= 1) return
  intervalId = setInterval(() => {
    selectedIndex.value = (selectedIndex.value + 1) % items.value.length
  }, CAROUSEL_INTERVAL_MS)
}

function maybeStartCarousel() {
  if (items.value.length <= 1) return
  if (isHovering.value) return
  if (showDetailSheet.value) return
  startCarousel()
}

function openDetail(id: string) {
  detailEquipmentId.value = id
  showDetailSheet.value = true
}

function onDetailClose(open: boolean) {
  showDetailSheet.value = open
  if (!open) detailEquipmentId.value = null
}

function scrollPrev() {
  if (items.value.length <= 1) return
  stopCarousel()
  selectedIndex.value =
    (selectedIndex.value - 1 + items.value.length) % items.value.length
  maybeStartCarousel()
}

function scrollNext() {
  if (items.value.length <= 1) return
  stopCarousel()
  selectedIndex.value = (selectedIndex.value + 1) % items.value.length
  maybeStartCarousel()
}

function goToSlide(index: number) {
  if (items.value.length <= 1) return
  stopCarousel()
  selectedIndex.value = index
  maybeStartCarousel()
}

const isEmpty = computed(() => !isLoading.value && items.value.length === 0)

watch(
  () => items.value.length,
  () => {
    if (items.value.length === 0) {
      selectedIndex.value = 0
      stopCarousel()
      return
    }
    if (selectedIndex.value >= items.value.length) {
      selectedIndex.value = 0
    }
    stopCarousel()
    maybeStartCarousel()
  },
  { flush: 'post' },
)

watch(showDetailSheet, (open) => {
  if (open) {
    stopCarousel()
    return
  }
  maybeStartCarousel()
})

watch(operatorId, () => {
  void fetchInventory()
})

onMounted(() => {
  void fetchInventory()
})

onUnmounted(() => {
  stopCarousel()
})
</script>

<template>
  <div class="flex flex-col min-h-0">
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
        <template v-else>
          <div
            class="relative w-full max-w-md mx-auto"
            @mouseenter="isHovering = true; stopCarousel()"
            @mouseleave="isHovering = false; maybeStartCarousel()"
          >
            <div
              v-if="items.length > 1"
              class="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-1"
            >
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
            <div
              v-if="items.length > 1"
              class="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 -mr-1"
            >
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
                  v-for="item in items"
                  :key="item.equipmentId"
                  class="min-w-0 shrink-0 grow-0 basis-full flex justify-center px-2"
                >
                  <button
                    type="button"
                    class="relative w-[min(100%,200px)] aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :aria-label="item.alt"
                    @click="openDetail(item.equipmentId)"
                  >
                    <img
                      v-if="item.imageUrl"
                      :src="item.imageUrl"
                      :alt="item.alt"
                      class="w-full h-full object-cover"
                    >
                    <div
                      v-else
                      class="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/30"
                    >
                      <ImageOff class="h-8 w-8" aria-hidden="true" />
                      <span class="text-xs px-2 text-center">{{ item.alt }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="items.length > 1"
            class="flex gap-1.5 mt-4 justify-center flex-wrap px-2"
            role="tablist"
            :aria-label="t('dashboard.carouselIndicators')"
          >
            <button
              v-for="(_, idx) in items"
              :key="idx"
              type="button"
              class="h-2 w-2 min-h-2 min-w-2 rounded-full transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              :class="idx === selectedIndex ? 'bg-primary' : 'bg-muted-foreground/40'"
              :aria-label="t('dashboard.carouselSlide', { current: idx + 1, total: items.length })"
              :aria-selected="idx === selectedIndex"
              @click="goToSlide(idx)"
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
  </div>
</template>
