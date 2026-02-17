<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogOut, TowerControl, UserCircle } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const displayName = computed(() => {
  const user = authStore.user
  if (!user) return ''
  return user.callSign || user.fullName || user.email
})

function handleAccountClick() {
  router.push('/account')
}

function handleCommunicationChannelsClick() {
  router.push('/communication-channels')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="focus:outline-none">
      <UserAvatar 
        :picture="authStore.user?.picture" 
        class="h-8 w-8 cursor-pointer ring-2 ring-zinc-300 dark:ring-zinc-600" 
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="font-normal">
        <div class="flex flex-col space-y-1">
          <p class="text-sm font-medium">{{ displayName }}</p>
          <p v-if="authStore.user?.email" class="text-xs text-muted-foreground truncate">
            {{ authStore.user.email }}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="handleAccountClick" class="cursor-pointer">
        <UserCircle class="mr-2 h-4 w-4" />
        {{ t('nav.account') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="handleCommunicationChannelsClick" class="cursor-pointer">
        <TowerControl class="mr-2 h-4 w-4" />
        {{ t('nav.communicationChannels') }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
        <LogOut class="mr-2 h-4 w-4" />
        {{ t('auth.logout') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
