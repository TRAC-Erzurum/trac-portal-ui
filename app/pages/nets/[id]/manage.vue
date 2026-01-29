<template>
  <v-container :class="{ 'my-8': !isMobile, 'my-2': isMobile }">
    <v-skeleton-loader v-if="loading" type="card" class="mt-4"></v-skeleton-loader>
    <template v-else-if="net">
      <v-card class="dashboard-card dashboard-card--primary mb-8">
        <div class="card-title">
          <v-icon size="32" :color="getIconColor(1)" class="mr-4">mdi-calendar-clock</v-icon>
          <div class="title-content">
            <div class="text-h6">{{ net.name }}</div>
          </div>
        </div>

        <v-card-text>
          <div class="net-stats">
            <div class="stats-row">
              <div class="stat-card time-card">
                <div class="stat-icon">
                  <v-icon size="32" color="primary">mdi-clock-start</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.startedAt') }}</div>
                  <div class="stat-value">{{ formatDate(net.startedAt) || '-' }}</div>
                </div>
                <div class="stat-icon">
                  <v-icon size="32" color="error">mdi-clock-end</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.endedAt') }}</div>
                  <div class="stat-value">{{ formatDate(net.endedAt) || '-' }}</div>
                </div>
                <div class="stat-icon">
                  <v-icon size="32" color="success">mdi-timer-outline</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.duration') }}</div>
                  <div class="stat-value">
                    {{ formatDuration(net.startedAt, net.endedAt) || '-' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-icon">
                  <v-icon size="32" color="info">mdi-radio</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.frequency') }}</div>
                  <div class="stat-value">{{ REPEATER_FREQUENCY_LABELS[net.frequency] }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <v-icon size="32" color="warning">mdi-radio-tower</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.mode') }}</div>
                  <div class="stat-value">{{ t(`mode.${net.mode}`) }}</div>
                </div>
              </div>

              <div class="stat-card">
                <div class="stat-icon">
                  <v-icon size="32" color="success">mdi-radio-handheld</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.type') }}</div>
                  <div class="stat-value">{{ t(`netType.${net.type}`) }}</div>
                </div>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-icon">
                  <v-icon size="32" color="secondary">mdi-account-group</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.attendeeCount') }}</div>
                  <div class="stat-value">{{ net.attendeeCount ?? '-' }}</div>
                </div>
              </div>

              <div v-if="net.operator" class="stat-card operator-card">
                <div class="stat-icon">
                  <v-icon size="32" color="primary">mdi-account-tie</v-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-label">{{ t('net.operator') }}</div>
                  <div class="operator-info">
                    <span
                      class="operator-value"
                      @click="net.operator?.id && navigateToOperator(net.operator.id)"
                    >
                      {{ net.operator.callSign }}
                      <v-icon size="small" class="ms-1">mdi-open-in-new</v-icon>
                    </span>
                    <v-btn
                      v-if="canChangeOperator"
                      color="primary"
                      variant="text"
                      size="small"
                      :loading="actionLoading"
                      @click="showOperatorDialog = true"
                      :class="['change-operator-btn', { 'icon-only': isMobile }]"
                    >
                      <v-icon size="small">mdi-account-switch</v-icon>
                      <span class="btn-text">{{ t('net.changeOperator') }}</span>
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="canManageNet" class="management-actions">
            <div v-if="!net.startedAt" class="start-options mb-4">
              <v-checkbox
                v-model="addOperatorAsAttendee"
                :label="t('net.addOperatorAsAttendee')"
                hide-details
                density="compact"
                color="primary"
              />
            </div>
            <div class="management-buttons">
              <v-btn
                v-if="!net.startedAt"
                color="success"
                size="large"
                :loading="actionLoading"
                @click="startNet"
                class="management-button start-button"
                elevation="1"
                rounded
              >
                <v-icon size="24" class="mr-2">mdi-play-circle-outline</v-icon>
                {{ t('net.start') }}
              </v-btn>

              <v-btn
                v-if="net.startedAt && !net.endedAt"
                color="error"
                size="large"
                :loading="actionLoading"
                @click="handleEndNet"
                class="management-button end-button"
                elevation="1"
                rounded
              >
                <v-icon size="24" class="mr-2">mdi-stop-circle-outline</v-icon>
                {{ t('net.end') }}
              </v-btn>

              <v-btn
                v-if="net.endedAt && isAdmin"
                color="warning"
                size="large"
                :loading="actionLoading"
                @click="handleRestartNet"
                class="management-button restart-button"
                elevation="1"
                rounded
              >
                <v-icon size="24" class="mr-2">mdi-restart</v-icon>
                {{ t('net.restart') }}
              </v-btn>
              <v-btn
                color="secondary"
                size="large"
                prepend-icon="mdi-pencil"
                :to="`/nets/${net.id}/edit`"
              >
                {{ t('net.edit') }}
              </v-btn>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-row>
        <v-col cols="12">
          <v-card class="dashboard-card dashboard-card--secondary custom-table-card">
            <v-card-title class="d-flex align-center justify-space-between py-4 px-6">
              <div class="d-flex align-center">
                <v-icon icon="mdi-account-group" size="24" class="mr-2" />
                {{ t('net.attendees') }}
                <v-btn
                  class="ml-4"
                  icon="mdi-refresh"
                  size="small"
                  variant="flat"
                  :loading="loading"
                  @click="fetchAttendees"
                />
              </div>

              <div class="d-flex justify-end">
                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-printer"
                  :to="`/nets/${net.id}/report`"
                  :disabled="attendees?.length === 0"
                  target="_blank"
                  class="ml-2"
                >
                  {{ t('common.report') }}
                </v-btn>
              </div>
            </v-card-title>

            <v-card-text>
              <div class="search-container my-6">
                <NewAttendeeModal
                  v-if="canAddAttendee"
                  v-model="showNewAttendeeModal"
                  :net-id="net?.id"
                  :existing-call-signs="attendees?.map((a) => a.callSign)"
                  :attendees="attendees"
                  @add-attendee="addAttendee"
                />
              </div>

              <hr class="my-4" v-if="attendees?.length > 0" />
              <v-data-table
                v-if="attendees?.length > 0"
                :headers="attendeeHeaders"
                :items="tableItems"
                :loading="loadingAttendees"
                hover
                density="comfortable"
                items-per-page="100"
                class="custom-data-table elevation-1"
              >
                <template v-slot:loading>
                  <v-skeleton-loader type="table-row" class="pa-4"></v-skeleton-loader>
                </template>

                <template v-slot:item.orderNumber="{ item }">
                  <span class="text-primary font-weight-medium cursor-pointer">
                    {{ item.orderNumber }}
                  </span>
                </template>

                <template v-slot:item.callSign="{ item }">
                  <div class="d-flex align-center">
                    <template v-if="item.raw?.operator?.user">
                      <span
                        class="text-primary font-weight-medium cursor-pointer"
                        @click="navigateToOperator(item.raw.operator.id)"
                      >
                        {{ item.raw.callSign }}
                        <v-icon size="x-small" class="ms-1">mdi-open-in-new</v-icon>
                      </span>
                    </template>
                    <template v-else>
                      {{ item.raw.callSign }}
                    </template>
                  </div>
                </template>

                <template v-slot:item.name="{ item }">
                  <v-tooltip
                    :text="item.raw?.name || '-'"
                    location="top"
                    :disabled="
                      !shouldShowTooltip(item.raw?.name || '-', cellRefs[`name-${item.raw.id}`])
                    "
                  >
                    <template v-slot:activator="{ props }">
                      <div
                        class="text-truncate d-flex align-center"
                        v-bind="props"
                        :ref="(el) => (cellRefs[`name-${item.raw.id}`] = el)"
                      >
                        <template v-if="canEdit(item.raw)">
                          <v-tooltip :text="t('net.editAttendeeName')" location="top">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                size="small"
                                class="mr-2 clickable-cell"
                                v-bind="props"
                                @click="editAttendee(item.raw, 'name')"
                              >
                                mdi-pencil
                              </v-icon>
                            </template>
                          </v-tooltip>
                        </template>
                        {{ item.raw?.name || '-' }}
                      </div>
                    </template>
                  </v-tooltip>
                </template>

                <template v-slot:item.qth="{ item }">
                  <v-tooltip
                    :text="formatQth(item.raw) || '-'"
                    location="top"
                    :disabled="
                      !shouldShowTooltip(formatQth(item.raw) || '-', cellRefs[`qth-${item.raw.id}`])
                    "
                  >
                    <template v-slot:activator="{ props }">
                      <div
                        class="text-truncate d-flex align-center"
                        v-bind="props"
                        :ref="(el) => (cellRefs[`qth-${item.raw.id}`] = el)"
                      >
                        <template v-if="canEdit(item.raw)">
                          <v-tooltip :text="t('net.editAttendeeQTH')" location="top">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                size="small"
                                class="mr-2 clickable-cell"
                                v-bind="props"
                                @click="editAttendee(item.raw, 'qth')"
                              >
                                mdi-pencil
                              </v-icon>
                            </template>
                          </v-tooltip>
                        </template>
                        {{ formatQth(item.raw) || '-' }}
                      </div>
                    </template>
                  </v-tooltip>
                </template>

                <template v-slot:item.readability="{ item }">
                  <v-tooltip
                    :text="item.raw?.readability || '-'"
                    location="top"
                    :disabled="
                      !shouldShowTooltip(
                        item.raw?.readability?.toString() || '-',
                        cellRefs[`readability-${item.raw.id}`]
                      )
                    "
                  >
                    <template v-slot:activator="{ props }">
                      <div
                        class="text-truncate d-flex align-center"
                        v-bind="props"
                        :ref="(el) => (cellRefs[`readability-${item.raw.id}`] = el)"
                      >
                        <template v-if="canEdit(item.raw)">
                          <v-tooltip :text="t('net.editAttendeeReadability')" location="top">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                size="small"
                                class="mr-2 clickable-cell"
                                v-bind="props"
                                @click="editAttendee(item.raw, 'readability')"
                              >
                                mdi-pencil
                              </v-icon>
                            </template>
                          </v-tooltip>
                        </template>
                        <span :class="getSignalClass(item.raw?.readability)">
                          {{ item.raw?.readability || '-' }}
                        </span>
                      </div>
                    </template>
                  </v-tooltip>
                </template>

                <template v-slot:item.signalStrength="{ item }">
                  <v-tooltip
                    :text="item.raw?.signalStrength || '-'"
                    location="top"
                    :disabled="
                      !shouldShowTooltip(
                        item.raw?.signalStrength?.toString() || '-',
                        cellRefs[`signalStrength-${item.raw.id}`]
                      )
                    "
                  >
                    <template v-slot:activator="{ props }">
                      <div
                        class="text-truncate d-flex align-center"
                        v-bind="props"
                        :ref="(el) => (cellRefs[`signalStrength-${item.raw.id}`] = el)"
                      >
                        <template v-if="canEdit(item.raw)">
                          <v-tooltip :text="t('net.editAttendeeSignalStrength')" location="top">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                size="small"
                                class="mr-2 clickable-cell"
                                v-bind="props"
                                @click="editAttendee(item.raw, 'signalStrength')"
                              >
                                mdi-pencil
                              </v-icon>
                            </template>
                          </v-tooltip>
                        </template>
                        <span :class="getSignalClass(item.raw?.signalStrength, true)">
                          {{ item.raw?.signalStrength || '-' }}
                        </span>
                      </div>
                    </template>
                  </v-tooltip>
                </template>

                <template v-slot:item.createdAt="{ item }">
                  <v-tooltip
                    :text="formatDate(item.raw?.createdAt, true)"
                    location="top"
                    :disabled="
                      !shouldShowTooltip(
                        formatDate(item.raw?.createdAt, true),
                        cellRefs[`createdAt-${item.raw.id}`]
                      )
                    "
                  >
                    <template v-slot:activator="{ props }">
                      <div
                        class="text-truncate"
                        v-bind="props"
                        :ref="(el) => (cellRefs[`createdAt-${item.raw.id}`] = el)"
                      >
                        {{ formatDate(item.raw?.createdAt, true) }}
                      </div>
                    </template>
                  </v-tooltip>
                </template>

                <template v-slot:item.actions="{ item }">
                  <div class="d-flex justify-end gap-2">
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      color="error"
                      variant="text"
                      :loading="item.loading"
                      @click="item.raw && deleteAttendee(item)"
                    />
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-dialog v-model="showEndConfirm" max-width="500">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ t('net.endConfirmTitle') }}
        </v-card-title>
        <v-card-text class="pa-4">
          {{ t('net.endConfirmText') }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="showEndConfirm = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="error" @click="confirmEndNet">
            {{ t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showOperatorDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ t('net.changeOperatorTitle') }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="operatorSearchQuery"
            :loading="loadingOperatorSearch"
            :label="t('operator.searchOperator')"
            :placeholder="t('operator.searchOperatorPlaceholder')"
            hide-details
            class="mb-4"
            @update:model-value="debouncedSearchOperatorsForChange"
          >
            <template v-slot:prepend-inner>
              <v-icon>mdi-magnify</v-icon>
            </template>
          </v-text-field>

          <v-list v-if="operatorSearchResults.length > 0" class="operator-list">
            <v-list-item
              v-for="operator in operatorSearchResults"
              :key="operator.id"
              :active="selectedNewOperator?.id === operator.id"
              @click="selectedNewOperator = operator"
            >
              <v-list-item-title>{{ operator.callSign }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ operator.fullName || operator.user?.fullName || operator.user?.email }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <template v-if="selectedNewOperator">
            <v-list-item>
              <v-list-item-title>{{ selectedNewOperator.callSign }}</v-list-item-title>
              <v-list-item-subtitle>
                {{
                  selectedNewOperator.fullName ||
                  selectedNewOperator.user?.fullName ||
                  selectedNewOperator.user?.email
                }}
              </v-list-item-subtitle>
            </v-list-item>
          </template>

          <v-alert
            v-else-if="operatorSearchQuery && !loadingOperatorSearch"
            type="info"
            variant="tonal"
          >
            {{ t('operator.noResults') }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="cancelOperatorChange">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="primary" :disabled="!selectedNewOperator" @click="confirmOperatorChange">
            {{ t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRestartConfirm" max-width="500">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ t('net.restartConfirmTitle') }}
        </v-card-title>
        <v-card-text class="pa-4">
          {{ t('net.restartConfirmText') }}
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="grey" variant="text" @click="showRestartConfirm = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="warning" @click="confirmRestartNet">
            {{ t('common.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <edit-modal
      v-model="showEditDrawer"
      :title="editDrawerTitle"
      :fields="editFields"
      :initial-data="editInitialData"
      :loading="editLoading"
      @save="handleEditSave"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { REPEATER_FREQUENCY_LABELS } from '~/constants/enums/repeater-frequency'
import { useToast } from '~/composables/useToast'
import { Role } from '~/constants/enums/role'
import { debounce } from 'lodash-es'
import { useCardStyles } from '~/composables/useCardStyles'
import { useErrorMessage } from '~/composables/useErrorMessage'
import EditModal from '~/components/EditModal.vue'
import { useTruncate } from '~/composables/useTruncate'
import NewAttendeeModal from '~/components/NewAttendeeModal.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const { t } = useI18n()
const { errorToast, successToast } = useToast()
const { $auth } = useNuxtApp()
const { formatDate, formatDuration } = useFormatDate()
const { getIconColor } = useCardStyles()
const { getErrorMessage } = useErrorMessage()
const { shouldShowTooltip } = useTruncate()

const net = ref(null)
const attendees = ref([])
const loading = ref(true)
const loadingAttendees = ref(true)
const actionLoading = ref(false)
const showEndConfirm = ref(false)
const showRestartConfirm = ref(false)
const showOperatorDialog = ref(false)
const isMobile = ref(false)
const operatorSearchQuery = ref('')
const loadingOperatorSearch = ref(false)
const operatorSearchResults = ref([])
const selectedNewOperator = ref(null)
const showEditDrawer = ref(false)
const editType = ref(null)
const editItem = ref(null)
const editLoading = ref(false)
const cellRefs = ref({})
const showNewAttendeeModal = ref(false)
const addOperatorAsAttendee = ref(true)
const attendeeHeaders = ref([
  {
    title: '#',
    key: 'orderNumber',
    align: 'center',
    width: '60px',
  },
  {
    title: t('operator.callSign'),
    key: 'callSign',
    align: 'start',
    width: '120px',
  },
  {
    title: t('net.operator'),
    key: 'name',
    align: 'start',
  },
  {
    title: t('operator.qth'),
    key: 'qth',
    align: 'start',
  },
  {
    title: 'R',
    key: 'readability',
    align: 'center',
    width: '80px',
  },
  {
    title: 'S',
    key: 'signalStrength',
    align: 'center',
    width: '80px',
  },
  {
    title: t('attendee.createdAt'),
    key: 'createdAt',
    align: 'center',
    width: '160px',
  },
  {
    title: t('common.actions'),
    key: 'actions',
    align: 'end',
    width: '100px',
    sortable: false,
  },
])

const canManageNet = computed(() => {
  const currentUser = $auth.user.value
  if (!currentUser) return false

  if (currentUser.role === Role.ADMIN || currentUser.role === Role.SUPER_ADMIN) return true

  return net.value && currentUser.id === net.value.operator?.user?.id
})

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN)
const isSuperAdmin = computed(() => $auth.user.value?.role === Role.SUPER_ADMIN)

const canChangeOperator = computed(() => {
  if (!net.value?.startedAt) {
    return isAdmin.value
  }
  return isSuperAdmin.value
})

const canAddAttendee = computed(() => {
  const currentUser = $auth.user.value
  if (!currentUser) return false

  if (currentUser.role === Role.ADMIN || currentUser.role === Role.SUPER_ADMIN) return true

  if (net.value?.operator?.user?.id === currentUser.id) {
    return net.value.startedAt && !net.value.endedAt
  }

  return false
})

const tableItems = computed(() => {
  return attendees.value.map((attendee, index) => ({
    orderNumber: attendees.value.length - index,
    callSign: attendee.callSign,
    name: attendee.name,
    qth: attendee.qth,
    readability: attendee.readability,
    signalStrength: attendee.signalStrength,
    createdAt: attendee.createdAt,
    raw: attendee,
  }))
})

const editDrawerTitle = computed(() => {
  switch (editType.value) {
    case 'name':
      return t('net.editAttendeeName')
    case 'qth':
      return t('net.editAttendeeQTH')
    case 'readability':
      return t('net.editAttendeeReadability')
    case 'signalStrength':
      return t('net.editAttendeeSignalStrength')
    default:
      return t('common.edit')
  }
})

const editFields = computed(() => {
  switch (editType.value) {
    case 'name':
      return [
        {
          type: 'text',
          key: 'name',
          label: t('auth.fullName'),
        },
      ]
    case 'qth':
      return [
        {
          type: 'qth',
          key: 'qthData',
          label: t('operator.qth'),
        },
      ]
    case 'readability':
      return [
        {
          type: 'signal-selector',
          key: 'readability',
          label: t('operator.readability'),
          boxCount: 5,
        },
      ]
    case 'signalStrength':
      return [
        {
          type: 'signal-selector',
          key: 'signalStrength',
          label: t('operator.signalStrength'),
          boxCount: 9,
          levels: [
            { max: 2, level: 1 },
            { max: 4, level: 2 },
            { max: 6, level: 3 },
            { max: 8, level: 4 },
            { max: 9, level: 5 },
          ],
        },
      ]
    default:
      return []
  }
})

const editInitialData = computed(() => {
  if (!editItem.value) return {}

  switch (editType.value) {
    case 'name':
      return { name: editItem.value.name || '' }
    case 'qth':
      return {
        qthData: {
          country: editItem.value.country || '',
          city: editItem.value.city || '',
          district: editItem.value.district || '',
        },
      }
    case 'readability':
      return { readability: editItem.value.readability }
    case 'signalStrength':
      return { signalStrength: editItem.value.signalStrength }
    default:
      return {}
  }
})

const debouncedSearchOperatorsForChange = debounce(
  (search) => searchOperatorsForChange(search),
  300
)

const addAttendee = async (attendee) => {
  try {
    const response = await api.post(`/net/${net.value.id}/attendee`, attendee)

    attendees.value = [response, ...attendees.value]

    if (net.value) {
      net.value.attendeeCount = (net.value.attendeeCount || 0) + 1
    }

    successToast(t('net.attendeeAdded'))
  } catch (error) {
    console.error('Error adding attendee:', error)
    errorToast(getErrorMessage(error))
  }
}

const deleteAttendee = async (item) => {
  if (!item?.raw?.id) return

  try {
    item.loading = true
    await api.delete(`/net/${net.value.id}/attendee/${item.raw.id}`)

    successToast(t('net.attendeeDeleted'))
    await fetchAttendees()
  } catch (error) {
    console.error('Error deleting attendee:', error)
    errorToast(getErrorMessage(error))
  } finally {
    item.loading = false
  }
}

const navigateToOperator = async (operatorId) => {
  if (!operatorId) return

  try {
    loading.value = true
    const operator = await api.get(`/operator/${operatorId}`)
    if (operator?.user?.id) {
      router.push(`/users/${operator.user.id}/profile`)
    } else {
      errorToast(t('operator.notFound'))
    }
  } catch (error) {
    console.error('Error fetching operator:', error)
    errorToast(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}

const startNet = async () => {
  if (!canManageNet.value) return

  try {
    actionLoading.value = true
    await api.patch(`/net/${net.value.id}/start`, {
      addOperatorAsAttendee: addOperatorAsAttendee.value,
    })
    successToast(t('net.startSuccess'))
    await fetchNet()
    await fetchAttendees()
  } catch (error) {
    console.error('Error starting net:', error)
    errorToast(t('net.startError'))
  } finally {
    actionLoading.value = false
  }
}

const handleEndNet = () => {
  if (!canManageNet.value) return

  showEndConfirm.value = true
}

const confirmEndNet = () => {
  showEndConfirm.value = false
  endNet()
}

const endNet = async () => {
  if (!canManageNet.value) return

  try {
    actionLoading.value = true
    await api.patch(`/net/${net.value.id}/end`)
    successToast(t('net.endSuccess'))
    await fetchNet()
  } catch (error) {
    console.error('Error ending net:', error)
    errorToast(t('net.endError'))
  } finally {
    actionLoading.value = false
  }
}

const fetchNet = async () => {
  try {
    loading.value = true
    const data = await api.get(`/net/${route.params.id}`)

    if (!data) {
      errorToast(t('net.notFound'))
      router.push('/nets')
      return
    }

    net.value = data
  } catch (error) {
    console.error('Error fetching net:', error)
    errorToast(t('net.fetchError'))
    router.push('/nets')
  } finally {
    loading.value = false
  }
}

const fetchAttendees = async () => {
  if (!net.value?.id) return

  try {
    loadingAttendees.value = true
    const data = await api.get(`/net/${route.params.id}/attendee?sort=DESC`)
    attendees.value = data || []
  } catch (error) {
    console.error('Error fetching attendees:', error)
    errorToast(t('net.attendeesFetchError'))
  } finally {
    loadingAttendees.value = false
  }
}

const getSignalClass = (value, isSignalStrength = false) => {
  if (!value) return ''

  const maxValue = isSignalStrength ? 9 : 5
  const ratio = value / maxValue

  if (ratio <= 0.2) return 'text-error'
  if (ratio <= 0.4) return 'text-warning'
  if (ratio <= 0.6) return 'text-info'
  if (ratio <= 0.8) return 'text-success-darken-1'
  return 'text-success'
}

const checkMobile = () => {
  isMobile.value = window.innerWidth < 960
}

const editAttendee = (item, type) => {
  editType.value = type
  editItem.value = item
  showEditDrawer.value = true
}

const handleEditSave = async (data) => {
  try {
    editLoading.value = true

    const payload = {}
    switch (editType.value) {
      case 'name':
        payload.name = data.name
        break
      case 'qth':
        if (data.qthData) {
          payload.country = data.qthData.country || null
          payload.city = data.qthData.city || null
          payload.district = data.qthData.district || null
        }
        break
      case 'readability':
        payload.readability = data.readability
        break
      case 'signalStrength':
        payload.signalStrength = data.signalStrength
        break
    }

    await api.patch(`/net/${net.value.id}/attendee/${editItem.value.id}`, payload)
    await fetchAttendees()
    successToast(t('net.attendeeUpdated'))
    showEditDrawer.value = false
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    editLoading.value = false
  }
}

const canEdit = (attendee) => {
  if (!net.value || !attendee) return false
  if ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) return true
  if (net.value.endedAt) return false
  return net.value.operator?.user?.id === $auth.user.value?.id
}

const cancelOperatorChange = () => {
  showOperatorDialog.value = false
  operatorSearchQuery.value = ''
  operatorSearchResults.value = []
  selectedNewOperator.value = null
}

const confirmOperatorChange = async () => {
  if (!selectedNewOperator.value) return

  try {
    actionLoading.value = true
    await api.patch(`/net/${net.value.id}/operator`, {
      operatorId: selectedNewOperator.value.id,
    })
    successToast(t('net.operatorChanged'))
    await fetchNet()
    cancelOperatorChange()
  } catch (error) {
    console.error('Error changing operator:', error)
    errorToast(t('net.operatorChangeError'))
  } finally {
    actionLoading.value = false
  }
}

const handleRestartNet = () => {
  showRestartConfirm.value = true
}

const confirmRestartNet = async () => {
  try {
    actionLoading.value = true
    await api.patch(`/net/${net.value.id}/restart`)
    successToast(t('net.restartSuccess'))
    await fetchNet()
    showRestartConfirm.value = false
  } catch (error) {
    console.error('Error restarting net:', error)
    errorToast(t('net.restartError'))
  } finally {
    actionLoading.value = false
  }
}

const formatQth = (attendee) => {
  if (!attendee) return ''

  const parts = []
  if (attendee.country) parts.push(attendee.country)
  if (attendee.city) parts.push(attendee.city)
  if (attendee.district) parts.push(attendee.district)

  return parts.join(', ')
}

const searchOperatorsForChange = async (search) => {
  if (!search || search.length < 2) {
    operatorSearchResults.value = []
    return
  }

  try {
    loadingOperatorSearch.value = true
    const response = await api.get(`/operator/search?q=${search}`)
    operatorSearchResults.value = (response || []).filter(
      (op) => op.user && op.user.role !== Role.GUEST
    )
  } catch (error) {
    console.error('Error searching operators:', error)
    errorToast(t('operator.searchError'))
  } finally {
    loadingOperatorSearch.value = false
  }
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.removeEventListener('resize', checkMobile)

  if ($auth.user.value?.role !== Role.ADMIN && $auth.user.value?.role !== Role.SUPER_ADMIN) {
    await fetchNet()

    if (!canManageNet.value) {
      errorToast(t('error.forbidden'))
      router.push('/nets')
      return
    }
  }

  await fetchNet()
  await fetchAttendees()
})

watch(selectedNewOperator, (newValue) => {
  if (newValue) {
    operatorSearchQuery.value = ''
    operatorSearchResults.value = []
  }
})

definePageMeta({
  requiresAuth: true,
  roles: [Role.VOLUNTEER],
  key: (route) => route.fullPath,
})
</script>
