<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Trash2 } from 'lucide-vue-next'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
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
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canManage: false,
  canChangeRole: false,
  canRemove: false,
  clickable: true
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

function handleClick() {
  if (!props.clickable) return
  
  const opId = props.operatorId || props.user?.operator?.id
  if (opId) {
    router.push(`/operators/${opId}`)
  }
}
</script>

<template>
  <div
    class="w-full p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all flex items-center gap-3 group"
    :class="{ 'cursor-pointer': clickable && (operatorId || user?.operator?.id) }"
    @click="handleClick"
  >
    <UserAvatar :picture="user?.picture" class="h-10 w-10 flex-shrink-0" />

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-semibold">{{ displayName }}</span>
        <span 
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

    <div v-if="canManage" class="flex items-center gap-2 flex-shrink-0">
      <Select
        v-if="canChangeRole"
        :model-value="role"
        @update:model-value="handleRoleChange"
      >
        <SelectTrigger class="w-28 h-8">
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
        v-if="canRemove"
        variant="outline"
        size="sm"
        class="text-red-600 hover:text-red-700 h-8"
        @click="handleRemove"
      >
        <Trash2 class="h-3.5 w-3.5 mr-1" />
        {{ t('branches.removeMember') }}
      </Button>
    </div>
  </div>
</template>
