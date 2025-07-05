<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="10" md="8" lg="6">
        <v-card class="pa-6" elevation="3">
          <v-card-title class="text-h4 font-weight-bold text-center mb-6">{{
            $t('auth.login')
          }}</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="handleSubmit" v-model="isFormValid">
              <v-text-field
                v-model="identifier"
                :label="$t('auth.callSign')"
                required
                :rules="identifierRules"
                class="mb-2"
                @input="handleCallSignInput"
              />
              <v-text-field
                v-model="password"
                :label="$t('auth.password')"
                :type="showPassword ? 'text' : 'password'"
                required
                :rules="passwordRules"
                class="mb-4"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
              />
              <v-btn
                block
                color="primary"
                type="submit"
                :loading="loading"
                :disabled="!isFormValid"
                height="48"
                class="mb-6"
              >
                {{ $t('auth.login') }}
              </v-btn>
            </v-form>

            <v-divider class="mb-4">
              <span class="mx-2">{{ $t('common.or') }}</span>
            </v-divider>

            <v-btn
              block
              color="primary"
              variant="elevated"
              prepend-icon="mdi-google"
              :loading="loading"
              @click="handleGoogleLogin"
              height="48"
              class="mb-4"
            >
              {{ $t('auth.loginWithGoogle') }}
            </v-btn>

            <div class="text-center">
              <span>{{ $t('auth.noAccount') }}</span>
              <v-btn variant="text" color="primary" class="ml-2" to="/register">
                {{ $t('auth.register') }}
              </v-btn>
            </div>

            <div class="mt-4 text-sm text-gray-600 text-center">
              <NuxtLink to="/privacy-policy" class="text-primary hover:underline">
                {{ $t('privacy.link_text') }}
              </NuxtLink>
              <br />
              {{ $t('auth.privacyAccepted') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useErrorMessage } from '~/composables/useErrorMessage'

const api = useApi()
const { t } = useI18n()
const { errorToast } = useToast()
const config = useRuntimeConfig()
const { $auth } = useNuxtApp()
const { query } = useRoute()

useHead({
  title: t('nav.login'),
})

const loading = ref(false)
const isFormValid = ref(false)
const identifier = ref('')
const password = ref('')
const showPassword = ref(false)

const { getErrorMessage } = useErrorMessage()

const identifierRules = computed(() => [
  (v) => !!v || t('auth.identifierRequired'),
  (v) => {
    if (v.includes('@')) {
      return /.+@.+\..+/.test(v) || t('auth.emailInvalid')
    }
    return true
  },
])

const passwordRules = computed(() => [(v) => !!v || t('auth.passwordRequired')])

const handleSubmit = async () => {
  loading.value = true
  try {
    console.debug('Login attempt for:', identifier.value)

    await api.post('/auth/login', {
      identifier: identifier.value,
      password: password.value,
    })

    console.debug('Login successful, checking auth...')
    const authResult = await $auth.checkAuth()
    console.debug('Auth check result:', authResult, 'User:', $auth.user.value)

    if (query.returnUrl) {
      await navigateTo(decodeURIComponent(query.returnUrl))
    } else {
      await navigateTo('/')
    }
  } catch (error) {
    errorToast(getErrorMessage(error))
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  try {
    window.location.href = `${config.public.apiBaseUrl}/auth/google`
  } catch (error) {
    errorToast(getErrorMessage(error))
    console.error('Google login error:', error)
  } finally {
    loading.value = false
  }
}

const handleCallSignInput = () => {
  identifier.value = identifier.value.toUpperCase()
}

definePageMeta({
  requiresAuth: false,
})
</script>
