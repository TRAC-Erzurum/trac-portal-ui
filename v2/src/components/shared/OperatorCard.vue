<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Users, Radio, ChevronRight } from 'lucide-vue-next'
import { UserAvatar } from '@/components/ui/user-avatar'
import { formatCallSign, type CallSignParts } from '@/lib/formatters'
import { getRoleBadgeClass } from '@/lib/ui-helpers'

interface Props {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  city?: string
  district?: string
  attendedCount?: number
  managedCount?: number
  userFullName?: string
  userRole?: string
  userPicture?: string
  showChevron?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showChevron: true
})

const emit = defineEmits<{
  click: [id: string]
}>()

const { t } = useI18n()
const router = useRouter()

const formattedCallSign = computed(() => {
  return formatCallSign(props as CallSignParts)
})

const displayName = computed(() => {
  return props.userFullName || props.fullName || ''
})

const qth = computed(() => {
  const parts = [props.district, props.city].filter(Boolean)
  return parts.join(', ')
})

const handleClick = () => {
  emit('click', props.id)
  router.push(`/operators/${props.id}`)
}
</script>

<template>
  <button
    @click="handleClick"
    class="w-full text-left p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group flex items-center gap-3"
  >
    <UserAvatar :picture="userPicture" class="h-10 w-10 flex-shrink-0" />

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-semibold">{{ formattedCallSign }}</span>
        <span 
          v-if="userRole && userRole !== 'guest'" 
          class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          :class="getRoleBadgeClass(userRole)"
        >
          {{ t(`admin.roles.${userRole}`) }}
        </span>
        <span v-if="(attendedCount && attendedCount > 0) || (managedCount && managedCount > 0)" class="flex items-center gap-2 text-xs text-muted-foreground">
          <span v-if="attendedCount && attendedCount > 0" class="flex items-center gap-0.5">
            <Users class="h-3 w-3" />
            {{ attendedCount }}
          </span>
          <span v-if="managedCount && managedCount > 0" class="flex items-center gap-0.5">
            <Radio class="h-3 w-3" />
            {{ managedCount }}
          </span>
        </span>
      </div>
      <p class="text-sm text-muted-foreground truncate">
        <template v-if="displayName">{{ displayName }}</template>
        <template v-if="displayName && qth"> • </template>
        <template v-if="qth">{{ qth }}</template>
        <template v-if="!displayName && !qth">—</template>
      </p>
    </div>
    
    <ChevronRight 
      v-if="showChevron" 
      class="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
    />
  </button>
</template>
