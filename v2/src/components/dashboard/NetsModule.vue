<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Radio, ChevronRight, Clock, Users, TrendingUp } from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'

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

interface PersonalStats {
  attendedNets: number
  managedNets: number
  streak: number
  averageReadability: number
  averageSignal: number
}

interface Props {
  activeNets: ActiveNet[]
  recentNets: ActiveNet[]
  personalStats: PersonalStats | null
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const { t } = useI18n()
const router = useRouter()

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}s ${mins}dk` : `${hours}s`
}

const hasPersonalStats = computed(() => {
  if (!props.personalStats) return false
  return (
    props.personalStats.attendedNets > 0 ||
    props.personalStats.managedNets > 0 ||
    props.personalStats.streak > 0
  )
})

const goToNet = (netId: string) => {
  router.push(`/nets/${netId}`)
}

const goToAllNets = () => {
  router.push('/nets')
}
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Radio class="h-4 w-4" />
        {{ t('dashboard.nets') }}
      </h3>
      <button 
        @click="goToAllNets"
        class="text-xs text-primary hover:underline flex items-center gap-1"
      >
        {{ t('dashboard.viewAll') }}
        <ChevronRight class="h-3 w-3" />
      </button>
    </div>

    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      <div v-for="i in 3" :key="i" class="p-4 rounded-lg border border-border/50 space-y-2">
        <div class="h-5 w-48 bg-muted animate-pulse rounded" />
        <div class="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    </div>

    <template v-else>
      <div v-if="activeNets.length > 0" class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span class="text-xs font-medium text-green-600 dark:text-green-400">
            {{ t('dashboard.active') }} ({{ activeNets.length }})
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <button
            v-for="net in activeNets"
            :key="net.id"
            @click="goToNet(net.id)"
            class="w-full text-left p-4 rounded-lg border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all group"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ net.name }}</p>
                <p class="text-sm text-muted-foreground">
                  {{ net.frequency }} {{ net.mode }}
                </p>
              </div>
              <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Users class="h-3 w-3" />
                {{ net.attendeeCount }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="h-3 w-3" />
                {{ formatDuration(net.durationMinutes) }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div v-if="recentNets.length > 0 && activeNets.length === 0" class="mb-4">
        <p class="text-xs font-medium text-muted-foreground mb-3">
          {{ t('dashboard.recentCompleted') }}
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          <button
            v-for="net in recentNets"
            :key="net.id"
            @click="goToNet(net.id)"
            class="w-full text-left p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group flex items-center gap-3"
          >
            <Radio class="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ net.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ net.frequency }} {{ net.mode }} • {{ formatDuration(net.durationMinutes) }}
              </p>
            </div>
            <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        </div>
      </div>

      <div v-if="activeNets.length === 0 && recentNets.length === 0" class="py-8 text-center">
        <p class="text-muted-foreground">{{ t('dashboard.noNets') }}</p>
      </div>

      <template v-if="hasPersonalStats">
        <Separator class="my-6" />

        <div>
          <p class="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp class="h-3 w-3" />
            {{ t('dashboard.yourStats') }}
          </p>
          <div class="grid grid-cols-3 gap-3">
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Users class="h-5 w-5 text-muted-foreground" />
                {{ personalStats!.attendedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.attended') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <Radio class="h-5 w-5 text-muted-foreground" />
                {{ personalStats!.managedNets }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.managed') }}</p>
            </div>
            <div class="p-4 rounded-lg border border-border/50 text-center">
              <div class="flex items-center justify-center gap-1 text-2xl font-bold">
                <TrendingUp class="h-5 w-5 text-muted-foreground" />
                {{ personalStats!.streak }}
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ t('dashboard.streak') }}</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </section>
</template>
