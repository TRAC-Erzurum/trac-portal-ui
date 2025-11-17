<template>
  <v-container class="my-8">
    <v-card class="dashboard-card dashboard-card--primary">
      <div class="card-title">
        <v-icon size="32" :color="getIconColor(1)" class="mr-4">mdi-radio-edit</v-icon>
        <div class="title-content">
          <div class="text-h6">{{ $t('operator.editTitle') }}</div>
        </div>
      </div>

      <v-card-text>
        <div class="session-stats">
          <div class="stats-row">
            <div class="stat-card form-card">
              <v-form v-model="form.valid" @submit.prevent="handleSubmit" class="w-100">
                <div class="callsign-fields">
                  <v-text-field
                    v-model="form.prefix"
                    :hint="$t('operator.prefix')"
                    density="comfortable"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-chevron-left"
                    class="input-field prefix-field"
                  />
                  <v-text-field
                    v-model="form.callSign"
                    disabled
                    density="comfortable"
                    :hint="$t('operator.callSign')"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-radio-handheld"
                    class="input-field callsign-field"
                  />
                  <v-text-field
                    v-model="form.suffix"
                    :hint="$t('operator.suffix')"
                    density="comfortable"
                    persistent-hint
                    variant="outlined"
                    prepend-inner-icon="mdi-chevron-right"
                    class="input-field suffix-field"
                  />
                </div>

                <div class="section-title">
                  <v-icon size="24" :color="getIconColor(2)" class="mr-2">mdi-map-marker</v-icon>
                  <span class="text-h6">{{ $t('operator.locationDetails') }}</span>
                </div>

                <v-row class="mt-4">
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.gridSquare"
                      :label="$t('operator.gridSquare')"
                      variant="outlined"
                      prepend-inner-icon="mdi-grid"
                      class="input-field"
                    />
                  </v-col>
                  <v-col cols="12" sm="8">
                    <QthSelector v-model="qthData" no-label />
                  </v-col>
                </v-row>
              </v-form>
            </div>
          </div>

          <div class="management-actions">
            <v-btn
              color="primary"
              :disabled="!form.valid"
              size="large"
              @click="handleSubmit"
              class="management-button"
              elevation="2"
            >
              <v-icon start size="24">mdi-content-save</v-icon>
              {{ $t('common.save') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import { useCardStyles } from '~/composables/useCardStyles'
import QthSelector from '~/components/QthSelector.vue'

const { t } = useI18n()
const { $auth } = useNuxtApp()
const route = useRoute()
const api = useApi()
const { successToast, errorToast, warningToast } = useToast()
const { getIconColor } = useCardStyles()

const qthData = ref({
  country: '',
  city: '',
  district: '',
})

const form = ref({
  valid: false,
  prefix: '',
  callSign: '',
  suffix: '',
  gridSquare: '',
})

watch(
  qthData,
  (newValue) => {
    form.value.country = newValue.country
    form.value.city = newValue.city
    form.value.district = newValue.district
  },
  { deep: true }
)

watch(
  () => [form.value.country, form.value.city, form.value.district],
  ([country, city, district]) => {
    qthData.value = {
      country: country || '',
      city: city || '',
      district: district || '',
    }
  }
)

onMounted(async () => {
  if (!$auth.user.value?.callSign) {
    warningToast(t('operator.noProfile'))
    return navigateTo(`/users/${route.params.id}/operator/create`)
  }

  if (!allowEdit()) {
    errorToast(t('error.forbidden'))
    return
  }

  await fetchOperatorData()
})

const allowEdit = () => {
  return ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) || $auth.user.value?.id === route.params.id
}

const getSubmitUrl = () => {
  if (($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) && $auth.user.value?.id !== route.params.id) {
    return `/user/${route.params.id}/operator`
  }
  return `/user/operator`
}

const getFetchUrl = () => {
  if ($auth.user.value?.role === Role.GUEST) {
    return `/user/operator`
  }
  return `/user/${route.params.id}/operator`
}

const handleSubmit = async () => {
  try {
    const operatorData = {
      prefix: form.value.prefix,
      suffix: form.value.suffix,
      gridSquare: form.value.gridSquare,
      district: qthData.value.district,
      city: qthData.value.city,
      country: qthData.value.country,
    }

    await api.patch(getSubmitUrl(), operatorData)
    successToast(t('operator.updateSuccess'))
    return navigateTo(`/users/${route.params.id}/profile`)
  } catch (err) {
    errorToast(t('common.error', { error: err.message }))
    console.error('Failed to update operator info:', err)
  }
}

const fetchOperatorData = async () => {
  try {
    const data = await api.get(getFetchUrl())
    form.value = {
      ...form.value,
      ...data,
    }

    qthData.value = {
      country: data.country || '',
      city: data.city || '',
      district: data.district || '',
    }
  } catch (err) {
    errorToast(t('common.error', { error: err.message }))
    console.error('Failed to fetch operator data:', err)
  }
}

definePageMeta({
  requiresAuth: true,
  roles: [Role.GUEST],
  key: (route) => route.fullPath,
})
</script>

<style lang="scss" scoped>
.callsign-fields {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  .prefix-field,
  .suffix-field {
    width: 120px;
  }

  .callsign-field {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .callsign-fields {
    flex-direction: column;

    .prefix-field,
    .suffix-field {
      width: 100%;
    }
  }
}
</style>
