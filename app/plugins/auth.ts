import { Role } from '~/constants/enums/role'

interface UserData {
  id?: string
  email?: string
  role?: Role
  operator?: any
  [key: string]: any
}

export default defineNuxtPlugin(async (_nuxtApp) => {
  const user = useState<UserData | null>('user', () => null)
  const isAuthenticated = useState<boolean>('isAuthenticated', () => false)
  const isInitialized = useState<boolean>('isInitialized', () => false)

  const api = useApi()

  const checkOperatorStatus = (userData: UserData) => {
    if (userData.role === Role.GUEST) return

    if (!userData.callSign && import.meta.client && window.location.pathname !== '/profile') {
      return navigateTo(`/users/${userData.id}/operator/create`)
    }
  }

  const setUser = (userData: UserData | null) => {
    user.value = userData
    isAuthenticated.value = !!userData

    if (userData && import.meta.client) {
      nextTick(() => {
        checkOperatorStatus(userData)
      })
    }
  }

  const logout = async () => {
    try {
      await api.get('/auth/logout')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
    }
  }

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/check')

      if (response?.user) {
        setUser(response.user)
        return true
      }

      setUser(null)
      return false
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      return false
    } finally {
      isInitialized.value = true
    }
  }

  if (import.meta.client) {
    checkAuth()
      .then((isAuthenticated) => {
        console.debug('Auth initialized:', isAuthenticated)
      })
      .catch((error) => {
        console.error('Auth init failed:', error)
        isInitialized.value = true
      })
  }

  return {
    provide: {
      auth: {
        user,
        isAuthenticated,
        isInitialized,
        logout,
        checkAuth,
      },
    },
  }
})
