<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Radio, Clock, Users } from 'lucide-vue-next'

interface ActiveNet {
  id: string
  name: string
  frequency: string
  mode: string
  operatorCallSign: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
}

interface PendingNet {
  id: string
  name: string
  frequency: string
  mode: string
  operatorCallSign: string
}

interface DisplayNet {
  id: string
  name: string
  frequency: string
  mode: string
  operatorCallSign: string
  status: 'active' | 'pending' | 'completed'
  attendeeCount?: number
  durationMinutes?: number
}

interface Props {
  activeNets: ActiveNet[]
  pendingNets: PendingNet[]
  recentNets: ActiveNet[]
  isLoading?: boolean
  maxNets?: number
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  maxNets: 3,
})

const { t } = useI18n()
const router = useRouter()

const displayNets = computed<DisplayNet[]>(() => {
  const result: DisplayNet[] = []
  const max = props.maxNets
  
  for (const net of props.activeNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      frequency: net.frequency,
      mode: net.mode,
      operatorCallSign: net.operatorCallSign,
      status: 'active',
      attendeeCount: net.attendeeCount,
      durationMinutes: net.durationMinutes,
    })
  }
  
  for (const net of props.pendingNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      frequency: net.frequency,
      mode: net.mode,
      operatorCallSign: net.operatorCallSign,
      status: 'pending',
    })
  }
  
  for (const net of props.recentNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      frequency: net.frequency,
      mode: net.mode,
      operatorCallSign: net.operatorCallSign,
      status: 'completed',
      attendeeCount: net.attendeeCount,
      durationMinutes: net.durationMinutes,
    })
  }
  
  return result
})

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}s ${mins}dk` : `${hours}s`
}

const goToNet = (netId: string) => {
  router.push(`/nets/${netId}`)
}

const getNetClasses = (status: 'active' | 'pending' | 'completed') => {
  switch (status) {
    case 'active':
      return 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
    case 'pending':
      return 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
    case 'completed':
      return 'border-border/50 hover:border-border hover:bg-muted/30'
  }
}

const getStatusLabel = (status: 'active' | 'pending' | 'completed') => {
  switch (status) {
    case 'active':
      return t('dashboard.active')
    case 'pending':
      return t('dashboard.pending')
    case 'completed':
      return t('dashboard.completed')
  }
}
</script>

<template>
  <section>
    <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
      <Radio class="h-4 w-4" />
      {{ t('dashboard.nets') }}
    </h3>

    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div v-for="i in 3" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
        <div class="h-5 w-48 bg-muted animate-pulse rounded" />
        <div class="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    </div>

    <template v-else>
      <div v-if="displayNets.length > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <button
          v-for="net in displayNets"
          :key="net.id"
          @click="goToNet(net.id)"
          class="w-full text-left p-4 rounded-lg border transition-all"
          :class="getNetClasses(net.status)"
        >
          <div class="flex items-start gap-3">
            <div class="mt-1 flex-shrink-0">
              <span v-if="net.status === 'active'" class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span v-else-if="net.status === 'pending'" class="relative flex h-2.5 w-2.5">
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span v-else class="relative flex h-2.5 w-2.5">
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/50"></span>
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium truncate">{{ net.name }}</p>
                <span 
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                  :class="{
                    'bg-green-500/20 text-green-700 dark:text-green-400': net.status === 'active',
                    'bg-blue-500/20 text-blue-700 dark:text-blue-400': net.status === 'pending',
                    'bg-muted text-muted-foreground': net.status === 'completed'
                  }"
                >
                  {{ getStatusLabel(net.status) }}
                </span>
              </div>
              <p class="text-sm text-muted-foreground mt-0.5">
                {{ net.operatorCallSign }} · {{ net.frequency }} {{ net.mode }}
              </p>
              <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground min-h-[1rem]">
                <template v-if="net.status !== 'pending'">
                  <span v-if="net.attendeeCount !== undefined" class="flex items-center gap-1">
                    <Users class="h-3 w-3" />
                    {{ net.attendeeCount }}
                  </span>
                  <span v-if="net.durationMinutes !== undefined" class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ formatDuration(net.durationMinutes) }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('dashboard.noNets') }}</p>
      </div>
    </template>
  </section>
</template>
