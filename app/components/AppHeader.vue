<template>
  <div>
    <v-app-bar
      elevation="0"
      class="app-header px-4"
      :lang="locale"
      :height="$vuetify.display.mdAndUp ? 105 : 85"
    >
      <v-container class="d-flex align-center py-0 px-0">
        <v-btn :to="'/'" class="brand-button" :ripple="false">
          <img src="/logo-s.svg" class="brand-logo" alt="TRAC Logo" />
          <div class="organization-name ml-3 d-none d-sm-flex flex-column">
            <span class="organization-text">Türkiye</span>
            <span class="organization-text">Radyo</span>
            <span class="organization-text">Amatörleri</span>
            <span class="organization-text">Cemiyeti</span>
          </div>
          <div class="organization-name-mobile ml-2 d-flex d-sm-none flex-column">
            <span class="organization-text-mobile">TRAC</span>
          </div>
        </v-btn>

        <v-spacer />

        <client-only>
          <template v-if="!$auth.isAuthenticated.value">
            <v-btn
              :to="'/login'"
              variant="text"
              class="nav-button"
              :ripple="false"
              density="comfortable"
            >
              <v-icon icon="mdi-login" class="mr-2" />
              <span class="nav-text">{{ $t('nav.login') }}</span>
            </v-btn>
          </template>

          <template v-else>
            <div class="nav-buttons d-none d-md-flex">
              <v-btn
                v-if="$auth.user.value?.role !== Role.GUEST"
                :to="'/operators'"
                variant="text"
                class="nav-button"
                :ripple="false"
              >
                <v-icon icon="mdi-account-network" size="20" class="mr-2" />
                <span class="nav-text">{{ $t('nav.operators') }}</span>
              </v-btn>
              <v-btn
                v-if="$auth.user.value?.callSign"
                :to="'/sessions'"
                variant="text"
                class="nav-button"
                :ripple="false"
              >
                <v-icon icon="mdi-book-open-variant" size="20" class="mr-2" />
                <span class="nav-text">{{ $t('nav.sessions') }}</span>
              </v-btn>

              <div class="profile-section">
                <v-divider vertical class="mx-6" />

                <v-btn
                  :to="`/users/${$auth.user.value?.id}/profile`"
                  variant="text"
                  class="profile-button"
                  :ripple="false"
                >
                  <div class="profile-button-content">
                    <v-avatar size="28" class="profile-avatar">
                      <v-img :src="getProfilePicture" />
                    </v-avatar>
                    <div class="profile-text">
                      <span class="profile-name">
                        {{ $auth.user.value?.callSign || $auth.user.value?.email }}
                      </span>
                    </div>
                  </div>
                </v-btn>

                <v-divider vertical class="mx-4" />

                <v-btn
                  variant="text"
                  class="nav-button logout-button"
                  :ripple="false"
                  @click="handleLogout"
                >
                  <v-tooltip location="bottom" :text="$t('auth.logout')" open-delay="300">
                    <template v-slot:activator="{ props }">
                      <v-icon v-bind="props" icon="mdi-logout" size="20" color="error" />
                    </template>
                  </v-tooltip>
                </v-btn>
              </div>
            </div>

            <v-btn
              class="nav-button mobile-menu-btn d-md-none"
              variant="text"
              :ripple="false"
              @click="toggleMobileMenu"
            >
              <v-icon icon="mdi-menu" size="20" />
            </v-btn>
          </template>
        </client-only>
      </v-container>
    </v-app-bar>

    <v-navigation-drawer
      v-model="mobileMenu"
      location="right"
      temporary
      width="280"
      class="mobile-drawer"
      :overlay-opacity="0.95"
      :z-index="9999"
    >
      <div class="mobile-drawer-content">
        <div class="mobile-profile">
          <v-avatar size="64" class="profile-avatar">
            <v-img :src="getProfilePicture" />
          </v-avatar>
          <div class="mobile-profile-info">
            <div class="profile-name">
              {{ $auth.user.value?.callSign || $auth.user.value?.email }}
            </div>
            <div class="profile-email">{{ $auth.user.value?.email }}</div>
          </div>
        </div>

        <div class="mobile-nav-items">
          <div v-if="$auth.user.value?.role !== Role.GUEST" class="nav-group">
            <div class="nav-group-title">{{ $t('nav.main') }}</div>
            <div
              class="nav-item"
              :class="{ active: route.path.startsWith('/operators') }"
              @click="navigateAndClose('/operators')"
            >
              <v-icon size="20">mdi-account-network</v-icon>
              <span>{{ $t('nav.operators') }}</span>
            </div>

            <div
              v-if="$auth.user.value?.callSign"
              class="nav-item"
              :class="{ active: route.path.startsWith('/sessions') }"
              @click="navigateAndClose('/sessions')"
            >
              <v-icon size="20">mdi-book-open-variant</v-icon>
              <span>{{ $t('nav.sessions') }}</span>
            </div>
          </div>

          <div class="nav-group">
            <div class="nav-group-title">{{ $t('nav.account') }}</div>
            <div
              class="nav-item"
              :class="{ active: route.path.includes('/profile') }"
              @click="navigateAndClose(`/users/${$auth.user.value?.id}/profile`)"
            >
              <v-icon size="20">mdi-account</v-icon>
              <span>{{ $t('nav.profile') }}</span>
            </div>

            <div class="nav-item logout-item" @click="handleLogout">
              <v-icon size="20" color="error">mdi-logout</v-icon>
              <span>{{ $t('auth.logout') }}</span>
            </div>
          </div>
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { Role } from '~/constants/enums/role'
import { ref, computed } from 'vue'
import { useImageUrl } from '~/composables/useImageUrl'
import { useRoute } from 'vue-router'

const { locale, t } = useI18n()
const { $auth } = useNuxtApp()
const mobileMenu = ref(false)
const route = useRoute()

const { successToast } = useToast()
const { getImageUrl } = useImageUrl()

onMounted(() => {
  if (import.meta.client) {
    const savedLocale = localStorage.getItem('user-locale')
    if (savedLocale) {
      locale.value = savedLocale
    }
  }
})

function toggleMobileMenu() {
  mobileMenu.value = !mobileMenu.value
}

async function handleLogout() {
  await $auth.logout()
  successToast(t('auth.logoutSuccess'))
  return navigateTo('/')
}

const getProfilePicture = computed(() => {
  return $auth.user.value?.picture ? getImageUrl($auth.user.value.picture) : '/default-avatar.webp'
})

const navigateAndClose = (path) => {
  mobileMenu.value = false
  navigateTo(path)
}
</script>

<style scoped>
.nav-buttons {
  display: flex;
  align-items: center;
  height: 48px;
}

.profile-button {
  transition: all 0.2s ease;
  padding: 0 16px;
  height: 48px;
}

.profile-button-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-text {
  max-width: 150px;
  overflow: hidden;
}

.profile-name {
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-drawer {
  position: fixed;
  backdrop-filter: blur(10px);
}

.mobile-drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(var(--v-theme-surface), 0.8);
}

.mobile-profile {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.mobile-profile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom right,
    rgba(var(--v-theme-primary), 0.1),
    rgba(var(--v-theme-secondary), 0.05)
  );
  z-index: 0;
}

.mobile-profile .profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 2px solid rgba(var(--v-theme-surface), 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  position: relative;
  z-index: 1;
}

.profile-button .profile-avatar :deep(.v-img) {
  height: 100%;
  display: flex;
  align-items: center;
}

.mobile-profile-info {
  position: relative;
  z-index: 1;
}

.profile-email {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.mobile-nav-items {
  flex: 1;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  border-top: 1px solid rgba(var(--v-border-color), 0.08);
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-group-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
  margin-bottom: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.nav-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateX(4px);
}

.nav-item.active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.nav-item.active :deep(.v-icon) {
  color: rgb(var(--v-theme-primary));
}

.logout-item {
  margin-top: 8px;
  color: rgb(var(--v-theme-error));
}

.logout-item:hover {
  background: rgba(var(--v-theme-error), 0.08);
}

.organization-name {
  text-align: left;
  line-height: 1.1;
}

.organization-text {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

.organization-text-mobile {
  font-size: 16px;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

.brand-button {
  height: auto !important;
  padding: 8px 16px;
}

.brand-logo {
  height: 48px;
  width: auto;
}

@media (max-width: 600px) {
  .brand-logo {
    height: 40px;
  }
}
</style>
