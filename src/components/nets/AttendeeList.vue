<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Award, Edit2, MapPin, Trash2, User, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'

interface Attendee {
  id: string
  callSign: string
  name?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
  createdAt: string
  picture?: string | null
  operatorId?: string
}

interface Props {
  attendees: Attendee[]
  isLoading: boolean
  canManage: boolean
  isActive: boolean
  showCertificateDownload?: boolean
  canDownloadOthersCertificates?: boolean
  currentUserOperatorId?: string
}

const props = withDefaults(defineProps<Props>(), {
  showCertificateDownload: false,
  canDownloadOthersCertificates: false
})

const emit = defineEmits<{
  edit: [attendee: Attendee]
  delete: [attendee: Attendee]
  downloadCertificate: [attendee: Attendee]
}>()

const { t } = useI18n()
const router = useRouter()

const goToProfile = (attendee: Attendee) => {
  if (attendee.operatorId) {
    router.push(`/operators/${attendee.operatorId}`)
  }
}

const VIRTUAL_THRESHOLD = 50
const ITEM_HEIGHT = 68
const BUFFER_SIZE = 5

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(600)

const useVirtualScroll = computed(() => props.attendees.length > VIRTUAL_THRESHOLD)

const totalHeight = computed(() => props.attendees.length * ITEM_HEIGHT)

const visibleRange = computed(() => {
  if (!useVirtualScroll.value) {
    return { start: 0, end: props.attendees.length }
  }

  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER_SIZE)
  const visibleCount = Math.ceil(containerHeight.value / ITEM_HEIGHT) + BUFFER_SIZE * 2
  const end = Math.min(props.attendees.length, start + visibleCount)

  return { start, end }
})

const visibleAttendees = computed(() => {
  const { start, end } = visibleRange.value
  return props.attendees.slice(start, end).map((attendee, i) => ({
    ...attendee,
    originalIndex: start + i
  }))
})

const offsetY = computed(() => visibleRange.value.start * ITEM_HEIGHT)

const getAttendeeNumber = (index: number, total: number) => {
  return total - index
}

const showCertificateDownloadFor = (attendee: Attendee) => {
  if (!props.showCertificateDownload) return false
  if (props.canDownloadOthersCertificates) return true
  return !!props.currentUserOperatorId && attendee.operatorId === props.currentUserOperatorId
}

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}

const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

watch(() => props.attendees.length, () => {
  if (containerRef.value) {
    containerRef.value.scrollTop = 0
    scrollTop.value = 0
  }
})

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<template>
  <div v-if="isLoading" class="space-y-2">
    <div v-for="i in 5" :key="i" class="h-16 bg-muted/30 rounded-lg animate-pulse" />
  </div>

  <div v-else-if="attendees.length === 0" class="text-center py-4 text-muted-foreground">
    <Users class="h-8 w-8 mx-auto mb-2 opacity-30" />
    <p class="text-sm">{{ t('netDetail.noAttendees') }}</p>
  </div>

  <div
    v-else-if="useVirtualScroll"
    ref="containerRef"
    class="max-h-[600px] overflow-y-auto"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)` }" class="space-y-1">
        <div
          v-for="attendee in visibleAttendees"
          :key="attendee.id"
          class="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
          :style="{ height: `${ITEM_HEIGHT - 4}px` }"
        >
          <div class="relative flex-shrink-0">
            <UserAvatar :picture="attendee.picture" class="h-8 w-8" />
            <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 ring-2 ring-background">
              {{ getAttendeeNumber(attendee.originalIndex, attendees.length) }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span class="font-semibold">{{ attendee.callSign }}</span>
              <span v-if="attendee.name" class="text-sm text-muted-foreground">{{ attendee.name }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
              <span v-if="attendee.city || attendee.district" class="flex items-center gap-1">
                <MapPin class="h-3 w-3 flex-shrink-0" />
                {{ [attendee.city, attendee.district].filter(Boolean).join(', ') }}
              </span>
              <span>
                {{ t('operators.readability') }}: {{ attendee.readability }}, 
                {{ t('operators.signal') }}: {{ attendee.signalStrength }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              v-if="attendee.operatorId"
              variant="outline"
              size="icon"
              class="h-8 w-8"
              :title="t('common.profile')"
              :aria-label="t('common.profile')"
              @click="goToProfile(attendee)"
            >
              <User class="h-4 w-4" />
            </Button>
            <Button
              v-if="showCertificateDownloadFor(attendee)"
              variant="outline"
              size="icon"
              class="h-8 w-8"
              :title="t('certificates.download')"
              :aria-label="t('certificates.download')"
              @click="emit('downloadCertificate', attendee)"
            >
              <Award class="h-4 w-4" />
            </Button>
            <template v-if="canManage && isActive">
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8"
                @click="emit('edit', attendee)"
              >
                <Edit2 class="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8 text-destructive hover:text-destructive"
                @click="emit('delete', attendee)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="space-y-1">
    <div
      v-for="(attendee, index) in attendees"
      :key="attendee.id"
      class="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
    >
      <div class="relative flex-shrink-0">
        <UserAvatar :picture="attendee.picture" class="h-8 w-8" />
        <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 ring-2 ring-background">
          {{ getAttendeeNumber(index, attendees.length) }}
        </span>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span class="font-semibold">{{ attendee.callSign }}</span>
          <span v-if="attendee.name" class="text-sm text-muted-foreground">{{ attendee.name }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
          <span v-if="attendee.city || attendee.district" class="flex items-center gap-1">
            <MapPin class="h-3 w-3 flex-shrink-0" />
            {{ [attendee.city, attendee.district].filter(Boolean).join(', ') }}
          </span>
          <span>
            {{ t('operators.readability') }}: {{ attendee.readability }}, 
            {{ t('operators.signal') }}: {{ attendee.signalStrength }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0">
        <Button
          v-if="attendee.operatorId"
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :title="t('common.profile')"
          :aria-label="t('common.profile')"
          @click="goToProfile(attendee)"
        >
          <User class="h-4 w-4" />
        </Button>
        <Button
          v-if="showCertificateDownloadFor(attendee)"
          variant="outline"
          size="icon"
          class="h-8 w-8"
          :title="t('certificates.download')"
          :aria-label="t('certificates.download')"
          @click="emit('downloadCertificate', attendee)"
        >
          <Award class="h-4 w-4" />
        </Button>
        <template v-if="canManage && isActive">
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            @click="emit('edit', attendee)"
          >
            <Edit2 class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8 text-destructive hover:text-destructive"
            @click="emit('delete', attendee)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </template>
      </div>
    </div>
  </div>
</template>
