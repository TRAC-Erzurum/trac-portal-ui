import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { i18n } from '@/i18n'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    minRole?: UserRole
    forceChangePassword?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/pages/LandingPage.vue'),
      meta: { requiresAuth: false, guestOnly: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { requiresAuth: false, guestOnly: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { requiresAuth: false, guestOnly: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      meta: { requiresAuth: false, guestOnly: true }
    },
    {
      path: '/change-password',
      name: 'force-change-password',
      component: () => import('@/pages/auth/ForceChangePasswordPage.vue'),
      meta: { requiresAuth: true, forceChangePassword: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/nets',
      name: 'nets',
      component: () => import('@/pages/nets/NetsPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/nets/:id',
      name: 'net-detail',
      component: () => import('@/pages/nets/NetDetailPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/nets/:id/report',
      name: 'net-report',
      component: () => import('@/pages/nets/NetReportPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/operators',
      name: 'operators',
      component: () => import('@/pages/operators/OperatorsPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/operators/:id',
      name: 'profile',
      component: () => import('@/pages/operators/ProfilePage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/pages/account/AccountPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' }
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/pages/PrivacyPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/pages/ForbiddenPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/500',
      name: 'error',
      component: () => import('@/pages/ErrorPage.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue')
    }
  ]
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const t = i18n.global.t

  if (!authStore.isInitialized) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (authStore.isAuthenticated && authStore.isTemporaryPassword) {
    if (!to.meta.forceChangePassword) {
      return { name: 'force-change-password' }
    }
  }

  if (to.meta.forceChangePassword && !authStore.isTemporaryPassword) {
    return { name: 'dashboard' }
  }

  if (to.meta.minRole && authStore.isAuthenticated) {
    if (!authStore.hasRole(to.meta.minRole)) {
      toast.error(t('error.guestRestriction'))
      return { name: 'dashboard' }
    }
  }
})

export default router
