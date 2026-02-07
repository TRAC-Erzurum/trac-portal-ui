<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, Radio, Users } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useI18n } from 'vue-i18n'
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
  userPicture?: string
  globalRole?: string
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

const goToDetail = () => {
  emit('click', props.id)
  router.push(`/operators/${props.id}`)
}

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

</script>

<template>
  <div class="w-full text-left p-4 rounded-lg border border-border/50 transition-all flex flex-col">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <UserAvatar :picture="userPicture" class="h-10 w-10 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold">{{ formattedCallSign }}</span>
          <span
            v-if="globalRole === 'super_admin'"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            :class="getRoleBadgeClass('super_admin')"
          >
            {{ t('roles.super_admin') }}
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
    </div>
    <div v-if="showChevron || $slots.actions" class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
      <Button v-if="showChevron" variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="goToDetail">
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
