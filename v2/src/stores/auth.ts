import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type ApiError } from '@/lib/api'

export type UserRole = 'super_admin' | 'admin' | 'member' | 'volunteer' | 'guest'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  member: 2,
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
  id: number
  email: string
  callSign?: string
  fullName?: string
  role: UserRole
  picture?: string
  createdAt?: string
  operator?: Operator
}

interface AuthCheckResponse {
  user: User
}

interface RegisterData {
  email: string
  callSign: string
  password: string
  fullName?: string
  city?: string
  district?: string
  country?: string
  captchaToken?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isInitialized = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isGuest = computed(() => user.value?.role === 'guest')
  const isVolunteer = computed(() => hasRole('volunteer'))
  const isAdmin = computed(() => hasRole('admin'))
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  function hasRole(minRole: UserRole): boolean {
    if (!user.value) return false
    const userLevel = ROLE_HIERARCHY[user.value.role] || 0
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= requiredLevel
  }

  async function login(identifier: string, password: string, captchaToken?: string) {
    error.value = null
    try {
      await api.post('/auth/login', { identifier, password, captchaToken })
      await checkAuth()
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
    }
  }

  async function checkAuth() {
    try {
      const response = await api.get<AuthCheckResponse>('/auth/check')
      user.value = response.user
    } catch {
      user.value = null
    }
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
    isInitialized,
    hasRole,
    login,
    register,
    logout,
    checkAuth,
    initialize
  }
})
