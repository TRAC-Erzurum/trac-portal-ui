<template>
  <v-container class="my-8">
    <v-card class="dashboard-card dashboard-card--primary">
      <div class="card-title">
        <v-icon size="32" :color="getIconColor(1)" class="mr-4">mdi-radio</v-icon>
        <div class="title-content">
          <div class="text-h6">{{ $t('operator.title') }}</div>
        </div>
      </div>

      <v-card-text>
        <div class="session-stats">
          <div class="stats-row">
            <div class="stat-card form-card">
              <v-form v-model="form.valid" @submit.prevent="handleSubmit" class="w-100">
                <v-text-field
                  v-model="form.fullCallSign"
                  :label="$t('operator.callSign')"
                  :rules="[(v) => !!v || $t('operator.callSignRequired')]"
                  :hint="$t('operator.callSignHint')"
                  persistent-hint
                  required
                  @input="parseCallSign"
                  variant="outlined"
                  prepend-inner-icon="mdi-radio-handheld"
                  class="input-field mb-4"
                  style="text-transform: uppercase"
                />

                <div class="section-title">
                  <v-icon size="24" :color="getIconColor(2)" class="mr-2">mdi-map-marker</v-icon>
                  <span class="text-h6">{{ $t('operator.locationDetails') }}</span>
                </div>

                <v-row class="mt-4">
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.gridSquare"
                      :label="$t('operator.gridSquare')"
                      variant="outlined"
                      prepend-inner-icon="mdi-grid"
                      class="input-field"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.country"
                      :label="$t('operator.country')"
                      variant="outlined"
                      prepend-inner-icon="mdi-earth"
                      class="input-field"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.city"
                      :label="$t('operator.city')"
                      variant="outlined"
                      prepend-inner-icon="mdi-city"
                      class="input-field"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="form.district"
                      :label="$t('operator.district')"
                      variant="outlined"
                      prepend-inner-icon="mdi-map-marker-radius"
                      class="input-field"
                    />
                  </v-col>
                </v-row>

                <div class="mb-4">
                  <v-checkbox
                    v-model="privacyAccepted"
                    :rules="[(v) => !!v || t('validation.required')]"
                    required
                    hide-details
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
              </v-form>
            </div>
          </div>

          <div class="management-actions">
            <v-btn
              color="primary"
              :disabled="!form.valid || !privacyAccepted"
              size="large"
              @click="confirmSave"
              class="management-button"
              elevation="2"
              prepend-icon="mdi-content-save"
            >
              {{ $t('common.save') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog.show" max-width="500px" class="confirmation-dialog">
      <v-card class="pa-4 rounded-lg">
        <v-card-title class="text-h5 font-weight-bold">{{ $t('common.warning') }}</v-card-title>
        <v-card-text class="py-4">
          <p>{{ $t('operator.callSignWarning') }}</p>
          <v-list>
            <v-list-item v-if="form.prefix">
              <v-list-item-title>{{ $t('operator.prefix') }}</v-list-item-title>
              <v-list-item-subtitle>{{ form.prefix }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="form.callSign">
              <v-list-item-title>{{ $t('operator.callSign') }}</v-list-item-title>
              <v-list-item-subtitle>{{ form.callSign }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="form.suffix">
              <v-list-item-title>{{ $t('operator.suffix') }}</v-list-item-title>
              <v-list-item-subtitle>{{ form.suffix }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="dialog.show = false">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" variant="elevated" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { useCardStyles } from '~/composables/useCardStyles'
import { Role } from '~/constants/enums/role'

const { t } = useI18n()
const { $auth } = useNuxtApp()
const route = useRoute()
const api = useApi()
const { successToast, errorToast, warningToast } = useToast()
const { getIconColor } = useCardStyles()

const error = ref(null)
const form = ref({
  valid: false,
  fullCallSign: '',
  gridSquare: '',
  district: '',
  prefix: '',
  callSign: '',
  suffix: '',
  city: '',
  country: '',
})
const dialog = ref({
  show: false,
})
const privacyAccepted = ref(false)

onMounted(() => {
  if ($auth.user.value?.callSign) {
    error.value = t('operator.profileExists')
    warningToast(t('operator.profileExists'))
    return navigateTo(`/users/${route.params.id}/operator/edit`)
  }
})

const confirmSave = () => {
  dialog.value.show = true
}

const parseCallSign = () => {
  const upperCallSign = form.value.fullCallSign.toUpperCase()
  form.value.fullCallSign = upperCallSign
  const parts = upperCallSign.split('/')

  if (parts.length === 1) {
    form.value.prefix = ''
    form.value.callSign = parts[0]
    form.value.suffix = ''
  } else if (parts.length === 2) {
    if (/^[0-9]$/.test(parts[1])) {
      form.value.prefix = ''
      form.value.callSign = parts[0]
      form.value.suffix = parts[1]
    } else {
      form.value.prefix = parts[0]
      form.value.callSign = parts[1]
      form.value.suffix = ''
    }
  } else if (parts.length === 3) {
    form.value.prefix = parts[0]
    form.value.callSign = parts[1]
    form.value.suffix = parts[2]
  }
}

const handleSubmit = async () => {
  dialog.value.show = false
  try {
    const operatorData = {
      callSign: form.value.callSign,
      prefix: form.value.prefix,
      suffix: form.value.suffix,
      gridSquare: form.value.gridSquare,
      district: form.value.district,
      city: form.value.city,
      country: form.value.country,
    }

    await api.post('/user/operator', operatorData)

    await $auth.checkAuth()

    successToast(t('operator.saveSuccess'))
    return navigateTo(`/users/${route.params.id}/profile`)
  } catch (err) {
    error.value = err
    errorToast(t('common.error', { error: err.message }))
    console.error(err)
  }
}

definePageMeta({
  requiresAuth: true,
  roles: [Role.GUEST],
  key: (route) => route.fullPath,
})
</script>

<style lang="scss" scoped>
.session-stats {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
}

.form-card {
  width: 100%;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 500;
  margin: 2rem 0 1rem;
}

.input-field {
  transition: all 0.3s ease;

  &:hover,
  &:focus-within {
    transform: translateY(-2px);
  }
}

.management-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.management-button {
  min-width: 180px;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;

  &:not(:disabled):hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .v-icon {
    transition: transform 0.3s ease;
  }

  &:hover .v-icon {
    transform: scale(1.2);
  }
}

@media (max-width: 600px) {
  .stats-row {
    flex-direction: column;

    > .stat-card {
      min-width: 100%;
    }
  }
}
</style>
