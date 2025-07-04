<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="10" md="8" lg="6">
        <v-card class="pa-6" elevation="3">
          <v-card-title class="text-h4 font-weight-bold text-center mb-6">
            {{ $t('auth.register') }}
          </v-card-title>
          <v-card-text>
            <v-form
              ref="form"
              @submit.prevent="handleSubmit"
              v-model="isFormValid"
              validate-on="blur"
            >
              <v-row>
                <v-col cols="12" sm="12" md="6">
                  <v-text-field
                    v-model="email"
                    :label="$t('auth.email') + ' *'"
                    type="email"
                    required
                    :rules="emailRules"
                  />
                </v-col>
                <v-col cols="12" sm="12" md="6">
                  <v-text-field
                    v-model="callSign"
                    :label="$t('auth.callSign') + ' *'"
                    required
                    :rules="callSignRules"
                    @input="handleCallSignInput"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" sm="12" md="6">
                  <v-text-field
                    v-model="password"
                    :label="$t('auth.password') + ' *'"
                    type="password"
                    required
                    :rules="passwordRules"
                  />
                </v-col>
                <v-col cols="12" sm="12" md="6">
                  <v-text-field
                    v-model="passwordConfirm"
                    :label="$t('auth.passwordConfirm') + ' *'"
                    type="password"
                    required
                    :rules="passwordConfirmRules"
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <v-text-field v-model="fullName" :label="$t('auth.fullName')" />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12">
                  <QthSelector v-model="qthData" />
                </v-col>
              </v-row>

              <div class="mb-4">
                <v-checkbox
                  v-model="privacyAccepted"
                  :rules="[(v) => !!v || t('validation.required')]"
                  required
                  @update:model-value="validateForm"
                >
                  <template v-slot:label>
                    <span>
                      <NuxtLink to="/privacy-policy" class="text-primary" target="_blank">
                        {{ $t('privacy.accept_text') }}
                      </NuxtLink>
                    </span>
                  </template>
                </v-checkbox>
              </div>

              <v-btn
                block
                color="primary"
                type="submit"
                :loading="loading"
                :disabled="!isFormValid || !privacyAccepted"
                height="48"
                class="mb-6"
              >
                {{ $t('auth.register') }}
              </v-btn>
            </v-form>

            <div class="text-center">
              <span>{{ $t('auth.haveAccount') }}</span>
              <v-btn variant="text" color="primary" class="ml-2" :to="'/login'">
                {{ $t('auth.login') }}
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useErrorMessage } from '~/composables/useErrorMessage'

const { t } = useI18n()
const api = useApi()
const { errorToast, successToast } = useToast()
const config = useRuntimeConfig()
const { getErrorMessage } = useErrorMessage()
const { $auth } = useNuxtApp()
useHead({
  title: useNuxtApp().$i18n.t('nav.register'),
})

const form = ref(null)
const loading = ref(false)
const isFormValid = ref(false)
const email = ref('')
const callSign = ref('')
const fullName = ref('')
const password = ref('')
const passwordConfirm = ref('')
const qthData = ref({
  country: 'Türkiye',
  city: '',
  district: '',
})
const privacyAccepted = ref(false)

const emailRules = [
  (v) => !!v || t('auth.emailRequired'),
  (v) => /.+@.+\..+/.test(v) || t('auth.emailInvalid'),
]

const callSignRules = [(v) => !!v || t('auth.callSignRequired')]

const passwordRules = [
  (v) => !!v || t('auth.passwordRequired'),
  (v) => v.length >= 4 || t('auth.passwordTooShort'),
]

const passwordConfirmRules = [
  (v) => !!v || t('auth.passwordRequired'),
  (v) => v === password.value || t('auth.passwordsDoNotMatch'),
]

const validateForm = () => {
  if (form.value) {
    form.value.validate()
  }
}

const handleCallSignInput = () => {
  callSign.value = callSign.value.toUpperCase()
}

const handleSubmit = async () => {
  const { valid } = await form.value?.validate()

  if (!valid) return

  loading.value = true
  try {
    await api.post('/auth/register', {
      email: email.value,
      callSign: callSign.value.toUpperCase(),
      fullName: fullName.value || undefined,
      password: password.value,
      district: qthData.value.district || undefined,
      city: qthData.value.city || undefined,
      country: qthData.value.country || undefined,
    })

    successToast(t('auth.registerSuccess'))

    await $auth.checkAuth()
    navigateTo('/')
  } catch (error) {
    errorToast(getErrorMessage(error))
    console.error('Register error:', error)
  } finally {
    loading.value = false
  }
}

definePageMeta({
  requiresAuth: false,
})
</script>
