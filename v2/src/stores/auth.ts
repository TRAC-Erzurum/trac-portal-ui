import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type ApiError } from '@/lib/api'

export interface User {
  id: number
  email: string
  callSign?: string
  fullName?: string
  role: string
  picture?: string
  createdAt?: string
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
    isInitialized,
    login,
    register,
    logout,
    checkAuth,
    initialize
  }
})
