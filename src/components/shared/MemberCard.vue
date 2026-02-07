<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ChevronRight, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCallSign } from '@/lib/formatters'
import { getRoleBadgeClass } from '@/lib/ui-helpers'

interface Props {
  id: string
  userId: string
  operatorId?: string
  role: string
  user?: {
    id: string
    fullName?: string
    picture?: string
    globalRole?: string
    operator?: {
      id?: string
      callSign?: string
      prefix?: string
      suffix?: string
    }
  }
  canManage?: boolean
  canChangeRole?: boolean
  canRemove?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canManage: false,
  canChangeRole: false,
  canRemove: false
})

const emit = defineEmits<{
  'role-change': [membershipId: string, role: string]
  'remove': [membershipId: string]
}>()

const { t } = useI18n()
const router = useRouter()

const displayName = computed(() => {
  const op = props.user?.operator
  if (op?.callSign) {
    return formatCallSign({
      callSign: op.callSign ?? '',
      prefix: op.prefix,
      suffix: op.suffix
    })
  }
  return props.user?.fullName || t('common.unknown')
})

const userFullName = computed(() => {
  return props.user?.fullName || ''
})

const handleRoleChange = (role: any) => {
  if (role && typeof role === 'string') {
    emit('role-change', props.id, role)
  }
}

const handleRemove = (e: Event) => {
  e.stopPropagation()
  emit('remove', props.id)
}

const goToDetail = () => {
  const opId = props.operatorId || props.user?.operator?.id
  if (opId) {
    router.push(`/operators/${opId}`)
  }
}
</script>

<template>
  <div class="w-full p-4 rounded-lg border border-border/50 transition-all flex flex-col">
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <UserAvatar :picture="user?.picture" class="h-10 w-10 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold">{{ displayName }}</span>
          <span
            v-if="user?.globalRole === 'super_admin'"
            class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            :class="getRoleBadgeClass('super_admin')"
          >
            {{ t('roles.super_admin') }}
          </span>
          <span
            v-else
            class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            :class="getRoleBadgeClass(role)"
          >
            {{ t(`roles.${role}`) }}
          </span>
        </div>
        <p v-if="userFullName" class="text-sm text-muted-foreground truncate">
          {{ userFullName }}
        </p>
      </div>
    </div>
    <div class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <Select
        v-if="canManage && canChangeRole"
        :model-value="role"
        @update:model-value="handleRoleChange"
      >
        <SelectTrigger class="w-28 h-7">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="volunteer">{{ t('roles.volunteer') }}</SelectItem>
          <SelectItem value="member">{{ t('roles.member') }}</SelectItem>
          <SelectItem value="admin">{{ t('roles.admin') }}</SelectItem>
          <SelectItem value="president">{{ t('roles.president') }}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        v-if="canManage && canRemove"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        @click="handleRemove"
      >
        <Trash2 class="h-3.5 w-3.5 mr-1.5" />
        {{ t('branches.removeMember') }}
      </Button>
      <Button
        v-if="operatorId || user?.operator?.id"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs"
        @click="goToDetail"
      >
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
