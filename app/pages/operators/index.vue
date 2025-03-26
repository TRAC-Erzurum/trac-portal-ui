<template>
  <v-container class="my-8">
    <v-card class="dashboard-card dashboard-card--secondary">
      <div class="card-title">
        <v-icon size="32" :color="getIconColor(1)" class="mr-4">mdi-account-network</v-icon>
        <div class="title-content">
          <div class="text-h6">Operatörler</div>
        </div>
        <v-spacer />
        <v-btn
          v-if="$auth.user.value?.role === Role.ADMIN"
          prepend-icon="mdi-file-import"
          size="small"
          variant="tonal"
          color="secondary"
          @click="triggerFileInput"
          :loading="importing"
        >
          {{ t('import') }}
        </v-btn>
        <input
          type="file"
          ref="fileInput"
          accept=".csv"
          style="display: none"
          @change="handleFileUpload"
        />
      </div>
      <v-card-text>
        <v-container>
          <v-card class="custom-table-card">
            <v-card-title class="d-flex align-center py-4 px-6">
              <v-text-field
                v-model="search"
                :label="t('operator.searchOperator')"
                :placeholder="t('operator.searchOperatorPlaceholder')"
                prepend-inner-icon="mdi-magnify"
                density="comfortable"
                variant="outlined"
                hide-details
                clearable
                class="flex-grow-1"
              />
              <v-btn
                class="ml-4"
                icon="mdi-refresh"
                size="small"
                variant="flat"
                :loading="loading"
                @click="fetchOperators"
              />
            </v-card-title>

            <v-data-table
              :headers="headers"
              :items="filteredOperators"
              :loading="loading"
              :no-data-text="t('operator.noResults')"
              hover
              class="custom-data-table"
            >
              <template v-slot:loading>
                <v-skeleton-loader type="table-row" class="pa-4"></v-skeleton-loader>
              </template>

              <template v-slot:header="{ props }">
                <tr>
                  <th
                    v-for="header in props.headers"
                    :key="header.key"
                    class="text-primary font-weight-bold text-subtitle-2 px-6"
                  >
                    {{ header.title }}
                  </th>
                </tr>
              </template>

              <template v-slot:item="{ item }">
                <tr
                  :class="{
                    'bg-error-lighten-4': item.user?.role === Role.GUEST,
                    'bg-inactive-row': !item.user,
                  }"
                >
                  <td class="px-6">
                    <v-tooltip
                      :text="`${item.prefix ? `${item.prefix}/` : ''}${item.callSign}${
                        item.suffix ? `/${item.suffix}` : ''
                      }`"
                      location="top"
                      :disabled="
                        !shouldShowTooltip(
                          `${item.prefix ? `${item.prefix}/` : ''}${item.callSign}${
                            item.suffix ? `/${item.suffix}` : ''
                          }`,
                          cellRefs[`callSign-${item.id}`]
                        )
                      "
                    >
                      <template v-slot:activator="{ props }">
                        <div
                          class="text-truncate"
                          v-bind="props"
                          :ref="(el) => (cellRefs[`callSign-${item.id}`] = el)"
                        >
                          {{ item.prefix ? `${item.prefix}/` : '' }}{{ item.callSign
                          }}{{ item.suffix ? `/${item.suffix}` : '' }}
                        </div>
                      </template>
                    </v-tooltip>
                  </td>

                  <td class="px-6">
                    <v-tooltip
                      :text="formatQTH(item)"
                      location="top"
                      :disabled="!shouldShowTooltip(formatQTH(item), cellRefs[`qth-${item.id}`])"
                    >
                      <template v-slot:activator="{ props }">
                        <div
                          class="text-truncate d-flex align-center"
                          v-bind="props"
                          :ref="(el) => (cellRefs[`qth-${item.id}`] = el)"
                        >
                          <template v-if="canEdit(item)">
                            <v-tooltip :text="t('operator.editQTH')" location="top">
                              <template v-slot:activator="{ props }">
                                <v-icon
                                  size="small"
                                  class="mr-2 clickable-cell"
                                  v-bind="props"
                                  @click="editQTH(item)"
                                >
                                  mdi-pencil
                                </v-icon>
                              </template>
                            </v-tooltip>
                          </template>
                          {{ formatQTH(item) }}
                        </div>
                      </template>
                    </v-tooltip>
                  </td>

                  <td class="px-6">
                    <div class="d-flex align-center">
                      <template v-if="canEdit(item)">
                        <v-tooltip :text="t('operator.editGridSquare')" location="top">
                          <template v-slot:activator="{ props }">
                            <v-icon
                              size="small"
                              class="mr-2 clickable-cell"
                              v-bind="props"
                              @click="editGridSquare(item)"
                            >
                              mdi-pencil
                            </v-icon>
                          </template>
                        </v-tooltip>
                      </template>
                      <template v-if="item.gridSquare">
                        <a
                          :href="`https://k7fry.com/grid/?qth=${item.gridSquare}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="d-flex align-center"
                        >
                          {{ item.gridSquare }}
                          <v-icon size="small" class="ml-2">mdi-open-in-new</v-icon>
                        </a>
                      </template>
                      <template v-else>
                        <a
                          :href="`https://k7fry.com/grid`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="d-flex align-center"
                        >
                          {{ t('common.find') }}
                          <v-icon size="small" class="ml-2">mdi-open-in-new</v-icon>
                        </a>
                      </template>
                    </div>
                  </td>

                  <td class="px-6">
                    <v-tooltip
                      v-if="item.user"
                      :text="item.user.fullName"
                      location="top"
                      :disabled="
                        !shouldShowTooltip(item.user.fullName, cellRefs[`name-${item.id}`])
                      "
                    >
                      <template v-slot:activator="{ props }">
                        <div
                          class="text-truncate d-flex align-center"
                          v-bind="props"
                          :ref="(el) => (cellRefs[`name-${item.id}`] = el)"
                          @click="navigateToUserProfile(item.user.id)"
                        >
                          <div class="d-flex flex-column">
                            <span class="font-weight-medium">
                              {{ item.user.fullName ?? t('operator.noFullName') }}
                              <v-icon size="small">mdi-open-in-new</v-icon>
                            </span>
                            <span class="text-caption">{{ item.user.email }}</span>
                          </div>
                        </div>
                      </template>
                    </v-tooltip>
                    <v-tooltip
                      v-else-if="canEdit(item)"
                      :text="item.fullName || '-'"
                      location="top"
                      :disabled="
                        !shouldShowTooltip(item.fullName || '-', cellRefs[`name-${item.id}`])
                      "
                    >
                      <template v-slot:activator="{ props }">
                        <div
                          class="text-truncate d-flex align-center"
                          v-bind="props"
                          :ref="(el) => (cellRefs[`name-${item.id}`] = el)"
                        >
                          <v-tooltip :text="t('operator.editFullName')" location="top">
                            <template v-slot:activator="{ props }">
                              <v-icon
                                size="small"
                                class="mr-2 clickable-cell"
                                v-bind="props"
                                @click="editFullName(item)"
                              >
                                mdi-pencil
                              </v-icon>
                            </template>
                          </v-tooltip>
                          {{ item.fullName || '-' }}
                        </div>
                      </template>
                    </v-tooltip>
                    <div v-else>{{ item.fullName || '-' }}</div>
                  </td>

                  <td class="px-6">
                    <v-tooltip
                      :text="formatDate(item.createdAt)"
                      location="top"
                      :disabled="
                        !shouldShowTooltip(formatDate(item.createdAt), cellRefs[`date-${item.id}`])
                      "
                    >
                      <template v-slot:activator="{ props }">
                        <div
                          class="text-truncate"
                          v-bind="props"
                          :ref="(el) => (cellRefs[`date-${item.id}`] = el)"
                        >
                          {{ formatDate(item.createdAt) }}
                        </div>
                      </template>
                    </v-tooltip>
                  </td>

                  <template v-if="$auth.user.value?.role === Role.ADMIN">
                    <td class="px-6">
                      <v-select
                        v-if="item.user"
                        v-model="item.user.role"
                        :items="roles"
                        :loading="roleUpdateLoading[item.user.id]"
                        density="comfortable"
                        variant="outlined"
                        hide-details
                        class="custom-select"
                        @update:model-value="updateUserRole(item.user)"
                      />
                      <v-btn
                        v-if="!item.user"
                        icon="mdi-delete"
                        size="small"
                        color="error"
                        variant="text"
                        @click="confirmDelete(item)"
                        :disabled="item.sessionCount > 0"
                      />
                    </td>
                  </template>
                </tr>
              </template>
            </v-data-table>
          </v-card>

          <v-dialog v-model="showWarningDialog" max-width="600px">
            <v-card variant="elevated">
              <v-card-title>{{ t('operator.importMapping') }}</v-card-title>
              <v-card-text>
                <p class="mb-4">{{ t('operator.importMappingText') }}</p>

                <v-list>
                  <v-list-item v-for="field in mappableFields" :key="field.key">
                    <template v-slot:title>
                      {{ t(`operator.${field.key}`) }}
                    </template>
                    <v-select
                      v-model="columnMapping[field.key]"
                      :items="availableColumns"
                      :label="t('operator.selectColumn')"
                      density="comfortable"
                      variant="outlined"
                      hide-details
                      class="mt-2"
                    />
                  </v-list-item>
                </v-list>

                <v-alert
                  v-if="!isCallSignMapped"
                  type="warning"
                  variant="tonal"
                  class="mt-4"
                  icon="mdi-alert"
                >
                  {{ t('operator.callSignRequired') }}
                </v-alert>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="showWarningDialog = false" variant="elevated" color="accent">{{
                  t('cancel')
                }}</v-btn>
                <v-btn
                  color="primary"
                  @click="confirmImport"
                  :disabled="!isCallSignMapped"
                  variant="elevated"
                >
                  {{ t('continue') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>

          <v-dialog v-model="showDeleteDialog" max-width="400px">
            <v-card>
              <v-card-title>{{ t('operator.confirmDelete') }}</v-card-title>
              <v-card-text>{{ t('operator.deleteWarning') }}</v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="showDeleteDialog = false" variant="text">
                  {{ t('cancel') }}
                </v-btn>
                <v-btn color="error" variant="elevated" :loading="deleting" @click="deleteOperator">
                  {{ t('delete') }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </v-container>
      </v-card-text>
    </v-card>

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
import { ref, onMounted, computed } from 'vue'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import { useCardStyles } from '~/composables/useCardStyles'
import { useErrorMessage } from '~/composables/useErrorMessage'
import EditModal from '~/components/EditModal.vue'
import { useTruncate } from '~/composables/useTruncate'

const { t } = useI18n()
const api = useApi()
const { $auth } = useNuxtApp()
const { successToast, errorToast } = useToast()
const { formatDate } = useFormatDate()
const { getIconColor } = useCardStyles()
const { getErrorMessage } = useErrorMessage()
const { shouldShowTooltip } = useTruncate()

const loading = ref(true)
const operators = ref([])
const roleUpdateLoading = ref({})
const fileInput = ref(null)
const importing = ref(false)
const showWarningDialog = ref(false)
const selectedFile = ref(null)
const columnMapping = ref({})
const availableColumns = ref([])
const showDeleteDialog = ref(false)
const deleting = ref(false)
const operatorToDelete = ref(null)
const search = ref('')
const headers = ref([
  { title: t('operator.callSign'), key: 'callSign' },
  { title: t('operator.qth'), key: 'qth' },
  { title: t('operator.gridSquare'), key: 'gridSquare' },
  { title: t('operator.fullName'), key: 'fullName' },
  { title: t('operator.createdAt'), key: 'createdAt' },
])
const mappableFields = [
  { key: 'callSign', required: true },
  { key: 'country', required: false },
  { key: 'city', required: false },
  { key: 'district', required: false },
  { key: 'fullName', required: false },
]

const roles = Object.values(Role).map((role) => ({
  title: t(`roles.${role}`),
  value: role,
}))

const isCallSignMapped = computed(() => {
  return !!columnMapping.value.callSign
})

const filteredOperators = computed(() => {
  if (!search.value) return operators.value

  const searchTerm = search.value.toLowerCase()
  return operators.value.filter((operator) => {
    const callSign = `${operator.prefix || ''}${operator.callSign}${
      operator.suffix || ''
    }`.toLowerCase()
    const fullName = operator.user
      ? (operator.user.fullName || '').toLowerCase()
      : (operator.fullName || '').toLowerCase()
    const qth = formatQTH(operator).toLowerCase()

    return (
      callSign.includes(searchTerm) || fullName.includes(searchTerm) || qth.includes(searchTerm)
    )
  })
})

const formatQTH = (item) => {
  return [item.district, item.city, item.country].filter((i) => i).join(', ')
}

const fetchOperators = async () => {
  try {
    loading.value = true
    const response = await api.get('/operator')
    operators.value = response
  } catch (error) {
    errorToast(t('common.error', { error: error.message }))
    console.error('Error fetching operators:', error)
    operators.value = []
  } finally {
    loading.value = false
  }
}

const navigateToUserProfile = (userId) => {
  return navigateTo(`/users/${userId}/profile`)
}

const updateUserRole = async (user) => {
  try {
    roleUpdateLoading.value[user.id] = true
    await api.patch(`/user/${user.id}/role`, { role: user.role })
    successToast(t('role.updated'))
  } catch (error) {
    errorToast(t('common.error', { error: error.message }))
  } finally {
    roleUpdateLoading.value[user.id] = false
  }
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.name.endsWith('.csv')) {
    errorToast(t('operator.invalidFileType'))
    event.target.value = ''
    return
  }

  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      const firstLine = e.target.result.split('\n')[0]
      availableColumns.value = firstLine.split(',').map((header) => ({
        title: header.trim(),
        value: header.trim(),
      }))
      columnMapping.value = {}
      selectedFile.value = file
      showWarningDialog.value = true
    }
    reader.readAsText(file)
  } catch (error) {
    errorToast(getErrorMessage(error))
    console.error('File upload error:', error)
  }
}

const confirmImport = async () => {
  if (!selectedFile.value) return

  importing.value = true
  showWarningDialog.value = false

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('mapping', JSON.stringify(columnMapping.value))

    await api.upload('/operator/import', formData)
    successToast(t('operator.importSuccess'))
    await fetchOperators()
  } catch (error) {
    errorToast(t('operator.importError', { error: error.message }))
    console.error('File upload error:', error)
  } finally {
    importing.value = false
    selectedFile.value = null
    fileInput.value.value = ''
    columnMapping.value = {}
  }
}

const confirmDelete = (operator) => {
  operatorToDelete.value = operator
  showDeleteDialog.value = true
}

const deleteOperator = async () => {
  if (!operatorToDelete.value) return

  try {
    deleting.value = true
    await api.delete(`/operator/${operatorToDelete.value.id}`)
    successToast(t('operator.deleteSuccess'))
    await fetchOperators()
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    deleting.value = false
    showDeleteDialog.value = false
    operatorToDelete.value = null
  }
}

const canEdit = (operator) => {
  return $auth.user.value?.role === Role.ADMIN && !operator.user
}

const editQTH = (item) => {
  editType.value = 'qth'
  editItem.value = item
  showEditDrawer.value = true
}

const editGridSquare = (item) => {
  editType.value = 'gridSquare'
  editItem.value = item
  showEditDrawer.value = true
}

const showEditDrawer = ref(false)
const editType = ref(null)
const editItem = ref(null)
const editLoading = ref(false)

const editDrawerTitle = computed(() => {
  switch (editType.value) {
    case 'qth':
      return t('operator.editQTH')
    case 'fullName':
      return t('operator.editFullName')
    case 'gridSquare':
      return t('operator.editGridSquare')
    default:
      return t('common.edit')
  }
})

const editFields = computed(() => {
  switch (editType.value) {
    case 'qth':
      return [
        {
          type: 'qth',
          key: 'qthData',
        },
      ]
    case 'fullName':
      return [
        {
          type: 'text',
          key: 'fullName',
          label: t('operator.fullName'),
        },
      ]
    case 'gridSquare':
      return [
        {
          type: 'text',
          key: 'gridSquare',
          label: t('operator.gridSquare'),
          uppercase: true,
        },
      ]
    default:
      return []
  }
})

const editInitialData = computed(() => {
  if (!editItem.value) return {}

  switch (editType.value) {
    case 'qth':
      return {
        qthData: {
          country: editItem.value.country || '',
          city: editItem.value.city || '',
          district: editItem.value.district || '',
        },
      }
    case 'fullName':
      return {
        fullName: editItem.value.fullName || '',
      }
    case 'gridSquare':
      return {
        gridSquare: editItem.value.gridSquare || '',
      }
    default:
      return {}
  }
})

const handleEditSave = async (data) => {
  try {
    editLoading.value = true
    const operatorId = editItem.value.id
    let updatedData = {}

    switch (editType.value) {
      case 'qth':
        updatedData = {
          country: data.qthData.country || null,
          city: data.qthData.city || null,
          district: data.qthData.district || null,
        }
        break
      case 'fullName':
        updatedData = {
          fullName: data.fullName,
        }
        break
      case 'gridSquare':
        updatedData = {
          gridSquare: data.gridSquare,
        }
        break
    }

    await api.patch(`/operator/${operatorId}`, updatedData)

    const operatorIndex = operators.value.findIndex((op) => op.id === operatorId)
    if (operatorIndex !== -1) {
      operators.value[operatorIndex] = {
        ...operators.value[operatorIndex],
        ...updatedData,
      }
    }

    successToast(t('operator.updateSuccess'))
    showEditDrawer.value = false
  } catch (error) {
    errorToast(t('common.error', { error: error.message }))
  } finally {
    editLoading.value = false
  }
}

const editFullName = (item) => {
  editType.value = 'fullName'
  editItem.value = item
  showEditDrawer.value = true
}

const cellRefs = ref({})

onMounted(() => {
  if ($auth.user.value?.role === Role.ADMIN) {
    headers.value.push({ title: t('common.actions'), key: 'actions', sortable: false })
  }

  fetchOperators()
})

definePageMeta({
  requiresAuth: true,
  roles: [Role.ADMIN, Role.MEMBER, Role.VOLUNTEER],
})
</script>
