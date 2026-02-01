<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Radio, UserPlus, Settings, ChevronRight } from 'lucide-vue-next'

interface Activity {
  id: string
  type: string
  entityType: string
  entityId: string | null
  actorCallSign: string | null
  targetCallSign: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

interface Props {
  activities: Activity[]
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const { t } = useI18n()
const router = useRouter()

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('dashboard.timeNow')
  if (diffMins < 60) return t('dashboard.timeMinutes', { count: diffMins })
  if (diffHours < 24) return t('dashboard.timeHours', { count: diffHours })
  if (diffDays === 1) return t('dashboard.timeYesterday')
  return t('dashboard.timeDays', { count: diffDays })
}

const getActivityIcon = (type: string) => {
  if (type.startsWith('net.')) return Radio
  if (type.startsWith('attendee.')) return UserPlus
  return Settings
}

const getActivityText = (activity: Activity) => {
  const { type, actorCallSign, targetCallSign, metadata } = activity
  const netName = metadata?.netName as string || ''

  switch (type) {
    case 'net.started':
      return t('dashboard.activityNetStarted', { name: netName })
    case 'net.ended':
      return t('dashboard.activityNetEnded', { name: netName })
    case 'net.created':
      return t('dashboard.activityNetCreated', { name: netName })
    case 'attendee.added':
      return t('dashboard.activityAttendeeAdded', { callSign: targetCallSign, net: netName })
    default:
      return type
  }
}

const handleClick = (activity: Activity) => {
  if (activity.entityType === 'net' && activity.entityId) {
    router.push(`/nets/${activity.entityId}`)
  }
}
</script>

<template>
  <section>
    <h3 class="text-sm font-medium text-muted-foreground mb-4">
      {{ t('dashboard.recentActivity') }}
    </h3>
    
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3">
        <div class="h-2 w-2 bg-muted rounded-full" />
        <div class="h-4 flex-1 bg-muted animate-pulse rounded" />
        <div class="h-4 w-16 bg-muted animate-pulse rounded" />
      </div>
    </div>
    
    <div v-else-if="activities.length === 0" class="text-sm text-muted-foreground py-4">
      {{ t('dashboard.noActivity') }}
    </div>
    
    <div v-else class="space-y-1">
      <button
        v-for="activity in activities"
        :key="activity.id"
        @click="handleClick(activity)"
        class="w-full flex items-center gap-3 py-2 px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors text-left group"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
        <component 
          :is="getActivityIcon(activity.type)" 
          class="h-4 w-4 text-muted-foreground flex-shrink-0" 
        />
        <span class="flex-1 text-sm truncate">{{ getActivityText(activity) }}</span>
        <span class="text-xs text-muted-foreground flex-shrink-0">{{ formatTime(activity.createdAt) }}</span>
        <ChevronRight class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    </div>
  </section>
</template>
