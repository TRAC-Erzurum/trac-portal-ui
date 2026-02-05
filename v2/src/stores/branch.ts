import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type ApiError } from '@/lib/api'
import { useAuthStore } from './auth'

export interface BranchCallSign {
  id: string
  callSign: string
  isDefault: boolean
}

export interface Branch {
  id: string
  name: string
  type: 'branch' | 'representative'
  isHeadquarters: boolean
  isActive: boolean
  address?: string
  phone?: string
  email?: string
  callSigns: BranchCallSign[]
  createdAt: string
}

export interface UserBranchMembership {
  id: string
  userId: string
  branchId: string
  role: string
  status: string
  branch: Branch
}

export const useBranchStore = defineStore('branch', () => {
  const currentBranch = ref<Branch | null>(null)
  const userBranches = ref<UserBranchMembership[]>([])
  const isLoading = ref(false)
  const isInitialized = ref(false)

  const hasMultipleBranches = computed(() => userBranches.value.length > 1)
  const approvedBranches = computed(() => 
    userBranches.value.map(m => m.branch).filter(Boolean) as Branch[]
  )

  function decodeJWT(token: string): { currentBranchId?: string } | null {
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url) return null
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  function getCurrentBranchIdFromCookie(): string | null {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(c => c.trim().startsWith('auth_token='))
    if (!authCookie) return null
    
    const token = authCookie.split('=')[1]
    if (!token) return null
    
    const payload = decodeJWT(token)
    return payload?.currentBranchId || null
  }

  function getDefaultBranch(memberships: UserBranchMembership[]): Branch | undefined {
    const headquarters = memberships.find(m => m.branch?.isHeadquarters)?.branch
    if (headquarters) return headquarters
    return memberships[0]?.branch
  }

  async function fetchUserBranches() {
    if (isInitialized.value || isLoading.value) return
    
    isLoading.value = true
    try {
      const response = await api.get<UserBranchMembership[]>('/branches/users/me/branches')
      userBranches.value = response
      
      const branchIdFromCookie = getCurrentBranchIdFromCookie()
      const defaultBranch = getDefaultBranch(response)
      if (branchIdFromCookie) {
        const branch = response.find(m => m.branchId === branchIdFromCookie)?.branch
        if (branch) {
          currentBranch.value = branch
        } else if (defaultBranch) {
          currentBranch.value = defaultBranch
        }
      } else if (defaultBranch) {
        currentBranch.value = defaultBranch
      }
      isInitialized.value = true
    } catch (e) {
      const err = e as ApiError
      console.error('Failed to fetch user branches:', err)
      userBranches.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function setCurrentBranch(branchId: string) {
    isLoading.value = true
    try {
      await api.patch('/user/me/current-branch', { branchId })
      
      const membership = userBranches.value.find(m => m.branchId === branchId)
      if (membership?.branch) {
        currentBranch.value = membership.branch
      }
      
      const authStore = useAuthStore()
      await authStore.checkAuth()
      
      window.location.reload()
    } catch (e) {
      const err = e as ApiError
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function initializeFromJWT() {
    const branchId = getCurrentBranchIdFromCookie()
    const defaultBranch = getDefaultBranch(userBranches.value)
    if (branchId && userBranches.value.length > 0) {
      const membership = userBranches.value.find(m => m.branchId === branchId)
      if (membership?.branch) {
        currentBranch.value = membership.branch
      }
    } else if (defaultBranch) {
      currentBranch.value = defaultBranch
    }
  }

  return {
    currentBranch,
    userBranches,
    isLoading,
    isInitialized,
    hasMultipleBranches,
    approvedBranches,
    fetchUserBranches,
    setCurrentBranch,
    initializeFromJWT
  }
})
