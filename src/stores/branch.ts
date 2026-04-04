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
  operatorId: string
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

  function getCurrentBranchId(): string | null {
    const authStore = useAuthStore()
    return authStore.user?.currentBranchId || null
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
      const response = await api.get<UserBranchMembership[]>('/users/me/branches')
      userBranches.value = response
      
      const branchId = getCurrentBranchId()
      const defaultBranch = getDefaultBranch(response)
      if (branchId) {
        const branch = response.find(m => m.branchId === branchId)?.branch
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
      
      const authStore = useAuthStore()
      if (authStore.user) {
        authStore.user.currentBranchId = branchId
      }
      
      const membership = userBranches.value.find(m => m.branchId === branchId)
      if (membership?.branch) {
        currentBranch.value = membership.branch
      }
    } catch (e) {
      const err = e as ApiError
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function initializeFromJWT() {
    const branchId = getCurrentBranchId()
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
