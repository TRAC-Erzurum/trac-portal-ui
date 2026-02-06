<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Building2, ChevronRight } from 'lucide-vue-next'
import { getRoleBadgeClass } from '@/lib/ui-helpers'

interface Props {
  branchId: string
  branchName: string
  role: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const router = useRouter()

const handleClick = () => {
  router.push(`/branches/${props.branchId}`)
}
</script>

<template>
  <button
    @click="handleClick"
    class="w-full p-1.5 rounded border border-border/50 hover:border-border hover:bg-muted/30 transition-all group flex flex-col gap-1"
  >
    <div class="flex items-center gap-1.5 min-w-0">
      <Building2 class="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <p class="text-xs font-medium truncate flex-1">{{ branchName }}</p>
      <ChevronRight class="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
    <span 
      class="px-1 py-0.5 rounded-full text-[9px] font-medium self-start"
      :class="getRoleBadgeClass(role)"
    >
      {{ t(`roles.${role}`) }}
    </span>
  </button>
</template>
