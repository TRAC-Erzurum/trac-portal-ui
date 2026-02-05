<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ChevronDown, Building2, Loader2 } from 'lucide-vue-next'
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
  <div v-if="authStore.isAuthenticated && displayBranches.length > 0">
    <div v-if="!branchStore.hasMultipleBranches" class="flex items-center gap-2 px-2 lg:px-3 py-2 text-sm">
      <Building2 class="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span class="font-medium truncate max-w-[100px] lg:max-w-[150px] hidden sm:inline">{{ currentBranchName }}</span>
      <span 
        v-if="branchStore.currentBranch?.isHeadquarters" 
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground flex-shrink-0 hidden lg:inline"
      >
        {{ t('branches.headquarters') }}
      </span>
    </div>
    
    <DropdownMenu v-else>
      <DropdownMenuTrigger 
        class="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        :disabled="isSwitching"
      >
        <Building2 class="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span class="truncate max-w-[80px] lg:max-w-[150px] hidden sm:inline">{{ currentBranchName }}</span>
        <span 
          v-if="branchStore.currentBranch?.isHeadquarters" 
          class="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground flex-shrink-0 hidden lg:inline"
        >
          {{ t('branches.headquarters') }}
        </span>
        <Loader2 v-if="isSwitching" class="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
        <ChevronDown v-else class="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-64">
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
            <div class="flex items-center gap-1 flex-shrink-0">
              <span 
                v-if="branch.isHeadquarters" 
                class="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {{ t('branches.headquarters') }}
              </span>
              <span v-if="branch.id === branchStore.currentBranch?.id" class="text-xs text-muted-foreground">
                ✓
              </span>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
