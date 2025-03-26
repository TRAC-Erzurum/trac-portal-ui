import { Role, roleHierarchy } from '~/constants/enums/role'

export default defineNuxtRouteMiddleware(async (to) => {
  const { $auth } = useNuxtApp()

  console.debug('global auth middleware', to)

  if (to.path === '/login' && $auth.isAuthenticated.value) {
    console.debug('redirecting to home', $auth.isAuthenticated.value)
    return navigateTo('/')
  }

  if (['/login', '/register', '/'].includes(to.path)) {
    console.debug('not redirecting')
    return
  }

  if (to.meta.requiresAuth) {
    console.debug('checking auth')
    const isAuthenticated = await $auth.checkAuth()
    console.debug('isAuthenticated', isAuthenticated)
    if (!isAuthenticated) {
      console.debug('redirecting to login since not authenticated')
      return navigateTo(`/login?returnUrl=${encodeURIComponent(to.fullPath)}`)
    }
  }

  const userRole = $auth.user.value?.role
  const requiredRoles = to.meta.roles as Role[]

  console.debug('userRole', userRole)
  console.debug('requiredRoles', requiredRoles)
  if (
    requiredRoles &&
    (!userRole || !requiredRoles.some((role) => roleHierarchy[userRole].includes(role)))
  ) {
    console.debug('redirecting to 403')
    return navigateTo('/403')
  }
})
