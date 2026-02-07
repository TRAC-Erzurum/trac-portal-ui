<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Building2, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

interface Props {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  callSigns: BranchCallSign[]
}

const props = defineProps<Props>()

const { t } = useI18n()
const router = useRouter()

const goToDetail = () => {
  router.push(`/branches/${props.id}`)
}

const allCallSigns = computed(() => {
  if (props.callSigns.length === 0) return '-'
  return props.callSigns.map(cs => cs.callSign).join('  ') // double space as separator
})

const typeLabel = computed(() => {
  return props.type === 'branch' ? t('branches.typeBranch') : t('branches.typeRepresentative')
})

</script>

<template>
  <div
    class="w-full text-left p-4 rounded-lg border transition-all flex flex-col"
    :class="[
      isActive 
        ? 'border-border/50' 
        : 'border-red-200/50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20 opacity-60',
      isHeadquarters && 'border-primary/30 bg-primary/5'
    ]"
  >
    <div class="flex items-start gap-3 flex-1 min-w-0">
      <div class="mt-0.5 flex-shrink-0">
        <Building2 
          class="h-5 w-5 transition-colors"
          :class="isActive ? 'text-muted-foreground' : 'text-red-500/60'" 
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <p 
            class="font-semibold truncate"
            :class="!isActive && 'line-through text-muted-foreground'"
          >
            {{ name }}
          </p>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span
              v-if="!isActive"
              class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-400"
            >
              {{ t('branches.deleted') }}
            </span>
            <span
              v-else-if="isHeadquarters"
              class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary"
            >
              {{ t('branches.headquarters') }}
            </span>
            <span
              v-else
              class="text-[10px] font-medium px-1.5 py-0.5 rounded"
              :class="type === 'branch' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'"
            >
              {{ typeLabel }}
            </span>
          </div>
        </div>
        <p v-if="!isHeadquarters" class="text-sm text-muted-foreground mt-1 truncate">
          {{ allCallSigns }}
        </p>
      </div>
    </div>
    <div class="mt-auto flex items-center justify-end gap-1 pt-1.5 pb-0 border-t border-border/30">
      <slot name="actions" />
      <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="goToDetail">
        <ChevronRight class="h-3.5 w-3.5 mr-1.5" />
        {{ t('common.detail') }}
      </Button>
    </div>
  </div>
</template>
