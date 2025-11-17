<template>
  <v-container class="my-8">
    <template v-if="$auth.user.value">
      <v-row v-if="loading">
        <v-col cols="12" md="10" offset-md="1" lg="8" offset-lg="2">
          <v-skeleton-loader type="card" height="200"></v-skeleton-loader>
        </v-col>
      </v-row>
      <v-row>
        <v-col
          v-if="$auth.user.value.role === Role.GUEST"
          cols="12"
          md="10"
          offset-md="1"
          lg="8"
          offset-lg="2"
        >
          <v-card class="dashboard-card dashboard-card--info dashboard-card--compact mb-2">
            <v-card-text>
              <div class="text-center mb-2">
                <v-icon size="20" color="info" class="mr-2">mdi-information</v-icon>
                <span class="text-subtitle-2 font-weight-medium text-info">
                  {{ $t('operator.pendingApproval') }}
                </span>
              </div>
              <div class="text-body-2 text-medium-emphasis text-justify">
                {{ $t('operator.pendingApprovalDescription') }}
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col v-if="hasPersonalStats" cols="12" md="10" offset-md="1" lg="8" offset-lg="2">
          <v-card class="dashboard-card dashboard-card--primary h-100">
            <div class="card-title">
              <v-avatar color="primary" size="48" class="mr-4">
                <v-img :src="getProfilePicture" />
              </v-avatar>
              <div class="title-content">
                <div class="text-h6">
                  {{ $t('pages.dashboard.personal') }}
                </div>
                <div class="text-subtitle-2 text-medium-emphasis">
                  {{ $auth.user.value?.callSign }}
                </div>
              </div>
            </div>

            <v-card-text>
              <div class="session-stats">
                <div class="stats-row">
                  <div class="compact-stats">
                    <div class="compact-stat">
                      <div class="compact-stat-icon">
                        <v-icon size="28" color="primary">mdi-account-group</v-icon>
                      </div>
                      <div class="compact-stat-value">{{ personalStats[0]?.value }}</div>
                      <div class="compact-stat-label">
                        {{ $t('pages.dashboard.stats.attendedSessions') }}
                      </div>
                    </div>

                    <div class="compact-stat">
                      <div class="compact-stat-icon">
                        <v-icon size="28" color="success">mdi-account-tie</v-icon>
                      </div>
                      <div class="compact-stat-value">{{ personalStats[1]?.value }}</div>
                      <div class="compact-stat-label">
                        {{ $t('pages.dashboard.stats.managedSessions') }}
                      </div>
                    </div>

                    <div class="compact-stat">
                      <div class="compact-stat-icon">
                        <v-icon size="28" color="warning">mdi-trophy</v-icon>
                      </div>
                      <div class="compact-stat-value">{{ personalStats[4]?.value }}</div>
                      <div class="compact-stat-label">
                        {{ $t('pages.dashboard.stats.consecutiveRecord') }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="stats-row">
                  <div class="stat-card">
                    <div v-if="$vuetify.display.mdAndUp" class="stat-icon">
                      <v-icon size="32" color="info">mdi-calendar</v-icon>
                    </div>
                    <div class="stat-content">
                      <div class="stat-label">
                        <v-icon v-if="$vuetify.display.smAndDown" size="20" color="info"
                          >mdi-calendar</v-icon
                        >
                        {{ $t('pages.dashboard.stats.lastAttendedSession') }}
                      </div>
                      <div
                        class="stat-value clickable"
                        @click="navigateToSession(personalStats[2]?.sessionId)"
                        v-tooltip="personalStats[2]?.value"
                      >
                        {{ truncateSessionName(personalStats[2]?.value) }}
                        <v-icon v-if="personalStats[2]?.sessionId" size="small" class="ml-1"
                          >mdi-open-in-new</v-icon
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <div class="stats-row">
                  <div class="stat-card signal-card">
                    <div class="stat-content">
                      <div class="signal-stats">
                        <div class="signal-item">
                          <v-icon size="32" color="success">mdi-signal</v-icon>
                          <div class="signal-value">{{ personalStats[5]?.value }}</div>
                          <div class="signal-label">
                            {{ $t('pages.dashboard.stats.averageSignal') }}
                          </div>
                        </div>
                        <div class="signal-divider"></div>
                        <div class="signal-item">
                          <v-icon size="32" color="info">mdi-radio-tower</v-icon>
                          <div class="signal-value">{{ personalStats[6]?.value }}</div>
                          <div class="signal-label">
                            {{ $t('pages.dashboard.stats.averageReadability') }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12">
          <v-card class="dashboard-card dashboard-card--secondary h-100">
            <v-card-title class="d-flex align-center justify-space-between py-6 px-6">
              <div class="d-flex align-center">
                <v-icon size="32" color="primary" class="mr-4">mdi-clock-outline</v-icon>
                <div>
                  <div class="text-h6">{{ $t('pages.dashboard.recentSessions') }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('pages.dashboard.recentSessionsDescription') }}
                  </div>
                </div>
              </div>
              <v-spacer></v-spacer>
              <v-tooltip :text="$t('session.create')" v-if="$auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="tonal"
                    color="primary"
                    :to="'/sessions/create'"
                    :icon="$vuetify.display.smAndDown"
                    class="mr-2 hidden-sm-and-up"
                  >
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                  <v-btn
                    variant="tonal"
                    color="primary"
                    :to="'/sessions/create'"
                    prepend-icon="mdi-plus"
                    class="mr-2 hidden-xs"
                  >
                    {{ t('session.create') }}
                  </v-btn>
                </template>
              </v-tooltip>
              <v-tooltip :text="$t('common.viewAll')">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    variant="tonal"
                    color="primary"
                    :to="'/sessions'"
                    :icon="$vuetify.display.smAndDown"
                    class="hidden-sm-and-up"
                  >
                    <v-icon>mdi-arrow-right</v-icon>
                  </v-btn>
                  <v-btn
                    variant="tonal"
                    color="primary"
                    :to="'/sessions'"
                    prepend-icon="mdi-arrow-right"
                    class="hidden-xs"
                  >
                    {{ $t('common.viewAll') }}
                  </v-btn>
                </template>
              </v-tooltip>
            </v-card-title>
            <v-card-text v-if="recentSessions.length">
              <SessionCardView
                :sessions="recentSessions"
                :loading="loadingSession"
                :hide-pagination="true"
                @start-session="startSession"
                @end-session="endSession"
                @restart-session="restartSession"
              />
            </v-card-text>
            <v-card-text v-else class="text-center pa-4">
              <v-icon size="48" color="grey">mdi-calendar-blank</v-icon>
              <div class="text-body-1 mt-2">{{ $t('session.noSessions') }}</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" v-for="stat in sessionStats" :key="stat.title">
          <v-card class="dashboard-card dashboard-card--secondary h-100">
            <div class="card-title">
              <v-icon
                :size="$vuetify.display.mdAndUp ? 32 : 24"
                color="primary"
                class="mr-2 mr-md-4"
              >
                {{ stat.icon }}
              </v-icon>
              <div class="title-content">
                <div :class="$vuetify.display.mdAndUp ? 'text-h6' : 'text-subtitle-1'">
                  {{ $t(stat.title) }}
                </div>
                <div
                  :class="$vuetify.display.mdAndUp ? 'text-subtitle-2' : 'text-caption'"
                  class="text-medium-emphasis"
                >
                  {{ t('pages.dashboard.stats.sessionDescription') }}
                </div>
              </div>
            </div>

            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="(item, index) in stat.data"
                  :key="item.sessionId"
                  :class="$vuetify.display.mdAndUp ? 'mb-2' : 'mb-1 py-1'"
                  density="compact"
                  @click="item.sessionId && navigateToSession(item.sessionId)"
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :color="getIconColor(index)"
                      :size="$vuetify.display.mdAndUp ? 40 : 32"
                    >
                      <span class="text-h6">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title
                    :class="[
                      $vuetify.display.mdAndUp ? 'text-subtitle-1' : 'text-body-2',
                      'font-weight-medium',
                      { 'cursor-pointer': item.sessionId },
                    ]"
                  >
                    {{ item.sessionName }}
                    <v-icon v-if="item.sessionId" size="small" class="ms-1">mdi-open-in-new</v-icon>
                  </v-list-item-title>

                  <v-list-item-subtitle
                    :class="$vuetify.display.mdAndUp ? 'text-body-2' : 'text-caption'"
                  >
                    {{ item.value }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6" v-for="stat in operatorStats" :key="stat.title">
          <v-card class="dashboard-card dashboard-card--secondary h-100">
            <div class="card-title">
              <v-icon
                :size="$vuetify.display.mdAndUp ? 32 : 24"
                color="secondary"
                class="mr-2 mr-md-4"
              >
                {{ stat.icon }}
              </v-icon>
              <div class="title-content">
                <div :class="$vuetify.display.mdAndUp ? 'text-h6' : 'text-subtitle-1'">
                  {{ $t(stat.title) }}
                </div>
                <div
                  :class="$vuetify.display.mdAndUp ? 'text-subtitle-2' : 'text-caption'"
                  class="text-medium-emphasis"
                >
                  {{ t('pages.dashboard.stats.operatorDescription') }}
                </div>
              </div>
            </div>

            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="(item, index) in stat.data"
                  :key="item.userId || item.sessionId"
                  :class="$vuetify.display.mdAndUp ? 'mb-2' : 'mb-1 py-1'"
                  density="compact"
                  @click="item.userId && navigateToUserProfile(item.userId)"
                >
                  <template v-slot:prepend>
                    <v-avatar
                      :color="getIconColor(index)"
                      :size="$vuetify.display.mdAndUp ? 40 : 32"
                    >
                      <span class="text-h6">{{ index + 1 }}</span>
                    </v-avatar>
                  </template>

                  <v-list-item-title
                    :class="[
                      $vuetify.display.mdAndUp ? 'text-subtitle-1' : 'text-body-2',
                      'font-weight-medium',
                      { 'cursor-pointer': item.userId },
                    ]"
                  >
                    {{ item.callSign || item.sessionName }}
                    <v-icon v-if="item.userId" size="small" class="ms-1">mdi-open-in-new</v-icon>
                  </v-list-item-title>

                  <v-list-item-subtitle
                    :class="$vuetify.display.mdAndUp ? 'text-body-2' : 'text-caption'"
                  >
                    {{ item.value }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <v-row justify="center">
        <v-col cols="12" md="8">
          <v-card class="welcome-card">
            <v-card-text class="text-center pa-8">
              <img src="/logo-s.svg" width="120" height="120" class="mb-4" />
              <h1 class="text-h4 mb-4">{{ t('nav.title') }}</h1>
              <p class="text-body-1 mb-6">
                TRAC operatör ve çevrim yönetim sistemine hoş geldiniz. Çevrimlere katılmak,
                istatistiklerinizi görmek ve daha fazlası için hesap oluşturabilir veya giriş
                yapabilirsiniz.
              </p>

              <v-row justify="center" class="mb-8">
                <v-col cols="12" sm="6" md="4">
                  <v-card class="feature-card" variant="outlined">
                    <v-card-text class="text-center pa-4">
                      <v-icon size="36" color="primary" class="mb-2">mdi-account-group</v-icon>
                      <div class="text-h6 mb-2">Çevrimlere Katılın</div>
                      <div class="text-body-2">Günlük çevrimlere katılarak deneyim kazanın</div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <v-card class="feature-card" variant="outlined">
                    <v-card-text class="text-center pa-4">
                      <v-icon size="36" color="success" class="mb-2">mdi-chart-bar</v-icon>
                      <div class="text-h6 mb-2">İstatistikler</div>
                      <div class="text-body-2">
                        Katılım ve performans istatistiklerinizi takip edin
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <v-card class="feature-card" variant="outlined">
                    <v-card-text class="text-center pa-4">
                      <v-icon size="36" color="info" class="mb-2">mdi-account-network</v-icon>
                      <div class="text-h6 mb-2">Operatör Ağı</div>
                      <div class="text-body-2">Diğer operatörlerle etkileşime geçin</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <div class="d-flex justify-center flex-wrap">
                <v-btn
                  color="primary"
                  size="large"
                  variant="elevated"
                  :to="'/register'"
                  prepend-icon="mdi-account-plus"
                  class="ma-2"
                >
                  {{ t('auth.register') }}
                </v-btn>
                <v-btn
                  color="primary"
                  size="large"
                  variant="outlined"
                  :to="'/login'"
                  prepend-icon="mdi-login"
                  class="ma-2"
                >
                  {{ t('auth.login') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import SessionCardView from '~/components/SessionCardView.vue'

const { $auth } = useNuxtApp()
const api = useApi()
const { t } = useI18n()
const { errorToast, successToast } = useToast()
const { getImageUrl } = useImageUrl()

const loading = ref(true)
const loadingSession = ref(false)
const personalStats = ref([])
const recentSessions = ref([])
const topStats = ref([])

const fetchDashboardData = async () => {
  try {
    loading.value = true
    const [personalStatsData, recentSessionsData, topStatsData] = await Promise.all([
      api.get('/dashboard/personal-stats'),
      api.get('/dashboard/recent-sessions'),
      api.get('/dashboard/top-stats'),
    ])

    personalStats.value = [
      {
        label: 'pages.dashboard.stats.attendedSessions',
        value: personalStatsData.attendedSessions,
        icon: 'mdi-account-group',
        color: 'primary',
      },
      {
        label: 'pages.dashboard.stats.managedSessions',
        value: personalStatsData.managedSessions,
        icon: 'mdi-account-tie',
        color: 'success',
      },
      {
        label: 'pages.dashboard.stats.lastAttendedSession',
        value: personalStatsData.lastAttendedSession?.name || '-',
        sessionId: personalStatsData.lastAttendedSession?.id,
        icon: 'mdi-calendar',
        color: 'info',
      },
      {
        label: 'pages.dashboard.stats.lastManagedSession',
        value: personalStatsData.lastManagedSession?.name || '-',
        sessionId: personalStatsData.lastManagedSession?.id,
        icon: 'mdi-calendar-check',
        color: 'warning',
      },
      {
        label: 'pages.dashboard.stats.consecutiveRecord',
        value: `${personalStatsData.consecutiveRecord} çevrim`,
        icon: 'mdi-trophy',
        color: 'error',
      },
      {
        label: 'pages.dashboard.stats.averageSignal',
        value: `${personalStatsData.averageSignal}/9`,
        icon: 'mdi-signal',
        color: 'success',
      },
      {
        label: 'pages.dashboard.stats.averageReadability',
        value: `${personalStatsData.averageReadability}/5`,
        icon: 'mdi-radio-tower',
        color: 'info',
      },
    ]

    recentSessions.value = recentSessionsData

    topStats.value = topStatsData
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const truncateSessionName = (name, maxLength = 30) => {
  if (!name) return '-'
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
}

const navigateToUserProfile = (userId) => {
  return navigateTo(`/users/${userId}/profile`)
}

const navigateToSession = (sessionId, event) => {
  if (event && event.target.closest('.clickable-cell')) {
    return
  }

  if ($auth.user.value?.role === Role.GUEST) {
    errorToast(t('error.forbidden'))
    return
  }

  return navigateTo(`/sessions/${sessionId}/report`)
}

const getIconColor = (index) => {
  const colors = ['primary', 'success', 'info', 'warning', 'error', 'secondary']
  return colors[index % colors.length]
}

const operatorStats = computed(() => {
  return topStats.value.filter((stat) => stat.type === 'operator' && stat.data.length > 0)
})

const sessionStats = computed(() => {
  return topStats.value.filter((stat) => stat.type === 'session' && stat.data.length > 0)
})

const hasPersonalStats = computed(() => {
  return personalStats.value?.some((stat) => stat?.value !== undefined && stat?.value !== null)
})

const startSession = async (session) => {
  try {
    loadingSession.value = true
    await api.patch(`/session/${session.id}/start`)
    successToast(t('session.startSuccess'))
    recentSessions.value.find((s) => s.id === session.id).startedAt = new Date()
  } catch (error) {
    errorToast(t('session.startError'))
  } finally {
    loadingSession.value = false
  }
}

const endSession = async (session) => {
  try {
    loadingSession.value = true
    await api.patch(`/session/${session.id}/end`)
    successToast(t('session.endSuccess'))
    recentSessions.value.find((s) => s.id === session.id).endedAt = new Date()
  } catch (error) {
    errorToast(t('session.endError'))
  } finally {
    loadingSession.value = false
  }
}

const restartSession = async (session) => {
  try {
    loadingSession.value = true
    await api.patch(`/session/${session.id}/restart`)
    successToast(t('session.restartSuccess'))
    recentSessions.value.find((s) => s.id === session.id).startedAt = new Date()
    recentSessions.value.find((s) => s.id === session.id).endedAt = null
  } catch (error) {
    errorToast(t('session.restartError'))
  } finally {
    loadingSession.value = false
  }
}

const getProfilePicture = computed(() => {
  return $auth.user.value?.picture ? getImageUrl($auth.user.value.picture) : '/default-avatar.webp'
})

watch(
  () => $auth.user.value,
  (newUser) => {
    if (!$auth.user.value) {
      return
    }

    if (!newUser.callSign) {
      errorToast(t('operator.noOperator'))
      navigateTo(`/users/${newUser.id}/operator/create`)
      return
    }

    fetchDashboardData()
  },
  { immediate: true }
)

definePageMeta({
  requiresAuth: false,
})
</script>

<style lang="scss" scoped>
.dashboard-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-surface));
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--v-shadow-key-umbra-color), 0.1);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    transform: scaleX(0);
    transition: transform 0.3s ease;
    transform-origin: left;
  }

  &:hover::before {
    transform: scaleX(1);
  }
}

.dashboard-card--primary::before {
  background: linear-gradient(
    90deg,
    rgb(var(--v-theme-primary)) 0%,
    rgb(var(--v-theme-secondary)) 100%
  );
  transform: scaleX(1); /* Her zaman görünür */
}

.dashboard-card--secondary::before {
  background: rgb(var(--v-theme-primary));
  transform: scaleX(0); /* Hover'da görünür */
}

.dashboard-card--warning {
  border: 1px solid rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.05);

  &::before {
    background: rgb(var(--v-theme-warning));
    transform: scaleX(1);
  }

  &:hover {
    transform: none;
    box-shadow: none;
  }
}

.dashboard-card--info {
  border: 1px solid rgba(var(--v-theme-info), 0.2);
  background: rgb(var(--v-theme-surface));

  &::before {
    background: rgb(var(--v-theme-info));
    transform: scaleX(1);
  }

  &:hover {
    transform: none;
    box-shadow: none;
  }
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.clickable-row {
  cursor: pointer;
  &:hover {
    background-color: rgb(var(--v-theme-primary), 0.04) !important;
  }
}

.clickable-cell {
  cursor: pointer;
  display: flex;
  align-items: center;
  &:hover {
    color: rgb(var(--v-theme-primary));
  }
}

.v-btn.pa-0 {
  text-transform: none;
  letter-spacing: normal;
}

.v-list-item {
  border-radius: 8px;
  &:hover {
    background: rgba(var(--v-theme-primary), 0.04);
  }
}

.session-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-row {
  display: flex;
  gap: 1rem;

  > .stat-card {
    flex: 1;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(var(--v-theme-surface), 0.8);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(var(--v-theme-surface), 0.9);
  }

  .stat-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1rem;

    .stat-label {
      font-size: 0.875rem;
      color: rgba(var(--v-theme-on-surface), 0.7);
      flex: 1;
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 500;
      color: rgba(var(--v-theme-on-surface), 0.9);
      text-align: right;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.clickable {
        cursor: pointer;
        color: rgb(var(--v-theme-primary));
        display: inline-flex;
        align-items: center;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
    gap: 0.5rem;

    .stat-content {
      width: 100%;
      flex-direction: column;
      gap: 0.5rem;

      .stat-label {
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .stat-value {
        font-size: 0.875rem;
        text-align: center;

        &.clickable {
          justify-content: center;
        }
      }
    }
  }
}

.signal-card {
  .signal-stats {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
  }

  .signal-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .signal-value {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0.5rem 0;
  }

  .signal-label {
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
  }

  .signal-divider {
    width: 1px;
    height: 50px;
    background: rgba(var(--v-border-color), 0.12);
  }
}

.ranking-card {
  .rank-badge {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  }

  .clickable {
    cursor: pointer;
    color: rgb(var(--v-theme-primary));
    display: inline-flex;
    align-items: center;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 600px) {
  .stats-row {
    flex-direction: column;
  }

  .signal-card {
    .signal-stats {
      flex-direction: column;
      gap: 1rem;
    }

    .signal-divider {
      width: 80%;
      height: 1px;
    }
  }

  .v-col[cols='6'] {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .v-col[cols='6'][md='4'] {
    padding: 6px 12px;

    .dashboard-card {
      min-height: unset;
    }

    .card-title {
      padding: 12px;

      .title-content {
        .text-subtitle-2 {
          font-size: 0.75rem;
        }
      }
    }

    .v-list-item {
      padding: 8px;
    }
  }
}

.h-100 {
  height: 100%;
}

.dashboard-card {
  min-height: 300px;
  display: flex;
  flex-direction: column;

  .v-card-text {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

@media (max-width: 960px) {
  .v-col {
    margin-bottom: 1rem;
  }
}

.compact-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

.compact-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.25rem;
  background: rgba(var(--v-theme-surface), 0.8);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .compact-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(var(--v-theme-surface), 0.9);
  }

  .compact-stat-value {
    font-size: 1.125rem;
    font-weight: 500;
    color: rgba(var(--v-theme-on-surface), 0.9);
  }

  .compact-stat-label {
    font-size: 0.875rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
    margin-top: 0.25rem;
  }

  @media (max-width: 600px) {
    padding: 0.75rem;

    .compact-stat-icon {
      width: 40px;
      height: 40px;
    }

    .compact-stat-value {
      font-size: 1rem;
    }

    .compact-stat-label {
      font-size: 0.75rem;
    }
  }
}

.welcome-card {
  border-radius: 16px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-surface));
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(var(--v-shadow-key-umbra-color), 0.1);
  }
}

.feature-card {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 12px;

  &:hover {
    transform: translateY(-4px);
    border-color: rgb(var(--v-theme-primary));
    box-shadow: 0 4px 12px rgba(var(--v-shadow-key-umbra-color), 0.1);
  }
}

.dashboard-card--compact {
  min-height: unset !important;
}
</style>
