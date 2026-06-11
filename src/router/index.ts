import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, type UserRole } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { i18n } from '@/i18n'

const BASE_TITLE = 'TRAC Portal'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    minRole?: UserRole
    /** Talep kuyruğu: sistem yöneticisi, `User.role === 'admin'` veya şube yöneticisi/başkan */
    requiresRequestQueueAccess?: boolean
    forceChangePassword?: boolean
    /** i18n key for document title (tab). Rendered as "TRAC Portal | {t(titleKey)}" */
    titleKey?: string
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
      meta: { requiresAuth: false, guestOnly: true, titleKey: 'nav.home' }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { requiresAuth: false, guestOnly: true, titleKey: 'auth.login' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/auth/RegisterPage.vue'),
      meta: { requiresAuth: false, guestOnly: true, titleKey: 'auth.register' }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      meta: { requiresAuth: false, guestOnly: true, titleKey: 'auth.forgotPasswordTitle' }
    },
    {
      path: '/register/complete-sso',
      name: 'complete-sso-registration',
      component: () => import('@/pages/auth/CompleteSsoRegistrationPage.vue'),
      meta: { requiresAuth: false, titleKey: 'auth.completeSsoTitle' }
    },
    {
      path: '/change-password',
      name: 'force-change-password',
      component: () => import('@/pages/auth/ForceChangePasswordPage.vue'),
      meta: { requiresAuth: true, forceChangePassword: true, titleKey: 'auth.changePassword' }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { requiresAuth: true, titleKey: 'nav.dashboard' }
    },
    {
      path: '/insights',
      name: 'insights',
      component: () => import('@/pages/insights/InsightsPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.insights' }
    },
    {
      path: '/nets',
      name: 'nets',
      component: () => import('@/pages/nets/NetsPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.nets' }
    },
    {
      path: '/nets/:id',
      name: 'net-detail',
      component: () => import('@/pages/nets/NetDetailPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.nets' }
    },
    {
      path: '/operators',
      name: 'operators',
      component: () => import('@/pages/operators/OperatorsPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.operators' }
    },
    {
      path: '/operators/:id',
      name: 'profile',
      component: () => import('@/pages/operators/ProfilePage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'operators.profile' }
    },
    {
      path: '/certificates',
      name: 'certificates',
      component: () => import('@/pages/certificates/CertificatesPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.certificates' }
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/pages/account/AccountPage.vue'),
      meta: { requiresAuth: true, titleKey: 'nav.account' }
    },
    {
      path: '/branches',
      name: 'branches',
      component: () => import('@/pages/branches/BranchesPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.branches' }
    },
    {
      path: '/branches/:id',
      name: 'branch-detail',
      component: () => import('@/pages/branches/BranchDetailPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer', titleKey: 'nav.branches' }
    },
    {
      path: '/communication-channels',
      name: 'communicationChannels',
      component: () => import('@/pages/communication-channels/CommunicationChannelsPage.vue'),
      meta: { requiresAuth: false, titleKey: 'nav.communicationChannels' }
    },
    {
      path: '/disasters',
      name: 'disasters',
      component: () => import('@/pages/disasters/DisastersPage.vue'),
      meta: { requiresAuth: true, minRole: 'guest', titleKey: 'nav.disasters' }
    },
    {
      path: '/disasters/:id',
      name: 'disaster-detail',
      component: () => import('@/pages/disasters/DisasterDetailPage.vue'),
      meta: { requiresAuth: true, minRole: 'guest', titleKey: 'nav.disasters' }
    },
    {
      path: '/admin/requests',
      name: 'admin-requests',
      component: () => import('@/pages/admin/AdminRequestsPage.vue'),
      meta: {
        requiresAuth: true,
        minRole: 'volunteer',
        requiresRequestQueueAccess: true,
        titleKey: 'admin.pendingRequests'
      }
    },
    {
      path: '/operators/:id/inventory',
      name: 'operator-inventory',
      component: () => import('@/pages/operators/OperatorInventoryPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' as UserRole, titleKey: 'inventory.operatorInventory' }
    },
    {
      path: '/branches/:id/inventory',
      name: 'branch-inventory',
      component: () => import('@/pages/branches/BranchInventoryPage.vue'),
      meta: { requiresAuth: true, minRole: 'volunteer' as UserRole, titleKey: 'inventory.branchInventory' }
    },
    {
      path: '/admin/inventory',
      name: 'admin-inventory',
      component: () => import('@/pages/admin/InventoryAdminPage.vue'),
      meta: { requiresAuth: true, minRole: 'super_admin' as UserRole, titleKey: 'inventory.inventoryManagement' }
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/pages/admin/UsersPage.vue'),
      meta: { requiresAuth: true, minRole: 'super_admin' as UserRole, titleKey: 'nav.userManagement' }
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('@/pages/MapPage.vue'),
      meta: { requiresAuth: false, titleKey: 'map.title' }
    },
    {
      path: '/share-report/:token',
      name: 'share-report',
      component: () => import('@/pages/ShareReportPage.vue'),
      meta: { requiresAuth: false, titleKey: 'netDetail.shareReport' }
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/pages/PrivacyPage.vue'),
      meta: { requiresAuth: false, titleKey: 'privacy.title' }
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/pages/ForbiddenPage.vue'),
      meta: { requiresAuth: false, titleKey: 'error.forbidden' }
    },
    {
      path: '/500',
      name: 'error',
      component: () => import('@/pages/ErrorPage.vue'),
      meta: { requiresAuth: false, titleKey: 'error.serverError' }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { titleKey: 'notFound.title' }
    }
  ]
})

router.afterEach((to) => {
  const titleKey = to.meta.titleKey as string | undefined
  document.title = titleKey ? `${BASE_TITLE} | ${i18n.global.t(titleKey)}` : BASE_TITLE
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
      toast.error(t(authStore.guestRestrictionKey))
      return { name: 'dashboard' }
    }
  }

  if (to.meta.requiresRequestQueueAccess && authStore.isAuthenticated) {
    if (!authStore.canManageRequestQueues) {
      toast.error(t(authStore.guestRestrictionKey))
      return { name: 'dashboard' }
    }
  }
})

export default router
