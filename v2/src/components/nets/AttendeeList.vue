<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Users, MapPin, Edit2, Trash2 } from 'lucide-vue-next'
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
}

interface Props {
  attendees: Attendee[]
  isLoading: boolean
  canManage: boolean
  isActive: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [attendee: Attendee]
  delete: [attendee: Attendee]
}>()

const { t } = useI18n()

const getAttendeeNumber = (index: number, total: number) => {
  return total - index
}
</script>

<template>
  <div v-if="isLoading" class="space-y-2">
    <div v-for="i in 5" :key="i" class="h-16 bg-muted/30 rounded-lg animate-pulse" />
  </div>

  <div v-else-if="attendees.length === 0" class="text-center py-12 text-muted-foreground">
    <Users class="h-12 w-12 mx-auto mb-4 opacity-30" />
    <p>{{ t('netDetail.noAttendees') }}</p>
  </div>

  <div v-else class="space-y-1">
    <div
      v-for="(attendee, index) in attendees"
      :key="attendee.id"
      class="group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
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

      <div v-if="canManage && isActive" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          @click="emit('edit', attendee)"
        >
          <Edit2 class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-destructive hover:text-destructive"
          @click="emit('delete', attendee)"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
