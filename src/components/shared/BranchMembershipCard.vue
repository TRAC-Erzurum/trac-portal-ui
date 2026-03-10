<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Building2, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { getRoleBadgeClass } from '@/lib/ui-helpers'

interface Props {
  branchId: string
  branchName: string
  role: string
  globalRole?: string
}

const props = defineProps<Props>()

const { t } = useI18n()
const router = useRouter()

const goToDetail = () => {
  router.push(`/branches/${props.branchId}`)
}
</script>

<template>
  <div class="w-full p-4 rounded-lg border border-border bg-card transition-all flex flex-col text-left">
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Building2 class="h-5 w-5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-medium truncate">{{ branchName }}</p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span
            v-if="globalRole === 'super_admin'"
            class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getRoleBadgeClass('super_admin')"
          >
            {{ t('roles.super_admin') }}
          </span>
          <span
            v-else
            class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getRoleBadgeClass(role)"
          >
            {{ t(`roles.${role}`) }}
          </span>
        </div>
      </div>
    </div>
    <div class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
      <Button variant="outline" size="sm" class="h-7 px-2 text-[10px]" @click="goToDetail">
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
