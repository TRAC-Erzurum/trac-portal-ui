<template>
  <v-container>
    <v-card class="custom-card">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon icon="mdi-calendar-edit" size="24" class="mr-2" />
        {{ $t('session.edit') }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" @submit.prevent="handleSubmit" v-model="formValid">
          <v-row>
            <v-col cols="0" md="2"></v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="sessionData.name"
                :label="t('session.name')"
                :error-messages="errors.name"
                :rules="[(v) => !!v || t('validation.required')]"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="sessionData.operatorId"
                :items="operators"
                :label="t('session.operator')"
                :error-messages="errors.operatorId"
                :rules="[(v) => !!v || t('validation.required')]"
                :item-title="formatOperatorDisplayName"
                item-value="id"
                required
                variant="outlined"
                :loading="loadingOperators"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="0" md="2"></v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="sessionData.type"
                :items="
                  Object.values(SessionType).map((type) => ({
                    title: t(`sessionType.${type}`),
                    value: type,
                  }))
                "
                :label="t('session.type')"
                :error-messages="errors.type"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="sessionData.mode"
                :items="modes"
                :label="t('session.mode')"
                :error-messages="errors.mode"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="sessionData.frequency"
                :items="frequencies"
                :label="t('session.frequency')"
                :error-messages="errors.frequency"
                :rules="[(v) => !!v || t('validation.required')]"
                required
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="0" md="2"></v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="sessionData.startedAt"
                :label="t('session.startedAt')"
                type="datetime-local"
                :error-messages="errors.startedAt"
                variant="outlined"
                @update:model-value="handleStartDateChange"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="sessionData.endedAt"
                :label="t('session.endedAt')"
                type="datetime-local"
                :error-messages="errors.endedAt"
                variant="outlined"
                :disabled="!sessionData.startedAt"
              />
            </v-col>
          </v-row>

          <div class="d-flex justify-end gap-2 mt-4">
            <v-btn
              color="secondary"
              variant="outlined"
              :to="`/sessions/${route.params.id}/manage`"
              class="mx-2"
            >
              {{ t('cancel') }}
            </v-btn>
            <v-btn color="primary" type="submit" :loading="loading">
              {{ t('save') }}
            </v-btn>
          </div>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Mode } from '~/constants/enums/mode'
import { RepeaterFrequency, REPEATER_FREQUENCY_LABELS } from '~/constants/enums/repeater-frequency'
import { Role } from '~/constants/enums/role'
import { useErrorMessage } from '~/composables/useErrorMessage'
import { SessionType } from '~/constants/enums/session-type'

const { t } = useI18n()
const api = useApi()
const { errorToast, successToast } = useToast()
const { getErrorMessage } = useErrorMessage()
const route = useRoute()

const loading = ref(false)
const errors = ref({})
const loadingOperators = ref(false)
const operators = ref([])

const modes = Object.values(Mode).map((mode) => ({
  title: t(`mode.${mode}`),
  value: mode,
}))

const frequencies = Object.values(RepeaterFrequency).map((freq) => ({
  title: REPEATER_FREQUENCY_LABELS[freq],
  value: freq,
}))

const sessionData = ref({
  name: '',
  frequency: RepeaterFrequency.RU754,
  mode: Mode.FM,
  type: SessionType.Analog,
  operatorId: null,
  startedAt: null,
  endedAt: null,
})

const form = ref(null)
const formValid = ref(false)

const fetchSession = async () => {
  try {
    const response = await api.get(`/session/${route.params.id}`)

    const formatDateForInput = (dateString) => {
      if (!dateString) return null
      const date = new Date(dateString)
      return date.toISOString().slice(0, 16)
    }

    sessionData.value = {
      ...response,
      startedAt: formatDateForInput(response.startedAt),
      endedAt: formatDateForInput(response.endedAt),
      operatorId: response.operator?.id || null,
    }
  } catch (error) {
    errorToast(t(getErrorMessage(error)))
    console.error('Error fetching session:', error)
  }
}

const fetchOperators = async () => {
  loadingOperators.value = true
  try {
    const response = await api.get('/operator/user')
    operators.value = response.filter((op) => op.user && op.user.role !== Role.GUEST)
  } catch (error) {
    errorToast(t(getErrorMessage(error)))
    console.error('Error fetching operators:', error)
  } finally {
    loadingOperators.value = false
  }
}

onMounted(() => {
  fetchOperators()
  fetchSession()
})

const handleStartDateChange = () => {
  if (!sessionData.value.startedAt) {
    sessionData.value.startedAt = null
    sessionData.value.endedAt = null
  }
}

const handleSubmit = async () => {
  const { valid } = await form.value?.validate()

  if (!valid) {
    errorToast(t('validation.checkForm'))
    return
  }

  try {
    loading.value = true
    errors.value = {}

    await api.put(`/session/${route.params.id}`, sessionData.value)
    successToast(t('session.updateSuccess'))
    return navigateTo('/sessions')
  } catch (error) {
    errorToast(t(getErrorMessage(error)))
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors
    }
  } finally {
    loading.value = false
  }
}

const formatOperatorDisplayName = (operator) => {
  const name = operator.fullName || operator.user?.fullName || operator.user?.email
  return `${operator.callSign} - ${name}`
}

definePageMeta({ requiresAuth: true })
</script>

<style lang="scss" scoped>
.custom-card {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 12px;
}
</style>
