<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { UserCircle, LogOut } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const avatarText = computed(() => {
  const user = authStore.user
  if (!user) return '?'
  if (user.callSign) return user.callSign
  if (user.fullName) {
    const parts = user.fullName.split(' ')
    return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }
  return user.email?.[0]?.toUpperCase() || '?'
})

const displayName = computed(() => {
  const user = authStore.user
  if (!user) return ''
  return user.callSign || user.fullName || user.email
})

const avatarUrl = computed(() => {
  const picture = authStore.user?.picture
  if (!picture) return null
  if (picture.startsWith('http')) return picture
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  return `${baseUrl}${picture}`
})

function handleAccountClick() {
  if (authStore.isGuest) {
    toast.error(t('error.guestRestriction'))
    return
  }
  router.push('/account')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="focus:outline-none">
      <div class="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center cursor-pointer overflow-hidden">
        <img v-if="avatarUrl" :src="avatarUrl" class="h-full w-full object-cover" />
        <span v-else>{{ avatarText.slice(0, 2) }}</span>
      </div>
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
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
        <LogOut class="mr-2 h-4 w-4" />
        {{ t('auth.logout') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
