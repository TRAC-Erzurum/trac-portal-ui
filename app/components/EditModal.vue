<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:model-value', $event)"
    fullscreen
    :scrim="false"
    :width="600"
    transition="dialog-bottom-transition"
  >
    <div class="modal-container" @click.self="$emit('update:model-value', false)">
      <div class="modal-box form-box">
        <div class="form-header">
          <div class="form-title">{{ title }}</div>
          <div class="header-actions">
            <v-tooltip location="bottom" :text="t('common.close')">
              <template v-slot:activator="{ props }">
                <v-btn
                  icon
                  variant="text"
                  v-bind="props"
                  @click="$emit('update:model-value', false)"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </div>

        <div class="form-content">
          <v-form ref="form" v-model="formValid" @submit.prevent="handleSave">
            <template v-for="field in fields" :key="field.key">
              <template v-if="field.type === 'qth'">
                <div>
                  <QthSelector v-model="qthData" no-label />
                </div>
              </template>

              <template v-else-if="field.type === 'signal-selector'">
                <div class="mt-4">
                  <SignalSelector
                    v-model="formData[field.key]"
                    :label="field.label"
                    :box-count="field.boxCount"
                    :levels="field.levels"
                  />
                </div>
              </template>

              <template v-else>
                <div class="mt-4">
                  <v-text-field
                    v-model="formData[field.key]"
                    :label="field.label"
                    :type="field.inputType || 'text'"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    :rules="field.rules"
                    @input="field.uppercase ? handleUppercaseInput(field.key) : null"
                  />
                </div>
              </template>
            </template>
          </v-form>
        </div>

        <div class="form-actions">
          <v-btn color="primary" variant="flat" @click="handleSave" :loading="loading">
            {{ t('common.save') }}
          </v-btn>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SignalSelector from '~/components/SignalSelector.vue'
import QthSelector from '~/components/QthSelector.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  fields: {
    type: Array,
    required: true,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:model-value', 'save'])

const { t } = useI18n()

const form = ref(null)
const formValid = ref(false)
const formData = ref({})
const qthData = ref({
  country: '',
  city: '',
  district: '',
})

watch(
  () => props.initialData,
  (newValue) => {
    formData.value = { ...newValue }

    // Handle both qthData object structure and flat structure
    if (newValue.qthData) {
      qthData.value = { ...newValue.qthData }
    } else {
      qthData.value = {
        country: newValue.country || '',
        city: newValue.city || '',
        district: newValue.district || '',
      }
    }
  },
  { immediate: true, deep: true }
)

watch(
  qthData,
  (newValue) => {
    // Update the appropriate fields based on the structure used
    if ('qthData' in formData.value) {
      formData.value.qthData = { ...newValue }
    } else {
      formData.value.country = newValue.country
      formData.value.city = newValue.city
      formData.value.district = newValue.district
    }
  },
  { deep: true }
)

const handleSave = () => {
  // Make sure QTH data is included correctly in the save
  if ('qthData' in formData.value) {
    formData.value.qthData = { ...qthData.value }
  } else {
    formData.value.country = qthData.value.country
    formData.value.city = qthData.value.city
    formData.value.district = qthData.value.district
  }

  emit('save', formData.value)
}

const handleUppercaseInput = (key) => {
  if (formData.value[key]) {
    formData.value[key] = formData.value[key].toUpperCase()
  }
}
</script>

<style lang="scss">
.form-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}
</style>
