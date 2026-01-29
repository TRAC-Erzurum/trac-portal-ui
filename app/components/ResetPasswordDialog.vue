<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:model-value', $event)"
    fullscreen
    :scrim="false"
    :width="500"
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
            <v-text-field
              v-model="formData.newPassword"
              :label="t('auth.newPassword')"
              type="password"
              :rules="[rules.required, rules.minLength]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
            />
            <v-text-field
              v-model="formData.confirmPassword"
              :label="t('auth.confirmPassword')"
              type="password"
              :rules="[rules.required, rules.passwordMatch]"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
            />
          </v-form>
        </div>

        <div class="form-actions">
          <v-btn
            color="primary"
            variant="flat"
            @click="handleSave"
            :loading="loading"
            :disabled="!formValid"
          >
            {{ t('auth.resetPassword') }}
          </v-btn>
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
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
const formData = ref({
  newPassword: '',
  confirmPassword: '',
})

const rules = {
  required: (v) => !!v || t('validation.required'),
  minLength: (v) => (v && v.length >= 4) || t('auth.passwordTooShort'),
  passwordMatch: (v) => v === formData.value.newPassword || t('auth.passwordsDoNotMatch'),
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      formData.value = {
        newPassword: '',
        confirmPassword: '',
      }
    }
  }
)

const handleSave = () => {
  if (formValid.value) {
    emit('save', formData.value.newPassword)
  }
}
</script>

<style lang="scss" scoped>
.form-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}
</style>
