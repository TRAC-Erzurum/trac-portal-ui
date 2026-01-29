<template>
  <v-container class="my-8">
    <v-skeleton-loader v-if="loading" type="card" class="mt-4"></v-skeleton-loader>
    <template v-else>
      <v-card class="dashboard-card dashboard-card--primary">
        <div class="card-title">
          <v-avatar size="64" class="profile-avatar">
            <v-img :src="getImageUrl(user.picture)" />
          </v-avatar>
          <div class="title-content">
            <div class="text-h5">{{ user.operator?.callSign ?? user.email }}</div>
            <div class="text-subtitle-1 text-medium-emphasis">{{ user.fullName }}</div>
          </div>
        </div>

        <v-card-text>
          <div class="account-section mb-8">
            <div class="section-title">
              <v-icon size="28" :color="getIconColor(2)" class="mr-2">mdi-shield-account</v-icon>
              <span class="text-h6">{{ $t('pages.profile.account') }}</span>
            </div>

            <div class="account-content">
              <div class="account-info">
                <div class="info-grid">
                  <div class="info-row">
                    <div class="info-header">
                      <v-icon size="20" color="primary">mdi-email</v-icon>
                      <span class="info-label">{{ t('auth.email') }}</span>
                    </div>
                    <div class="info-value">{{ user.email }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-header">
                      <v-icon size="20" color="info">mdi-account-key</v-icon>
                      <span class="info-label">{{ t('pages.profile.provider') }}</span>
                    </div>
                    <div class="info-value">{{ user.provider }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-header">
                      <v-icon size="20" color="success">mdi-badge-account</v-icon>
                      <span class="info-label">{{ t('user.role') }}</span>
                    </div>
                    <div class="info-value">{{ t(`roles.${user.role}`) }}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-header">
                      <v-icon size="20" color="warning">mdi-calendar</v-icon>
                      <span class="info-label">{{ t('pages.profile.memberSince') }}</span>
                    </div>
                    <div class="info-value">{{ formatDate(user.createdAt) }}</div>
                  </div>
                </div>
              </div>

              <v-divider v-if="isOwnProfile || canResetPassword" vertical class="d-none d-md-block" />
              <v-divider v-if="isOwnProfile || canResetPassword" class="d-md-none my-6" />

              <div v-if="isOwnProfile" class="password-section">
                <div class="password-header">
                  <v-icon size="20" color="primary" class="mr-2">mdi-key</v-icon>
                  <span class="text-subtitle-1 font-weight-medium">
                    {{ user.password ? t('auth.changePassword') : t('auth.setPassword') }}
                  </span>
                </div>

                <v-form
                  v-model="passwordForm.valid"
                  @submit.prevent="handlePasswordSubmit"
                  class="password-form"
                >
                  <v-text-field
                    v-if="user.password"
                    v-model="passwordForm.currentPassword"
                    :label="t('auth.currentPassword')"
                    type="password"
                    :rules="[passwordRules.required]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                  <v-text-field
                    v-model="passwordForm.newPassword"
                    :label="t('auth.newPassword')"
                    type="password"
                    :rules="[passwordRules.required, passwordRules.password]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                  <v-text-field
                    v-model="passwordForm.confirmPassword"
                    :label="t('auth.confirmPassword')"
                    type="password"
                    :rules="[passwordRules.required, passwordRules.passwordMatch]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="mb-4"
                  ></v-text-field>
                  <v-btn
                    type="submit"
                    color="primary"
                    :loading="passwordForm.loading"
                    :disabled="!passwordForm.valid"
                    block
                  >
                    {{ user.password ? t('auth.changePassword') : t('auth.setPassword') }}
                  </v-btn>
                </v-form>
              </div>

              <div v-else-if="canResetPassword" class="password-section">
                <div class="password-header">
                  <v-icon size="20" color="primary" class="mr-2">mdi-key-variant</v-icon>
                  <span class="text-subtitle-1 font-weight-medium">
                    {{ t('auth.resetPassword') }}
                  </span>
                </div>

                <v-form
                  ref="resetPasswordFormRef"
                  v-model="resetPasswordForm.valid"
                  @submit.prevent="handleResetPassword"
                  class="password-form"
                >
                  <v-text-field
                    v-model="resetPasswordForm.newPassword"
                    :label="t('auth.newPassword')"
                    type="password"
                    :rules="[passwordRules.required, passwordRules.password]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="mb-3"
                  ></v-text-field>
                  <v-text-field
                    v-model="resetPasswordForm.confirmPassword"
                    :label="t('auth.confirmPassword')"
                    type="password"
                    :rules="[passwordRules.required, resetPasswordRules.passwordMatch]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    class="mb-4"
                  ></v-text-field>
                  <v-btn
                    type="submit"
                    color="primary"
                    :loading="resetPasswordForm.loading"
                    :disabled="!resetPasswordForm.valid"
                    block
                  >
                    {{ t('auth.resetPassword') }}
                  </v-btn>
                </v-form>
              </div>
            </div>
          </div>

          <div class="operator-section mb-8">
            <div class="section-header">
              <div class="section-title">
                <v-icon size="28" :color="getIconColor(3)" class="mr-2">mdi-radio</v-icon>
                <span class="text-h6">{{ $t('pages.profile.operator') }}</span>
              </div>
              <v-btn
                v-if="allowEdit && user.operator"
                prepend-icon="mdi-pencil"
                size="small"
                variant="outlined"
                color="secondary"
                :to="`/users/${route.params.id}/operator/edit`"
                class="edit-button"
              >
                {{ $t('common.edit') }}
              </v-btn>
            </div>

            <template v-if="user.operator">
              <div class="stats-row mt-4">
                <div class="stat-card">
                  <div class="stat-icon">
                    <v-icon size="32" color="warning">mdi-radio</v-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">{{ t('operator.callSign') }}</div>
                    <div class="stat-value">{{ formatCallSign(user.operator) }}</div>
                  </div>
                </div>

                <div v-if="hasQTH(user.operator)" class="stat-card">
                  <div class="stat-icon">
                    <v-icon size="32" color="error">mdi-map-marker</v-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">{{ t('operator.qth') }}</div>
                    <div class="stat-value">{{ formatQTH(user.operator) }}</div>
                  </div>
                </div>

                <div v-if="user.operator.gridSquare" class="stat-card">
                  <div class="stat-icon">
                    <v-icon size="32" color="success">mdi-grid</v-icon>
                  </div>
                  <div class="stat-content">
                    <div class="stat-label">{{ t('operator.gridSquare') }}</div>
                    <div class="stat-value">
                      <a
                        v-if="user.operator.gridSquare"
                        :href="`https://k7fry.com/grid/?qth=${user.operator.gridSquare}`"
                        target="_blank"
                        >{{ user.operator.gridSquare }}
                        <v-icon size="16" color="primary">mdi-open-in-new</v-icon></a
                      >
                      <a v-else :href="`https://k7fry.com/grid`" target="_blank">{{
                        t('operator.noGridSquare')
                      }}</a>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="warning-section mt-4">
                <v-icon size="40" color="warning" class="mb-2">mdi-alert-circle</v-icon>
                <div class="text-h6 mb-2">{{ t('operator.noOperator') }}</div>
                <div class="text-body-1 mb-4">{{ t('operator.requiredWarning') }}</div>
                <v-btn
                  color="warning"
                  size="large"
                  prepend-icon="mdi-plus"
                  :to="`/users/${$route.params.id}/operator/create`"
                  class="create-button"
                >
                  {{ t('operator.create') }}
                </v-btn>
              </div>
            </template>
          </div>

          <div class="personal-section">
            <div class="section-header">
              <div class="section-title">
                <v-icon size="28" :color="getIconColor(1)" class="mr-2">mdi-account-details</v-icon>
                <span class="text-h6">{{ $t('pages.profile.personal') }}</span>
              </div>
              <v-btn
                v-if="allowEdit"
                prepend-icon="mdi-pencil"
                size="small"
                variant="outlined"
                color="secondary"
                :to="`/users/${route.params.id}/edit`"
                class="edit-button"
              >
                {{ $t('common.edit') }}
              </v-btn>
            </div>

            <div class="stats-row mt-4">
              <div class="stat-card">
                <div class="stat-icon">
                  <v-icon size="32" color="primary">mdi-account</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('auth.fullName') }}</div>
                  <div class="stat-value">{{ user.fullName || '-' }}</div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import { useCardStyles } from '~/composables/useCardStyles'
import { useErrorMessage } from '~/composables/useErrorMessage'
import { useToast } from '~/composables/useToast'
import { useImageUrl } from '~/composables/useImageUrl'

const { $auth } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const api = useApi()
const { t } = useI18n()
const { formatDate } = useFormatDate()
const { getIconColor } = useCardStyles()
const { getErrorMessage } = useErrorMessage()
const { errorToast, successToast } = useToast()
const user = ref(null)
const loading = ref(true)
const resetPasswordFormRef = ref(null)
const { getImageUrl } = useImageUrl()

const allowEdit = computed(() => {
  return ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) || $auth.user.value?.id === route.params.id
})

const isOwnProfile = computed(() => {
  return $auth.user.value?.id === route.params.id
})

const canResetPassword = computed(() => {
  if (!user.value || isOwnProfile.value) return false
  const currentRole = $auth.user.value?.role
  const targetRole = user.value.role
  if (currentRole === Role.SUPER_ADMIN && targetRole !== Role.SUPER_ADMIN) return true
  if (currentRole === Role.ADMIN && targetRole !== Role.SUPER_ADMIN && targetRole !== Role.ADMIN) return true
  return false
})

const passwordRules = {
  required: (v) => !!v || t('validation.required'),
  password: (v) => (v && v.length >= 4) || t('auth.passwordTooShort'),
  passwordMatch: (v) => v === passwordForm.value.newPassword || t('auth.passwordsDoNotMatch'),
}

const resetPasswordRules = {
  passwordMatch: (v) => v === resetPasswordForm.value.newPassword || t('auth.passwordsDoNotMatch'),
}

const passwordForm = ref({
  valid: false,
  loading: false,
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const resetPasswordForm = ref({
  valid: false,
  loading: false,
  newPassword: '',
  confirmPassword: '',
})

onMounted(() => {
  if ($auth.user.value?.role === Role.GUEST && route.params.id !== $auth.user.value?.id) {
    errorToast(t('error.forbidden'))
    return navigateTo(router.options.history.state.back || '/')
  }

  fetchUser()
})

const hasQTH = (operator) => {
  return operator.district || operator.city || operator.country
}

const formatQTH = (operator) => {
  return [operator.district, operator.city, operator.country].filter(Boolean).join(', ')
}

const formatCallSign = (operator) => {
  if (!operator) return ''
  return `${operator.prefix ? `${operator.prefix}/` : ''}${operator.callSign}${
    operator.suffix ? `/${operator.suffix}` : ''
  }`
}

const getFetchUrl = () => {
  if ($auth.user.value?.role === Role.GUEST) {
    return `/user/profile`
  }
  return `/user/${route.params.id}`
}

const fetchUser = async () => {
  try {
    loading.value = true
    const response = await api.get(getFetchUrl())
    user.value = response
    console.debug('User:', user.value)
  } catch (error) {
    errorToast(getErrorMessage(error))
    console.error('Error fetching user:', error)
  } finally {
    loading.value = false
  }
}

const handlePasswordSubmit = async () => {
  try {
    passwordForm.value.loading = true
    const payload = {
      newPassword: passwordForm.value.newPassword,
      confirmPassword: passwordForm.value.confirmPassword,
    }

    if (user.value.password) {
      payload.currentPassword = passwordForm.value.currentPassword
      await api.post('/user/change-password', payload)
    } else {
      await api.post('/user/set-password', payload)
    }

    successToast(t('auth.passwordChanged'))

    passwordForm.value = {
      valid: false,
      loading: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    passwordForm.value.loading = false
  }
}

const handleResetPassword = async () => {
  try {
    resetPasswordForm.value.loading = true
    await api.post(`/user/${route.params.id}/reset-password`, {
      newPassword: resetPasswordForm.value.newPassword,
    })
    successToast(t('auth.passwordResetSuccess'))
    resetPasswordForm.value.newPassword = ''
    resetPasswordForm.value.confirmPassword = ''
    resetPasswordFormRef.value?.reset()
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    resetPasswordForm.value.loading = false
  }
}

definePageMeta({
  requiresAuth: true,
  roles: [Role.GUEST],
  key: (route) => route.fullPath,
})
</script>

<style lang="scss" scoped>
.card-title {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgba(var(--v-theme-surface), 0.6);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem;

    .title-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
}

.profile-avatar {
  border: 3px solid rgba(var(--v-theme-primary), 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;

    .edit-button {
      width: 100%;
    }
  }
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 500;
}

.account-section,
.operator-section,
.personal-section {
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(var(--v-border-color), 0.12);

  @media (max-width: 600px) {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }
}

.account-content {
  margin-top: 1.5rem;
  display: flex;
  gap: 2rem;
  align-items: flex-start;

  @media (max-width: 959px) {
    flex-direction: column;
    gap: 1rem;
  }
}

.account-info {
  flex: 1;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.info-row {
  background: rgba(var(--v-theme-surface), 0.8);
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid rgba(var(--v-border-color), 0.08);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-surface), 1);
    transform: translateY(-2px);
  }
}

.info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  .info-label {
    color: rgba(var(--v-theme-on-surface), 0.7);
    font-size: 0.875rem;
  }
}

.info-value {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.9);
}

.password-section {
  width: 400px;
  flex-shrink: 0;

  @media (max-width: 959px) {
    width: 100%;
    max-width: 400px;
    align-self: center;
  }

  .password-header {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .password-form {
    background: rgba(var(--v-theme-surface), 0.8);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(var(--v-border-color), 0.08);

    @media (max-width: 600px) {
      padding: 1rem;
    }
  }
}

.stats-row {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
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

  @media (max-width: 600px) {
    padding: 1rem;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(var(--v-theme-surface), 0.9);
  }

  .stat-content {
    flex: 1;
    overflow: hidden;

    .stat-label {
      font-size: 0.875rem;
      color: rgba(var(--v-theme-on-surface), 0.7);
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 500;
      color: rgba(var(--v-theme-on-surface), 0.9);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.warning-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-warning), 0.2);

  @media (max-width: 600px) {
    padding: 1.5rem 1rem;
  }
}

.edit-button {
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(4px);
  }
}

.create-button {
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

.v-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;

  @media (max-width: 600px) {
    padding: 0.5rem;
  }
}

.dashboard-card {
  background: rgba(var(--v-theme-surface), 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-border-color), 0.12);

  @media (max-width: 600px) {
    border-radius: 0;
  }
}
</style>
