<template>
  <div
    ref="panelRef"
    class="add-attendee-panel"
    :class="{ expanded: isExpanded, 'form-view': currentStep === 'form' }"
  >
    <div class="panel-header" @click="!isExpanded && expandPanel()">
      <div class="search-section">
        <v-text-field
          ref="searchInput"
          v-model="searchQuery"
          variant="outlined"
          :placeholder="t('operator.searchOperatorPlaceholder')"
          density="comfortable"
          hide-details
          class="search-input"
          :class="{ focused: isExpanded }"
          @focus="expandPanel"
          @keydown="handleSearchKeyDown"
          @keypress="preventSlash"
        >
          <template #prepend-inner>
            <v-icon :color="isExpanded ? 'primary' : 'grey'">mdi-magnify</v-icon>
          </template>
          <template #append-inner v-if="searchQuery || isExpanded">
            <v-icon
              v-if="searchQuery"
              size="small"
              class="clear-icon"
              @click.stop="clearSearch"
            >
              mdi-close-circle
            </v-icon>
          </template>
        </v-text-field>
      </div>

      <v-btn
        v-if="isExpanded && currentStep === 'search'"
        icon
        variant="text"
        size="small"
        class="collapse-btn"
        @click.stop="collapsePanel"
      >
        <v-icon>mdi-chevron-up</v-icon>
      </v-btn>
    </div>

    <Transition name="expand" mode="out-in">
      <div v-if="isExpanded" class="panel-content">
        <div class="step-indicator" v-if="currentStep === 'form'">
          <v-btn
            variant="text"
            color="primary"
            size="small"
            class="back-btn"
            @click="goBackToSearch"
          >
            <v-icon start>mdi-arrow-left</v-icon>
            {{ t('net.backToSearch') }}
          </v-btn>
          <div class="step-dots">
            <span class="dot" :class="{ active: currentStep === 'search' }"></span>
            <span class="dot-line"></span>
            <span class="dot" :class="{ active: currentStep === 'form' }"></span>
          </div>
        </div>

        <Transition name="slide-fade" mode="out-in">
          <div v-if="currentStep === 'search'" key="search" class="search-content">
            <div v-if="searchQuery" class="search-results">
              <div class="results-section">
                <div class="section-header">
                  <v-icon size="small" color="primary">mdi-account-search</v-icon>
                  <span>{{ t('operator.selectOperatorLabel') }}</span>
                </div>

                <div v-if="isSearching" class="results-list">
                  <div v-for="i in 3" :key="i" class="result-item skeleton">
                    <div class="skeleton-avatar"></div>
                    <div class="skeleton-content">
                      <div class="skeleton-line primary"></div>
                      <div class="skeleton-line secondary"></div>
                    </div>
                  </div>
                </div>

                <div v-else class="results-list">
                  <TransitionGroup name="list">
                    <div
                      v-for="(operator, index) in enabledOperators"
                      :key="operator.id"
                      class="result-item"
                      :class="{ selected: selectedIndex === index }"
                      @click="selectOperator(operator)"
                    >
                      <div class="result-avatar">
                        <v-icon color="primary">mdi-account</v-icon>
                      </div>
                      <div class="result-info">
                        <div class="result-callsign">
                          {{ formatOperatorCallSign(operator) }}
                        </div>
                        <div class="result-name" v-if="operator.user?.fullName || operator.fullName">
                          {{ operator.user?.fullName || operator.fullName }}
                        </div>
                      </div>
                      <div class="result-grid" v-if="operator.gridSquare">
                        {{ operator.gridSquare }}
                      </div>
                      <v-icon class="result-arrow" color="primary">mdi-chevron-right</v-icon>
                    </div>
                  </TransitionGroup>

                  <div
                    v-for="operator in disabledOperators"
                    :key="`disabled-${operator.id}`"
                    class="result-item disabled"
                  >
                    <div class="result-avatar">
                      <v-icon color="grey">mdi-account</v-icon>
                    </div>
                    <div class="result-info">
                      <div class="result-callsign">{{ formatOperatorCallSign(operator) }}</div>
                      <div class="result-status">{{ t('operator.alreadyInNet') }}</div>
                    </div>
                    <v-icon color="grey-lighten-1">mdi-check-circle</v-icon>
                  </div>

                  <div v-if="!isSearching && operators.length === 0" class="no-results">
                    <v-icon color="grey" size="large">mdi-account-question</v-icon>
                    <span>{{ t('operator.noResults') }}</span>
                  </div>
                </div>
              </div>

              <div
                class="new-operator-section"
                :class="{ disabled: hasExactMatch || isNewCallSignExists }"
              >
                <div class="section-header">
                  <v-icon size="small" color="success">mdi-account-plus</v-icon>
                  <span>{{ t('operator.newOperatorLabel') }}</span>
                </div>
                <div
                  class="result-item new-operator"
                  :class="{
                    selected: selectedIndex === -1 && !hasExactMatch && searchQuery,
                    disabled: hasExactMatch || isNewCallSignExists
                  }"
                  @click="createNewOperator"
                >
                  <div class="result-avatar new">
                    <v-icon color="success">mdi-plus</v-icon>
                  </div>
                  <div class="result-info">
                    <div class="result-callsign">{{ searchQuery.toUpperCase() }}</div>
                    <div class="result-name">
                      {{ hasExactMatch ? t('operator.operatorExists') : t('operator.createNewOperator') }}
                    </div>
                  </div>
                  <v-icon
                    class="result-arrow"
                    :color="hasExactMatch ? 'grey' : 'success'"
                  >
                    mdi-chevron-right
                  </v-icon>
                </div>
              </div>
            </div>

            <div v-else class="search-placeholder">
              <v-icon color="grey-lighten-1" size="48">mdi-radio-handheld</v-icon>
              <p>{{ t('operator.searchHint') }}</p>
            </div>
          </div>

          <div v-else key="form" class="form-content" :class="{ 'form-compact': isMobile }">
            <div class="form-scroll-area">
              <div class="form-grid">
                <v-text-field
                  ref="callSignInput"
                  v-model="newAttendee.builtCallSign"
                  :label="t('operator.callSign')"
                  variant="outlined"
                  :density="isMobile ? 'compact' : 'comfortable'"
                  :error-messages="callSignError"
                  @input="formatCallSign"
                />

                <v-text-field
                  v-model="newAttendee.fullName"
                  :label="t('auth.fullName')"
                  variant="outlined"
                  :density="isMobile ? 'compact' : 'comfortable'"
                />
              </div>

              <QthSelector
                v-model="newAttendee.qthData"
                class="qth-selector"
                :dense="isMobile"
                no-label
              />

              <div class="signal-selectors">
                <SignalSelector
                  v-model="newAttendee.readability"
                  :label="t('operator.readability')"
                  :box-count="5"
                  :compact="isMobile"
                />

                <SignalSelector
                  v-model="newAttendee.signalStrength"
                  :label="t('operator.signalStrength')"
                  :box-count="9"
                  :compact="isMobile"
                  :levels="[
                    { max: 2, level: 1 },
                    { max: 4, level: 2 },
                    { max: 6, level: 3 },
                    { max: 8, level: 4 },
                    { max: 9, level: 5 },
                  ]"
                />
              </div>
            </div>

            <div class="form-actions">
              <v-btn
                color="primary"
                size="large"
                :disabled="!isFormValid"
                :loading="isSubmitting"
                class="submit-btn"
                @click="submitAttendee"
              >
                <v-icon start>mdi-plus</v-icon>
                {{ t('net.addAttendee') }}
              </v-btn>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce } from 'lodash-es'
import SignalSelector from '~/components/SignalSelector.vue'
import QthSelector from '~/components/QthSelector.vue'

const { t } = useI18n()
const api = useApi()

const props = defineProps({
  netId: {
    type: String,
    required: true,
  },
  existingCallSigns: {
    type: Array,
    default: () => [],
  },
  attendees: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['add-attendee'])

const panelRef = ref(null)
const searchInput = ref(null)
const callSignInput = ref(null)
const searchQuery = ref('')
const operators = ref([])
const isSearching = ref(false)
const isExpanded = ref(false)
const isSubmitting = ref(false)
const currentStep = ref('search')
const selectedIndex = ref(-1)
const newAttendee = ref(null)
const selectedOperator = ref(null)
const isMobile = ref(false)

const { parseCallSign, buildCallSign } = useCallSignFormatter()

const formatOperatorCallSign = (operator) => {
  return [operator.prefix, operator.callSign, operator.suffix].filter(Boolean).join('/')
}

const searchOperators = debounce(async (query) => {
  if (!query || query.length < 2) {
    operators.value = []
    return
  }

  try {
    isSearching.value = true
    const response = await api.get(`/operator/search?q=${encodeURIComponent(query)}`)
    operators.value = response || []
  } catch (error) {
    console.error('Operator search failed:', error)
    operators.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

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

const enabledOperators = computed(() =>
  operatorResults.value.filter((op) => !op.isDisabled).sort((a, b) => a.callSign.localeCompare(b.callSign))
)

const disabledOperators = computed(() =>
  operatorResults.value.filter((op) => op.isDisabled)
)

const hasExactMatch = computed(() => {
  if (!searchQuery.value || !operators.value?.length) return false
  return operators.value.some(
    (operator) => operator.callSign.toLowerCase() === searchQuery.value.toLowerCase()
  )
})

const isNewCallSignExists = computed(() => {
  if (!searchQuery.value || !props.existingCallSigns?.length) return false
  return props.existingCallSigns.some(
    (cs) => parseCallSign(cs).callSign.toLowerCase() === searchQuery.value.toLowerCase()
  )
})

const isValidCallSignModification = computed(() => {
  if (!newAttendee.value?.builtCallSign || !searchQuery.value) return true
  
  if (newAttendee.value.id && selectedOperator.value) {
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

watch(searchQuery, (newValue) => {
  searchOperators(newValue)
  selectedIndex.value = -1
})

watch(enabledOperators, (newResults) => {
  if (newResults?.length > 0) {
    selectedIndex.value = 0
  } else {
    selectedIndex.value = !hasExactMatch.value && searchQuery.value ? -1 : -2
  }
}, { immediate: true })

const expandPanel = () => {
  isExpanded.value = true
  nextTick(() => {
    searchInput.value?.focus()
    setTimeout(() => {
      panelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  })
}

const collapsePanel = () => {
  isExpanded.value = false
  currentStep.value = 'search'
  resetForm()
}

const handleClickOutside = (event) => {
  if (!isExpanded.value || currentStep.value !== 'search') return
  if (panelRef.value && !panelRef.value.contains(event.target)) {
    collapsePanel()
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  operators.value = []
  selectedIndex.value = -1
}

const goBackToSearch = () => {
  currentStep.value = 'search'
  newAttendee.value = null
  selectedOperator.value = null
  nextTick(() => searchInput.value?.focus())
}

const selectOperator = (operator) => {
  if (operator.isDisabled) return
  
  selectedOperator.value = operator
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
    fullName: operator.user?.fullName || operator.fullName || '',
    qthData: {
      country: operator.country || '',
      city: operator.city || '',
      district: operator.district || '',
    },
    readability: 5,
    signalStrength: 9,
  }
  
  currentStep.value = 'form'
  nextTick(() => callSignInput.value?.focus())
}

const createNewOperator = () => {
  if (hasExactMatch.value || isNewCallSignExists.value) return
  
  const callSign = searchQuery.value.toUpperCase()
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
    readability: 5,
    signalStrength: 9,
  }
  
  currentStep.value = 'form'
  nextTick(() => callSignInput.value?.focus())
}

const formatCallSign = (event) => {
  if (!newAttendee.value) return
  
  const value = event.target?.value || newAttendee.value.builtCallSign
  if (!value) return
  
  if (selectedOperator.value) {
    const parts = parseCallSign(value)
    const formatted = buildCallSign({
      prefix: parts.prefix,
      callSign: selectedOperator.value.callSign,
      suffix: parts.suffix,
    })
    newAttendee.value.builtCallSign = formatted
  } else {
    newAttendee.value.builtCallSign = value.toUpperCase().replace(/[^A-Z0-9/]/g, '')
  }
}

const preventSlash = (e) => {
  if (e.key === '/' || e.key === ' ') {
    e.preventDefault()
  }
}

const resetForm = () => {
  searchQuery.value = ''
  operators.value = []
  newAttendee.value = null
  selectedOperator.value = null
  selectedIndex.value = -1
}

const submitAttendee = async () => {
  if (!isFormValid.value || isSubmitting.value) return
  
  isSubmitting.value = true
  
  try {
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
    
    currentStep.value = 'search'
    resetForm()
  } finally {
    isSubmitting.value = false
  }
}

const handleSearchKeyDown = (e) => {
  if (currentStep.value !== 'search') return
  
  const enabled = enabledOperators.value
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (selectedIndex.value < enabled.length - 1) {
        selectedIndex.value++
      } else if (!hasExactMatch.value && searchQuery.value) {
        selectedIndex.value = -1
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (selectedIndex.value === -1) {
        selectedIndex.value = enabled.length - 1
      } else if (selectedIndex.value > 0) {
        selectedIndex.value--
      }
      break
    case 'Enter':
      e.preventDefault()
      if (selectedIndex.value >= 0 && enabled[selectedIndex.value]) {
        selectOperator(enabled[selectedIndex.value])
      } else if (selectedIndex.value === -1 && searchQuery.value && !hasExactMatch.value) {
        createNewOperator()
      }
      break
    case 'Escape':
      e.preventDefault()
      if (searchQuery.value) {
        clearSearch()
      } else {
        collapsePanel()
      }
      break
  }
}

const checkMobile = () => {
  isMobile.value = window.innerWidth < 960
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.add-attendee-panel {
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
  border: 2px solid rgb(var(--v-theme-primary) / 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &:hover:not(.expanded) {
    border-color: rgb(var(--v-theme-primary) / 0.3);
    box-shadow: 0 4px 20px rgb(var(--v-theme-primary) / 0.1);
  }

  &.expanded {
    border-color: rgb(var(--v-theme-primary) / 0.5);
    box-shadow: 0 8px 32px rgb(var(--v-theme-primary) / 0.15);
  }
}

.panel-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;

  .expanded & {
    cursor: default;
    border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.08);
  }
}

.search-section {
  flex: 1;
  min-width: 200px;
}

.search-input {
  transition: all 0.3s ease;

  :deep(.v-field) {
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  &.focused :deep(.v-field) {
    background: rgb(var(--v-theme-primary) / 0.05);
  }
}

.clear-icon {
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.collapse-btn {
  flex-shrink: 0;
}

.panel-content {
  padding: 0 20px 20px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 16px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.08);
  margin-bottom: 16px;
}

.back-btn {
  text-transform: none;
  font-weight: 500;
}

.step-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-on-surface) / 0.2);
  transition: all 0.3s ease;

  &.active {
    background: rgb(var(--v-theme-primary));
    transform: scale(1.2);
  }
}

.dot-line {
  width: 24px;
  height: 2px;
  background: rgb(var(--v-theme-on-surface) / 0.2);
}

.search-content {
  min-height: 200px;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.results-section,
.new-operator-section {
  border: 1px solid rgb(var(--v-theme-on-surface) / 0.1);
  border-radius: 12px;
  overflow: hidden;

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface-variant) / 0.3);
  font-size: 0.85rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface) / 0.7);
}

.results-list {
  max-height: 240px;
  overflow-y: auto;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface) / 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(.disabled) {
    background: rgb(var(--v-theme-primary) / 0.05);
  }

  &.selected {
    background: rgb(var(--v-theme-primary) / 0.1);

    .result-callsign {
      color: rgb(var(--v-theme-primary));
    }
  }

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: rgb(var(--v-theme-on-surface) / 0.03);
  }

  &.new-operator:not(.disabled) {
    &:hover {
      background: rgb(var(--v-theme-success) / 0.05);
    }

    &.selected {
      background: rgb(var(--v-theme-success) / 0.1);

      .result-callsign {
        color: rgb(var(--v-theme-success));
      }
    }
  }

  &.skeleton {
    pointer-events: none;
  }
}

.result-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgb(var(--v-theme-primary) / 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.new {
    background: rgb(var(--v-theme-success) / 0.1);
  }
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-callsign {
  font-weight: 600;
  font-size: 1rem;
  color: rgb(var(--v-theme-on-surface));
}

.result-name {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface) / 0.6);
  margin-top: 2px;
}

.result-status {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-warning));
}

.result-grid {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface) / 0.5);
  background: rgb(var(--v-theme-on-surface) / 0.05);
  padding: 4px 10px;
  border-radius: 6px;
}

.result-arrow {
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.2s ease;

  .result-item:hover:not(.disabled) & {
    opacity: 1;
    transform: translateX(4px);
  }
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  color: rgb(var(--v-theme-on-surface) / 0.5);
}

.search-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  color: rgb(var(--v-theme-on-surface) / 0.4);

  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.form-content {
  display: flex;
  flex-direction: column;
}

.form-scroll-area {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;

  @media (max-width: 768px) {
    max-height: none;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.qth-selector {
  margin-bottom: 20px;
}

.signal-selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.form-compact {
  .form-grid {
    gap: 8px;
    margin-bottom: 8px;
  }

  .qth-selector {
    margin-bottom: 8px;
  }

  .signal-selectors {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .form-actions {
    padding: 12px 0 0;
    margin-top: 8px;
  }
}

.form-actions {
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, rgb(var(--v-theme-surface)) 80%, transparent);
  padding: 20px 0 4px;
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  min-width: 180px;
  font-weight: 600;
  text-transform: none;
  border-radius: 12px;

  @media (max-width: 600px) {
    width: 100%;
  }
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(90deg, 
    rgb(var(--v-theme-on-surface) / 0.08) 25%, 
    rgb(var(--v-theme-on-surface) / 0.15) 50%, 
    rgb(var(--v-theme-on-surface) / 0.08) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, 
    rgb(var(--v-theme-on-surface) / 0.08) 25%, 
    rgb(var(--v-theme-on-surface) / 0.15) 50%, 
    rgb(var(--v-theme-on-surface) / 0.08) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  &.primary {
    width: 60%;
  }

  &.secondary {
    width: 40%;
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
