import { Role, roleHierarchy } from '~/constants/enums/role'

export default defineNuxtRouteMiddleware(async (to) => {
  const { $auth } = useNuxtApp()

  console.debug('global auth middleware', to.path, 'initialized:', $auth.isInitialized.value)

  // Wait for auth initialization if not ready
  if (!$auth.isInitialized.value) {
    console.debug('waiting for auth initialization...')
    let attempts = 0
    while (!$auth.isInitialized.value && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      attempts++
    }
  }

  // Handle login page when already authenticated
  if (to.path === '/login' && $auth.isAuthenticated.value) {
    console.debug('redirecting to home', $auth.isAuthenticated.value)
    return navigateTo('/')
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/', '/privacy-policy', '/403']
  const isPublicRoute = publicRoutes.includes(to.path) || to.meta.requiresAuth === false

  if (isPublicRoute) {
    console.debug('allowing public route:', to.path)
    return
  }

  // Check authentication for protected routes
  console.debug('checking auth for protected route:', to.path)

  if (!$auth.isAuthenticated.value) {
    console.debug('not authenticated, redirecting to login')
    return navigateTo(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
  }

  // Check role-based access
  const userRole = $auth.user.value?.role
  const requiredRoles = to.meta.roles as Role[]

  console.debug('userRole:', userRole, 'requiredRoles:', requiredRoles)

  if (
    requiredRoles &&
    (!userRole || !requiredRoles.some((role) => roleHierarchy[userRole].includes(role)))
  ) {
    console.debug('insufficient role, redirecting to 403')
    return navigateTo('/403')
  }
})
