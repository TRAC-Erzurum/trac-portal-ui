<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    fullscreen
    :scrim="false"
    content-class="search-modal"
    @after-enter="$nextTick(() => searchInput?.focus())"
    @keydown="handleKeyDown"
  >
    <template v-slot:activator="{ props }">
      <v-text-field
        readonly
        variant="outlined"
        :placeholder="t('net.addAttendee')"
        class="search-trigger"
        v-bind="props"
        hide-details
      >
        <template #prepend-inner>
          <v-icon color="primary">mdi-plus</v-icon>
        </template>
      </v-text-field>
    </template>

    <div class="modal-container" @click.self="closeModal">
      <v-card class="modal-card">
        <v-card-text class="modal-content">
          <div class="modal-actions">
            <v-btn icon variant="text" @click="closeModal">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>

          <div class="content-wrapper">
            <div class="main-content">
              <div v-if="!newAttendee" class="search-box">
                <div class="search-section">
                  <v-text-field
                    ref="searchInput"
                    v-model="searchQuery"
                    variant="outlined"
                    :placeholder="t('operator.searchOperatorPlaceholder')"
                    :hint="t('operator.searchHint')"
                    persistent-hint
                    class="modal-search-field"
                    @keypress="preventSlash"
                  >
                    <template #prepend-inner>
                      <v-icon color="primary">mdi-magnify</v-icon>
                    </template>
                  </v-text-field>
                </div>

                <div v-if="searchQuery" class="results-section">
                  <div class="search-results fade-slide">
                    <div class="results-label">
                      <v-icon color="primary" size="small" class="mr-2"
                        >mdi-information-outline</v-icon
                      >
                      {{ t('operator.selectOperatorLabel') }}
                    </div>

                    <div v-if="isSearching" class="results-container">
                      <div v-for="i in 5" :key="i" class="operator-item skeleton">
                        <div class="skeleton-line callsign"></div>
                        <div class="skeleton-line name"></div>
                        <div class="skeleton-line grid"></div>
                      </div>
                    </div>

                    <div v-else class="results-container">
                      <template
                        v-for="(operator, index) in sortedOperatorResults"
                        :key="operator.id"
                      >
                        <div
                          v-if="!operator.isDisabled"
                          class="operator-item"
                          :class="{ selected: selectedIndex === index }"
                          @click="handleSelectOperator(operator)"
                        >
                          <div class="operator-callsign">
                            {{
                              [operator.prefix, operator.callSign, operator.suffix]
                                .filter(Boolean)
                                .join('/')
                            }}
                          </div>
                          <div
                            class="operator-name"
                            v-if="operator.user?.fullName || operator.fullName"
                          >
                            {{ operator.user?.fullName || operator.fullName }}
                          </div>
                          <div class="operator-grid" v-if="operator.gridSquare">
                            {{ operator.gridSquare }}
                          </div>
                          <v-icon class="operator-action" color="primary">mdi-chevron-right</v-icon>
                        </div>
                      </template>

                      <template
                        v-for="operator in sortedOperatorResults"
                        :key="`disabled-${operator.id}`"
                      >
                        <div v-if="operator.isDisabled" class="operator-item disabled">
                          <div class="operator-callsign">
                            {{
                              [operator.prefix, operator.callSign, operator.suffix]
                                .filter(Boolean)
                                .join('/')
                            }}
                          </div>
                          <span class="operator-status">
                            ({{ t('operator.alreadyInNet') }})
                          </span>
                          <v-icon class="operator-action" color="disabled"
                            >mdi-chevron-right</v-icon
                          >
                        </div>
                      </template>

                      <div v-if="operators.length === 0" class="no-results">
                        <v-icon color="warning" class="mr-2">mdi-alert-circle-outline</v-icon>
                        {{ t('operator.noResults') }}
                      </div>
                    </div>
                  </div>

                  <div
                    class="add-operator-section fade-slide"
                    v-if="searchQuery"
                    :class="{ disabled: hasExactMatch || isNewCallSignExists }"
                  >
                    <div class="results-label">
                      <v-icon color="primary" size="small" class="mr-2">mdi-plus-circle</v-icon>
                      {{ t('operator.newOperatorLabel') }}
                    </div>
                    <div
                      class="operator-item new-operator"
                      @click="handleNewOperator"
                      :class="{
                        disabled: hasExactMatch || isNewCallSignExists,
                        selected: selectedIndex === -1 && !hasExactMatch && searchQuery,
                      }"
                    >
                      <div class="operator-callsign">
                        {{ searchQuery ? searchQuery.toUpperCase() : '...' }}
                      </div>
                      <div class="operator-name">
                        {{
                          hasExactMatch
                            ? t('operator.operatorExists')
                            : t('operator.createNewOperator')
                        }}
                      </div>
                      <v-icon
                        class="operator-action"
                        :color="hasExactMatch ? 'disabled' : 'primary'"
                      >
                        mdi-chevron-right
                      </v-icon>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="form-box fade-slide">
                <div class="form-content" :class="{ mobile: isMobile }">
                  <v-text-field
                    ref="callSignInput"
                    v-model="newAttendee.builtCallSign"
                    label="Çağrı İşareti"
                    variant="outlined"
                    hide-details="auto"
                    :error-messages="callSignError"
                    :class="{ 'mb-4': !callSignError }"
                    @input="formatCallSign"
                    required
                  />

                  <v-text-field
                    v-model="newAttendee.fullName"
                    label="Ad Soyad"
                    variant="outlined"
                    hide-details
                    class="mt-4"
                  />

                  <QthSelector v-model="newAttendee.qthData" class="mt-4" />

                  <SignalSelector
                    v-model="newAttendee.readability"
                    :label="t('operator.readability')"
                    :box-count="5"
                    class="mt-4"
                  />

                  <SignalSelector
                    v-model="newAttendee.signalStrength"
                    :label="t('operator.signalStrength')"
                    :box-count="9"
                    class="mt-4"
                    :levels="[
                      { max: 2, level: 1 },
                      { max: 4, level: 2 },
                      { max: 6, level: 3 },
                      { max: 8, level: 4 },
                      { max: 9, level: 5 },
                    ]"
                  />
                </div>

                <div class="form-actions">
                  <v-btn variant="tonal" color="primary" class="back-button" @click="resetForm">
                    <v-icon start>mdi-magnify</v-icon>
                    {{ t('net.backToSearch') }}
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="tonal"
                    size="large"
                    :disabled="!isFormValid"
                    @click="handleAddAttendee"
                  >
                    <v-icon start>mdi-plus</v-icon>
                    {{ t('net.addAttendee') }}
                  </v-btn>
                </div>
              </div>
            </div>

            <div class="existing-attendees">
              <div class="list-header">
                <v-icon size="small" color="primary" class="mr-2">mdi-account-group</v-icon>
                {{ t('net.existingAttendees') }}
              </div>
              <div class="list-content">
                <div
                  v-for="(attendee, index) in attendeesWithOrder"
                  :key="attendee.id || index"
                  class="existing-attendee"
                >
                  <span class="order-number">{{ attendee.orderNumber }}.</span>
                  <span class="attendee-callsign">{{ attendee.callSign }}</span>
                </div>
                <div v-if="!attendeesWithOrder.length" class="no-attendees">
                  {{ t('net.noAttendees') }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce } from 'lodash-es'
import SignalSelector from '~/components/SignalSelector.vue'
import QthSelector from '~/components/QthSelector.vue'

const { t } = useI18n()
const api = useApi()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  existingCallSigns: {
    type: Array,
    default: () => [],
  },
  netId: {
    type: String,
    required: true,
  },
  attendees: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'add-attendee'])

const searchInput = ref(null)
const callSignInput = ref(null)
const searchQuery = ref('')
const operators = ref([])
const isSearching = ref(false)
const newAttendee = ref(null)
const selectedOperator = ref(null)
const selectedIndex = ref(-1)

const callSignParts = ref({ prefix: '', callSign: '', suffix: '' })

const { parseCallSign, buildCallSign } = useCallSignFormatter()

const searchOperators = debounce(async (query) => {
  if (!query) {
    operators.value = []
    return
  }

  try {
    isSearching.value = true
    const response = await api.get(`/operator/search?q=${encodeURIComponent(query)}`)
    operators.value = response
  } catch (error) {
    console.error('Operator search failed:', error)
    operators.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

watch(searchQuery, (newValue) => {
  searchOperators(newValue)
})

const closeModal = () => {
  console.debug('closeModal')
  emit('update:modelValue', false)
  resetForm()
  selectedIndex.value = -1
}

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      searchQuery.value = ''
    }
  }
)

const hasExactMatch = computed(() => {
  if (!searchQuery.value || !operators.value?.length) {
    console.debug('no exact match:', !searchQuery.value, !operators.value?.length)
    return false
  }

  const match = operators.value.some(
    (operator) => operator.callSign.toLowerCase() === searchQuery.value.toLowerCase()
  )

  console.debug('exact match response:', match)

  return match
})

const handleAddAttendee = () => {
  emit('add-attendee', {
    callSign: newAttendee.value.builtCallSign.trim(),
    name: newAttendee.value.fullName,
    country: newAttendee.value.qthData.country || null,
    city: newAttendee.value.qthData.city || null,
    district: newAttendee.value.qthData.district || null,
    operatorId: newAttendee.value.id,
    readability: newAttendee.value.readability,
    signalStrength: newAttendee.value.signalStrength,
  })
  resetForm()
}

const handleNewOperator = () => {
  if (hasExactMatch.value) {
    console.debug(`there is exact match, new operator won't be handled`, hasExactMatch.value)
    return
  }

  operators.value = []
  const callSign = searchQuery.value.toUpperCase()
  console.debug('new operator will be handled:', callSign)
  newAttendee.value = {
    fullName: '',
    qthData: {
      country: '',
      city: '',
      district: '',
    },
    callSign: callSign,
    prefix: null,
    suffix: null,
    builtCallSign: callSign,
    readability: null,
    signalStrength: null,
  }
}

const preventSlash = (e) => {
  if (e.key === '/' || e.key === ' ') {
    e.preventDefault()
  }
}

const handleSelectOperator = (operator) => {
  selectedOperator.value = operator
  operators.value = []
  const builtCallSign = buildCallSign({
    prefix: operator.prefix,
    callSign: operator.callSign,
    suffix: operator.suffix,
  })
  newAttendee.value = {
    id: operator.id,
    prefix: operator.prefix,
    callSign: operator.callSign,
    suffix: operator.suffix,
    builtCallSign: builtCallSign,
    fullName: operator.user?.fullName || operator.fullName,
    qthData: {
      country: operator.country || '',
      city: operator.city || '',
      district: operator.district || '',
    },
    readability: null,
    signalStrength: null,
  }
}

const resetForm = () => {
  newAttendee.value = null
  searchQuery.value = ''
  operators.value = []
  selectedOperator.value = null
}

watch(
  newAttendee,
  (value) => {
    if (value?.callSign) {
      callSignParts.value = parseCallSign(value.builtCallSign)
    }
  },
  { immediate: true }
)

watch(
  callSignParts,
  (value) => {
    if (newAttendee.value) {
      newAttendee.value.builtCallSign = buildCallSign({
        prefix: value.prefix,
        callSign: value.callSign,
        suffix: value.suffix,
      })
    }
  },
  { deep: true }
)

const isValidCallSignModification = computed(() => {
  if (!newAttendee.value?.builtCallSign || !searchQuery.value) {
    return true
  }

  if (newAttendee.value.id) {
    if (!selectedOperator.value) {
      return true
    }

    const currentParts = parseCallSign(newAttendee.value.builtCallSign)

    return currentParts.callSign === selectedOperator.value.callSign
  }

  const currentParts = parseCallSign(newAttendee.value.builtCallSign)
  const searchParts = parseCallSign(searchQuery.value.toUpperCase())

  return currentParts.callSign === searchParts.callSign
})

const callSignError = computed(() => {
  if (!newAttendee.value?.builtCallSign?.trim()) {
    return t('operator.callSignRequired')
  }
  if (!isValidCallSignModification.value) {
    return t('operator.invalidCallSignModification')
  }
  return ''
})

const isFormValid = computed(() => {
  return newAttendee.value?.builtCallSign?.trim() && isValidCallSignModification.value
})

const formatCallSign = (value) => {
  if (!value) return ''

  if (selectedOperator.value) {
    const parts = parseCallSign(value)
    const formatted = buildCallSign({
      prefix: parts.prefix,
      callSign: selectedOperator.value.callSign,
      suffix: parts.suffix,
    })
    newAttendee.value.builtCallSign = formatted
    return formatted
  }

  const formatted = value.toUpperCase().replace(/[^A-Z0-9/]/g, '')
  newAttendee.value.builtCallSign = formatted
  return formatted
}

const isCallSignExists = (operator) => {
  if (!props.existingCallSigns?.length) return false

  const { callSign } = parseCallSign(operator.callSign)
  return props.existingCallSigns.some((existingCallSign) => {
    const { callSign: existingMainCallSign } = parseCallSign(existingCallSign)
    return existingMainCallSign.toUpperCase() === callSign.toUpperCase()
  })
}

const operatorResults = computed(() => {
  return operators.value.map((operator) => ({
    ...operator,
    isDisabled: isCallSignExists(operator),
  }))
})

const sortedOperatorResults = computed(() => {
  const results = operatorResults.value
  return [...results].sort((a, b) => {
    if (a.isDisabled !== b.isDisabled) {
      return a.isDisabled ? 1 : -1
    }
    return a.callSign.localeCompare(b.callSign)
  })
})

const attendeesWithOrder = computed(() => {
  if (!props.attendees?.length) return []
  return props.attendees.map((attendee, index) => ({
    ...attendee,
    orderNumber: props.attendees.length - index,
  }))
})

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 960
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

const handleKeyDown = (e) => {
  if (!searchQuery.value && e.key === 'Escape') {
    console.debug('esc pressed 1', searchQuery.value, e.key)
    closeModal()
    return
  }

  if (newAttendee.value) {
    if (e.key === 'Escape') {
      console.debug('esc pressed 2', newAttendee.value, e.key)
      resetForm()
      return
    }
    if (e.key === 'Enter' && isFormValid.value) {
      console.debug('enter pressed 1', newAttendee.value, isFormValid.value, e.key)
      handleAddAttendee()
      return
    }
    return
  }

  const enabledOperators = sortedOperatorResults.value.filter((op) => !op.isDisabled)

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (selectedIndex.value < enabledOperators.length - 1) {
        selectedIndex.value++
      } else if (!hasExactMatch.value && searchQuery.value) {
        selectedIndex.value = -1
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (selectedIndex.value === -1 && !hasExactMatch.value) {
        selectedIndex.value = enabledOperators.length - 1
      } else if (selectedIndex.value > 0) {
        selectedIndex.value--
      }
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex.value >= 0) {
        handleSelectOperator(enabledOperators[selectedIndex.value])
      } else if (searchQuery.value && !hasExactMatch.value) {
        handleNewOperator()
      }
      break
    case 'Escape':
      e.preventDefault()
      if (searchQuery.value) {
        console.debug('escape pressed 3', searchQuery.value, e.key)
        searchQuery.value = ''
        selectedIndex.value = -1
      } else {
        console.debug('escape pressed 4', searchQuery.value, e.key)
        closeModal()
      }
      break
  }
}

watch(searchQuery, () => {
  selectedIndex.value = -1
})

watch(
  sortedOperatorResults,
  (newResults) => {
    if (!newResults?.length) {
      selectedIndex.value = !hasExactMatch.value && searchQuery.value ? -1 : -2
      return
    }

    const firstEnabledIndex = newResults.findIndex((op) => !op.isDisabled)
    if (firstEnabledIndex >= 0) {
      selectedIndex.value = firstEnabledIndex
    } else {
      selectedIndex.value = !hasExactMatch.value && searchQuery.value ? -1 : -2
    }
  },
  { immediate: true }
)

// Watch newAttendee for form-box visibility
watch(newAttendee, (newValue) => {
  if (newValue) {
    nextTick(() => {
      callSignInput.value?.focus()
    })
  } else {
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})
</script>

<style lang="scss" scoped>
.modal-card {
  max-width: 1200px;
  width: fit-content;
  margin: 32px auto;
  display: flex;
  flex-direction: column;

  @media (max-width: 959px) {
    margin: 16px;
    width: auto;
  }
}

.modal-content {
  padding: 24px;
  position: relative;
}

.modal-actions {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  gap: 8px;
  z-index: 1;
}

.content-wrapper {
  display: flex;
  gap: 24px;
  height: 100%;
  padding-top: 48px; // Space for actions
}

.main-content {
  width: 500px; // Fixed width
  display: flex;
  flex-direction: column;
}

.search-box,
.form-box {
  height: 500px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.search-section {
  margin-bottom: 24px;
}

.results-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  border-radius: 8px;
  overflow: hidden;

  .results-container {
    flex: 1;
    overflow-y: auto;
    max-height: 240px;
  }
}

.add-operator-section {
  height: 120px; // Fixed height
  border: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  border-radius: 8px;
}

.existing-attendees {
  width: 300px; // Fixed width
  height: 500px; // Same as main content
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  font-weight: 500;
  display: flex;
  align-items: center;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.existing-attendee {
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: rgb(var(--v-theme-surface-variant) / 0.5);
  }

  .order-number {
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
    min-width: 24px;
  }

  .attendee-callsign {
    flex: 1;
  }
}

.no-attendees {
  padding: 16px;
  text-align: center;
  color: rgb(var(--v-theme-on-surface) / 0.6);
}

.form-content.mobile {
  .v-text-field {
    margin-bottom: 8px;

    .v-input__control {
      min-height: 40px;
    }

    .v-field__input {
      min-height: 40px;
      padding-top: 0;
      padding-bottom: 0;
    }
  }

  .signal-selector {
    margin-top: 8px;
  }

  .v-btn {
    margin-top: 16px;
  }
}

.operator-item {
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  box-sizing: border-box;
  margin: 4px 8px;
  border-radius: 8px;
  border: 2px solid transparent;

  &.selected {
    background-color: rgb(var(--v-theme-primary) / 0.08);
    border-color: rgb(var(--v-theme-primary));

    .operator-callsign {
      color: rgb(var(--v-theme-primary));
    }

    .operator-action {
      color: rgb(var(--v-theme-primary));
    }
  }

  &:not(.selected):not(.disabled):hover {
    background-color: rgb(var(--v-theme-surface-variant) / 0.5);
  }
}

.new-operator {
  &.selected {
    background-color: rgb(var(--v-theme-primary) / 0.08);
    border-color: rgb(var(--v-theme-primary));
  }
}

.fade-slide {
  animation: fadeSlideIn 0.3s ease;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-label {
  padding: 12px 16px;
  color: rgb(var(--v-theme-on-surface) / 0.7);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
}

.operator-callsign {
  font-weight: 600;
  color: var(--v-primary-base);
}

.operator-name {
  color: rgb(var(--v-theme-on-surface) / 0.7);
}

.operator-grid {
  margin-left: auto;
  color: rgb(var(--v-theme-on-surface) / 0.5);
  font-size: 0.9em;
}

.no-results {
  text-align: center;
  padding: 20px;
  color: rgb(var(--v-theme-on-surface) / 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.search-results-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

.form-box {
  position: relative;
  width: 100%;
  max-width: 600px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgb(var(--v-theme-on-surface) / 0.1);
}

.form-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.selected-operator {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.callsign-fields {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 8px;
  margin-bottom: 4px;
}

.prefix-field,
.suffix-field {
  min-width: 80px;
}

.operator-modifiers {
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.6);
  font-weight: normal;
  margin-left: 4px;
}

.operator-status {
  font-size: 0.85em;
  color: var(--v-error-base);
  font-weight: normal;
  margin-left: 8px;
}

.operator-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: rgb(var(--v-theme-surface-variant) / 0.3);
  border-top: 1px solid rgb(var(--v-theme-on-surface) / 0.1);

  &:first-of-type {
    margin-top: 8px;
  }
}

.operator-item.disabled:hover {
  background-color: rgb(var(--v-theme-surface-variant) / 0.3);
}

@media (max-width: 959px) {
  .modal-card {
    margin: 16px;
    height: calc(100vh - 32px);
  }

  .content-wrapper {
    flex-direction: column;
  }

  .main-content {
    width: 100%;
  }

  .search-box,
  .form-box,
  .existing-attendees {
    height: auto;
    width: 100%;
  }

  .search-results .results-container {
    max-height: 200px;
  }

  .existing-attendees {
    height: 200px;
  }
}

.modal-content-wrapper {
  display: flex;
  gap: 24px;
  width: 100%;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;

  @media (max-width: 959px) {
    flex-direction: column;
    padding: 16px;
  }
}

.existing-attendees-list {
  width: 300px;
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(var(--v-theme-on-surface) / 0.1);
  display: flex;
  flex-direction: column;
  height: fit-content;
  max-height: 630px;

  &.mobile {
    width: 100%;
    max-height: 200px;
  }

  .list-header {
    padding: 16px;
    border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
    font-weight: 500;
    display: flex;
    align-items: center;
  }

  .list-content {
    padding: 8px;
    overflow-y: auto;
  }

  .existing-attendee {
    padding: 8px 16px;
    border-radius: 4px;

    &:hover {
      background: rgb(var(--v-theme-surface-variant) / 0.5);
    }
  }

  .no-attendees {
    padding: 16px;
    text-align: center;
    color: rgb(var(--v-theme-on-surface) / 0.6);
  }
}

.form-actions {
  margin-top: 32px; // Increased spacing
  padding-top: 16px;
  border-top: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  .back-button {
    min-width: 120px;
  }
}

@media (max-width: 959px) {
  .form-actions {
    margin-top: 24px;
    flex-direction: column-reverse;
    gap: 8px;

    .back-button {
      width: 100%;
    }

    .v-btn {
      width: 100%;
    }
  }
}
</style>
