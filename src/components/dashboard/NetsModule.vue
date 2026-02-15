<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Radio } from 'lucide-vue-next'
import { NetCard, NetCardSkeleton } from '@/components/shared'

interface ActiveNet {
  id: string
  name: string
  operatorCallSign: string
  attendeeCount: number
  startedAt: string
  durationMinutes: number
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
  }
}

interface PendingNet {
  id: string
  name: string
  operatorCallSign: string
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
  }
}

interface CancelledNet {
  id: string
  name: string
  operatorCallSign: string
  endedAt?: string
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
  }
}

interface DisplayNet {
  id: string
  name: string
  operatorCallSign: string
  status: 'active' | 'pending' | 'completed' | 'cancelled'
  attendeeCount?: number
  durationMinutes?: number
  endedAt?: string
  branch?: {
    id: string
    name: string
    isHeadquarters?: boolean
  }
  branchCallSign?: {
    id: string
    callSign: string
  }
}

interface Props {
  activeNets: ActiveNet[]
  pendingNets: PendingNet[]
  recentNets: ActiveNet[]
  cancelledNets: CancelledNet[]
  isLoading?: boolean
  maxNets?: number
}

const props = withDefaults(defineProps<Props>(), {
  cancelledNets: () => [],
  isLoading: false,
  maxNets: 3,
})

const { t } = useI18n()

const displayNets = computed<DisplayNet[]>(() => {
  const result: DisplayNet[] = []
  const max = props.maxNets
  
  for (const net of props.activeNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      operatorCallSign: net.operatorCallSign,
      status: 'active',
      attendeeCount: net.attendeeCount,
      durationMinutes: net.durationMinutes,
      branch: net.branch,
      branchCallSign: net.branchCallSign,
    })
  }
  
  for (const net of props.pendingNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      operatorCallSign: net.operatorCallSign,
      status: 'pending',
      branch: net.branch,
      branchCallSign: net.branchCallSign,
    })
  }
  
  for (const net of props.recentNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      operatorCallSign: net.operatorCallSign,
      status: 'completed',
      attendeeCount: net.attendeeCount,
      durationMinutes: net.durationMinutes,
      branch: net.branch,
      branchCallSign: net.branchCallSign,
    })
  }

  for (const net of props.cancelledNets) {
    if (result.length >= max) break
    result.push({
      id: net.id,
      name: net.name,
      operatorCallSign: net.operatorCallSign,
      status: 'cancelled',
      endedAt: net.endedAt,
      branch: net.branch,
      branchCallSign: net.branchCallSign,
    })
  }

  return result
})

</script>

<template>
  <section>
    <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-4">
      <Radio class="h-4 w-4" />
      {{ t('dashboard.nets') }}
    </h3>

    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <NetCardSkeleton v-for="i in 3" :key="i" compact />
    </div>

    <template v-else>
      <div v-if="displayNets.length > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NetCard
          v-for="net in displayNets"
          :key="net.id"
          :id="net.id"
          :name="net.name"
          :operator-call-sign="net.operatorCallSign"
          :status="net.status"
          :attendee-count="net.attendeeCount"
          :duration-minutes="net.durationMinutes"
          :ended-at="net.endedAt"
          :branch-name="net.branch?.name"
          :branch-call-sign="net.branchCallSign?.callSign"
          :branch-is-headquarters="net.branch?.isHeadquarters"
          :show-branch="true"
        />
      </div>

      <div v-else class="py-4 text-center">
        <p class="text-sm text-muted-foreground">{{ t('dashboard.noNets') }}</p>
      </div>
    </template>
  </section>
</template>
