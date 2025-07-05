import { Role, roleHierarchy } from '~/constants/enums/role'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server-side to prevent SSR redirect issues
  if (process.server) return

  const { $auth } = useNuxtApp()

  // Wait for auth initialization if not ready
  if (!$auth.isInitialized.value) {
    let attempts = 0
    const maxAttempts = 200 // 10 seconds

    while (!$auth.isInitialized.value && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      attempts++
    }

    if (!$auth.isInitialized.value) {
      console.warn('Auth initialization timed out')
    }
  }

  // Handle login page when already authenticated
  if (to.path === '/login' && $auth.isAuthenticated.value) {
    const returnUrl = to.query.returnUrl as string
    if (returnUrl) {
      return navigateTo(decodeURIComponent(returnUrl))
    }
    return navigateTo('/')
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/', '/privacy-policy', '/403']
  const isPublicRoute = publicRoutes.includes(to.path) || to.meta.requiresAuth === false

  if (isPublicRoute) return

  // Check authentication for protected routes
  if (!$auth.isAuthenticated.value) {
    return navigateTo(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
  }

  // Check role-based access
  const userRole = $auth.user.value?.role
  const requiredRoles = to.meta.roles as Role[]

  if (
    requiredRoles &&
    (!userRole || !requiredRoles.some((role) => roleHierarchy[userRole].includes(role)))
  ) {
    return navigateTo('/403')
  }
})
