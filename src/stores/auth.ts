import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type ApiError } from '@/lib/api'
import type { UserRole } from '@/lib/ui-helpers'

export type { UserRole }

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 6,
  president: 5,
  admin: 4,
  member: 3,
  volunteer: 2,
  guest: 1,
}

export interface Operator {
  id: string
  callSign: string
  prefix?: string
  suffix?: string
  fullName?: string
  country?: string
  city?: string
  district?: string
  gridSquare?: string
}

export interface User {
  id: string
  email: string
  callSign?: string
  fullName?: string
  role: UserRole
  picture?: string
  createdAt?: string
  operator?: Operator
  currentBranchId?: string | null
  branchMemberships?: {
    branchId: string
    role: string
    status?: string
    isHeadquarters?: boolean
  }[]
}

interface AuthCheckResponse {
  user: User
}

interface RegisterData {
  email: string
  callSign: string
  password: string
  branchIds?: string[]
  fullName?: string
  city?: string
  district?: string
  country?: string
  gridSquare?: string
  captchaToken?: string
  privacyAccepted: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)
  const isTemporaryPassword = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isGuest = computed(() => user.value?.role === 'guest')
  const isVolunteer = computed(() => hasRole('volunteer'))
  const isAdmin = computed(() => hasRole('admin'))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  /** Genel Merkez şubesinde onaylı şube yöneticisi veya başkan (API ile aynı mantık). */
  const isHeadquartersLeader = computed(() => {
    const list = user.value?.branchMemberships ?? []
    return list.some(
      x =>
        x.status === 'approved' &&
        (x.role === 'admin' || x.role === 'president') &&
        x.isHeadquarters === true,
    )
  })

  /** Yerel şube lideri veya GM lideri: o şubede yönetici yetkisi (UI, API guard’ları ile uyumlu). */
  function canLeadBranch(branchId: string): boolean {
    if (!branchId) return false
    if (isSuperAdmin.value) return true
    const list = user.value?.branchMemberships ?? []
    const local = list.some(
      x =>
        x.branchId === branchId &&
        x.status === 'approved' &&
        (x.role === 'admin' || x.role === 'president'),
    )
    if (local) return true
    return isHeadquartersLeader.value
  }

  /** Sistem yöneticisi; veya kullanıcı kaydında `role === 'admin'` (şube üyeliğindeki yönetici değil); veya onaylı şube yöneticisi/başkan — talep kuyruğu, operatör import vb. */
  const canManageRequestQueues = computed(() => {
    if (isSuperAdmin.value || isAdmin.value) return true
    const m = user.value?.branchMemberships ?? []
    return m.some(
      x =>
        x.status === 'approved' && (x.role === 'admin' || x.role === 'president')
    )
  })

  function hasRole(minRole: UserRole): boolean {
    if (!user.value) return false
    const userLevel = ROLE_HIERARCHY[user.value.role] || 0
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= requiredLevel
  }

  interface LoginResponse {
    isTemporaryPassword?: boolean
  }

  async function login(identifier: string, password: string, captchaToken?: string): Promise<LoginResponse> {
    error.value = null
    try {
      const response = await api.post<LoginResponse>('/auth/login', { identifier, password, captchaToken })
      isTemporaryPassword.value = response.isTemporaryPassword || false
      await checkAuth()
      return response
    } catch (e) {
      const err = e as ApiError
      error.value = err.message
      throw err
    }
  }

  async function register(data: RegisterData) {
    error.value = null
    try {
      await api.post('/auth/register', data)
      await checkAuth()
    } catch (e) {
      const err = e as ApiError
      error.value = err.message
      throw err
    }
  }

  async function logout() {
    try {
      await api.get('/auth/logout')
    } catch {
    } finally {
      user.value = null
      isTemporaryPassword.value = false
    }
  }

  async function checkAuth() {
    try {
      const response = await api.get<AuthCheckResponse>('/auth/check')
      user.value = response.user
    } catch {
      user.value = null
      isTemporaryPassword.value = false
    }
  }

  function clearTemporaryPassword() {
    isTemporaryPassword.value = false
  }

  async function initialize() {
    await checkAuth()
    isInitialized.value = true
  }

  return {
    user,
    error,
    isAuthenticated,
    isGuest,
    isVolunteer,
    isAdmin,
    isSuperAdmin,
    isHeadquartersLeader,
    canLeadBranch,
    canManageRequestQueues,
    isInitialized,
    isTemporaryPassword,
    hasRole,
    login,
    register,
    logout,
    checkAuth,
    initialize,
    clearTemporaryPassword
  }
})
