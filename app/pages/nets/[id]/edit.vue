<template>
  <v-container>
    <v-card class="custom-card">
      <v-card-title class="d-flex align-center py-4 px-6">
        <v-icon icon="mdi-calendar-edit" size="24" class="mr-2" />
        {{ $t('net.edit') }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" @submit.prevent="handleSubmit" v-model="formValid">
          <v-row>
            <v-col cols="0" md="2"></v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="netData.name"
                :label="t('net.name')"
                :error-messages="errors.name"
                :rules="[(v) => !!v || t('validation.required')]"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-select
                v-model="netData.operatorId"
                :items="operators"
                :label="t('net.operator')"
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
                v-model="netData.type"
                :items="
                  Object.values(NetType).map((type) => ({
                    title: t(`netType.${type}`),
                    value: type,
                  }))
                "
                :label="t('net.type')"
                :error-messages="errors.type"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="netData.mode"
                :items="modes"
                :label="t('net.mode')"
                :error-messages="errors.mode"
                required
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="netData.frequency"
                :items="frequencies"
                :label="t('net.frequency')"
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
                v-model="netData.startedAt"
                :label="t('net.startedAt')"
                type="datetime-local"
                :error-messages="errors.startedAt"
                variant="outlined"
                @update:model-value="handleStartDateChange"
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="netData.endedAt"
                :label="t('net.endedAt')"
                type="datetime-local"
                :error-messages="errors.endedAt"
                variant="outlined"
                :disabled="!netData.startedAt"
              />
            </v-col>
          </v-row>

          <div class="d-flex justify-end gap-2 mt-4">
            <v-btn
              color="secondary"
              variant="outlined"
              :to="`/nets/${route.params.id}/manage`"
              class="mx-2"
            >
              {{ t('common.cancel') }}
            </v-btn>
            <v-btn color="primary" type="submit" :loading="loading">
              {{ t('common.save') }}
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
import { NetType } from '~/constants/enums/net-type'

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

const netData = ref({
  name: '',
  frequency: RepeaterFrequency.RU754,
  mode: Mode.FM,
  type: NetType.Analog,
  operatorId: null,
  startedAt: null,
  endedAt: null,
})

const form = ref(null)
const formValid = ref(false)

const fetchNet = async () => {
  try {
    const response = await api.get(`/net/${route.params.id}`)

    const formatDateForInput = (dateString) => {
      if (!dateString) return null
      const date = new Date(dateString)
      return date.toISOString().slice(0, 16)
    }

    netData.value = {
      ...response,
      startedAt: formatDateForInput(response.startedAt),
      endedAt: formatDateForInput(response.endedAt),
      operatorId: response.operator?.id || null,
    }
  } catch (error) {
    errorToast(t(getErrorMessage(error)))
    console.error('Error fetching net:', error)
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
  fetchNet()
})

const handleStartDateChange = () => {
  if (!netData.value.startedAt) {
    netData.value.startedAt = null
    netData.value.endedAt = null
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

    await api.put(`/net/${route.params.id}`, netData.value)
    successToast(t('net.updateSuccess'))
    return navigateTo('/nets')
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
