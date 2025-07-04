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

  console.debug(
    'Auth plugin defined',
    'User:',
    user.value,
    'isAuthenticated:',
    isAuthenticated.value,
    'API:',
    api
  )

  const checkOperatorStatus = (userData: UserData) => {
    console.debug('checking operator status for', userData)
    if (userData.role === Role.GUEST) {
      console.debug('user is guest')
      return
    }

    if (!userData.callSign && window.location.pathname !== '/profile') {
      console.debug('user has no call sign, navigating to create operator')
      return navigateTo(`/users/${userData.id}/operator/create`)
    }
  }

  const setUser = (userData: UserData | null) => {
    console.debug('setting user to', userData)
    user.value = userData
    isAuthenticated.value = !!userData
    console.debug('isAuthenticated', isAuthenticated.value)
    if (userData && import.meta.client) {
      console.debug('userData', userData)
      checkOperatorStatus(userData)
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
    // Prevent multiple simultaneous auth checks
    if (isInitialized.value) {
      return isAuthenticated.value
    }

    try {
      const response = await api.get('/auth/check')
      console.debug('checkAuth response', response)
      if (response?.user) {
        console.debug('auth checked, setting user', response.user)
        setUser(response.user)
        return true
      }
      console.debug('auth checked, setting user to null')
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

  // Initialize auth on both server and client
  console.debug('initializing auth')

  try {
    const isUserAuthenticated = await checkAuth()
    console.debug('Init auth completed', isUserAuthenticated)
  } catch (error) {
    console.error('Init auth failed:', error)
    isInitialized.value = true
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
