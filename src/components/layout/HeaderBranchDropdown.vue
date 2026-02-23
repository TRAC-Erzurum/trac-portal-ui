<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronDown, Loader2 } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBranchStore } from '@/stores/branch'
import { useAuthStore } from '@/stores/auth'
import { translateError } from '@/i18n'

defineProps<{
  /** When true, only logo + chevron shown (e.g. mobile header) */
  compact?: boolean
}>()

const { t } = useI18n()
const branchStore = useBranchStore()
const authStore = useAuthStore()

const isSwitching = computed(() => branchStore.isLoading)

const currentBranchName = computed(() => {
  return branchStore.currentBranch?.name || ''
})

const displayBranches = computed(() => {
  return branchStore.approvedBranches
})

async function handleBranchSelect(branchId: string) {
  if (branchId === branchStore.currentBranch?.id) return
  
  try {
    await branchStore.setCurrentBranch(branchId)
    toast.success(t('branch.switchBranchSuccess'))
  } catch (error: any) {
    toast.error(translateError(error.message || t('error.somethingWentWrong')))
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    branchStore.fetchUserBranches()
  }
})
</script>

<template>
  <div v-if="authStore.isAuthenticated && displayBranches.length > 0" class="w-full">
    <div v-if="!branchStore.hasMultipleBranches" class="flex items-center gap-3 px-3 py-2 text-sm">
      <img src="/logo-s.svg" alt="TRAC" class="h-6 w-6 flex-shrink-0" />
      <span v-if="!compact" class="font-medium truncate">{{ currentBranchName }}</span>
    </div>
    
    <DropdownMenu v-else>
      <DropdownMenuTrigger 
        class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors focus:outline-none focus:ring-0"
        :disabled="isSwitching"
      >
        <img src="/logo-s.svg" alt="TRAC" class="h-6 w-6 flex-shrink-0" />
        <span v-if="!compact" class="truncate flex-1 text-left">{{ currentBranchName }}</span>
        <Loader2 v-if="isSwitching" class="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
        <ChevronDown v-else class="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" class="w-56">
        <DropdownMenuLabel>{{ t('branch.selectBranch') }}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          v-for="branch in displayBranches"
          :key="branch.id"
          :class="[
            'cursor-pointer',
            branch.id === branchStore.currentBranch?.id && 'bg-accent'
          ]"
          @click="handleBranchSelect(branch.id)"
        >
          <div class="flex items-center justify-between w-full gap-2">
            <span class="truncate">{{ branch.name }}</span>
            <span v-if="branch.id === branchStore.currentBranch?.id" class="text-xs text-muted-foreground flex-shrink-0">
              ✓
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
