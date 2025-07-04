import { Role, roleHierarchy } from '~/constants/enums/role'

export default defineNuxtRouteMiddleware(async (to) => {
  const { $auth } = useNuxtApp()

  console.debug('global auth middleware', to)

  // Wait for auth initialization if not already initialized
  if (!$auth.isInitialized.value) {
    console.debug('waiting for auth initialization...')
    await new Promise((resolve) => {
      const checkInitialized = () => {
        if ($auth.isInitialized.value) {
          resolve(true)
        } else {
          setTimeout(checkInitialized, 50)
        }
      }
      checkInitialized()
    })
  }

  // Handle login page when already authenticated
  if (to.path === '/login' && $auth.isAuthenticated.value) {
    console.debug('redirecting to home', $auth.isAuthenticated.value)
    return navigateTo('/')
  }

  // Allow public pages and home page
  if (['/login', '/register', '/', '/privacy-policy'].includes(to.path)) {
    console.debug('allowing public page')
    return
  }

  // Check if page requires authentication
  const requiresAuth = to.meta.requiresAuth !== false // Default to true unless explicitly set to false

  if (requiresAuth) {
    console.debug('checking auth for protected page')

    if (!$auth.isAuthenticated.value) {
      console.debug('redirecting to login since not authenticated')
      return navigateTo(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
    }

    // Check role-based access
    const userRole = $auth.user.value?.role
    const requiredRoles = to.meta.roles as Role[]

    console.debug('userRole', userRole)
    console.debug('requiredRoles', requiredRoles)

    if (
      requiredRoles &&
      (!userRole || !requiredRoles.some((role) => roleHierarchy[userRole].includes(role)))
    ) {
      console.debug('redirecting to 403 - insufficient role')
      return navigateTo('/403')
    }
  }
})
