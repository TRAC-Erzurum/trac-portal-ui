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
          v-if="$auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN"
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
                v-model="searchQuery"
                :label="t('operator.searchOperator')"
                :placeholder="t('operator.searchOperatorPlaceholder')"
                prepend-inner-icon="mdi-magnify"
                density="comfortable"
                variant="outlined"
                hide-details
                clearable
                class="flex-grow-1"
                @update:model-value="debouncedSearch"
              />
              <v-btn
                class="ml-4"
                icon="mdi-refresh"
                size="small"
                variant="flat"
                :loading="loading"
                @click="loadOperators"
              />
            </v-card-title>

            <v-data-table-server
              :headers="headers"
              :items="operators"
              :loading="loading"
              :no-data-text="t('operator.noResults')"
              :items-per-page="itemsPerPage"
              :page="page"
              :items-length="totalItems"
              @update:page="onPageChange"
              @update:items-per-page="onItemsPerPageChange"
              @update:sort-by="onSortChange"
              hover
              class="custom-data-table"
            >
              <template v-slot:loading>
                <v-skeleton-loader type="table-row" class="pa-4"></v-skeleton-loader>
              </template>

              <template v-slot:item.callSign="{ item }">
                <v-tooltip :text="item.callSign" location="top">
                  <template v-slot:activator="{ props }">
                    <div class="text-truncate" v-bind="props">
                      {{ formatCallSign(item) }}
                    </div>
                  </template>
                </v-tooltip>
              </template>

              <template v-slot:item.qth="{ item }">
                <v-tooltip :text="formatQTH(item)" location="top">
                  <template v-slot:activator="{ props }">
                    <div class="text-truncate d-flex align-center" v-bind="props">
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
              </template>

              <template v-slot:item.gridSquare="{ item }">
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
                      href="https://k7fry.com/grid"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="d-flex align-center"
                    >
                      {{ t('common.find') }}
                      <v-icon size="small" class="ml-2">mdi-open-in-new</v-icon>
                    </a>
                  </template>
                </div>
              </template>

              <template v-slot:item.fullName="{ item }">
                <v-tooltip v-if="item.user" :text="item.user.fullName" location="top">
                  <template v-slot:activator="{ props }">
                    <div
                      class="text-truncate d-flex align-center"
                      v-bind="props"
                      @click="navigateToUserProfile(item.user.id)"
                    >
                      <div class="d-flex flex-column">
                        <span class="font-weight-medium">
                          {{ item.user.fullName || t('operator.noFullName') }}
                          <v-icon size="small">mdi-open-in-new</v-icon>
                        </span>
                        <span class="text-caption">{{ item.user.email }}</span>
                      </div>
                    </div>
                  </template>
                </v-tooltip>
                <v-tooltip v-else-if="canEdit(item)" :text="item.fullName || '-'" location="top">
                  <template v-slot:activator="{ props }">
                    <div class="text-truncate d-flex align-center" v-bind="props">
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
              </template>

              <template v-slot:item.createdAt="{ item }">
                <v-tooltip :text="formatDate(item.createdAt)" location="top">
                  <template v-slot:activator="{ props }">
                    <div class="text-truncate" v-bind="props">
                      {{ formatDate(item.createdAt) }}
                    </div>
                  </template>
                </v-tooltip>
              </template>

              <template v-slot:item.createdBy="{ item }" v-if="$auth.user.value?.role === Role.SUPER_ADMIN">
                <span class="text-caption">{{ item.createdBy || '-' }}</span>
              </template>

              <template v-slot:item.updatedBy="{ item }" v-if="$auth.user.value?.role === Role.SUPER_ADMIN">
                <span class="text-caption">{{ item.updatedBy?.length ? item.updatedBy.join(', ') : '-' }}</span>
              </template>

              <template v-slot:item.actions="{ item }" v-if="$auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN">
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
                  v-else
                  icon="mdi-delete"
                  size="small"
                  color="error"
                  variant="text"
                  @click="confirmDelete(item)"
                  :disabled="item.netCount > 0"
                />
              </template>
            </v-data-table-server>
          </v-card>

          <!-- Import Dialog -->
          <v-dialog v-model="showImportDialog" max-width="600px">
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
                <v-btn @click="showImportDialog = false" variant="elevated" color="accent">
                  {{ t('cancel') }}
                </v-btn>
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

          <!-- Delete Dialog -->
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

    <!-- Edit Modal -->
    <edit-modal
      v-model="showEditModal"
      :title="editModalTitle"
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

const { t } = useI18n()
const api = useApi()
const { $auth } = useNuxtApp()
const { successToast, errorToast } = useToast()
const { formatDate } = useFormatDate()
const { getIconColor } = useCardStyles()
const { getErrorMessage } = useErrorMessage()

// Reactive state
const loading = ref(false)
const operators = ref([])
const totalItems = ref(0)
const page = ref(1)
const itemsPerPage = ref(50)
const searchQuery = ref('')
const sortBy = ref([])

// Role management
const roleUpdateLoading = ref({})

// Import functionality
const importing = ref(false)
const showImportDialog = ref(false)
const fileInput = ref(null)
const selectedFile = ref(null)
const columnMapping = ref({})
const availableColumns = ref([])

// Delete functionality
const showDeleteDialog = ref(false)
const deleting = ref(false)
const operatorToDelete = ref(null)

// Edit functionality
const showEditModal = ref(false)
const editType = ref(null)
const editItem = ref(null)
const editLoading = ref(false)

// Table headers
const headers = computed(() => {
  const baseHeaders = [
    { title: t('operator.callSign'), key: 'callSign', sortable: true },
    { title: t('operator.qth'), key: 'qth', sortable: true },
    { title: t('operator.gridSquare'), key: 'gridSquare', sortable: true },
    { title: t('operator.fullName'), key: 'fullName', sortable: true },
    { title: t('operator.createdAt'), key: 'createdAt', sortable: true },
  ]
  
  if ($auth.user.value?.role === Role.SUPER_ADMIN) {
    baseHeaders.push(
      { title: t('common.createdBy'), key: 'createdBy', sortable: false },
      { title: t('common.updatedBy'), key: 'updatedBy', sortable: false }
    )
  }
  
  return baseHeaders
})

// Import fields mapping
const mappableFields = [
  { key: 'callSign', required: true },
  { key: 'country', required: false },
  { key: 'city', required: false },
  { key: 'district', required: false },
  { key: 'fullName', required: false },
]

// Role options (exclude SUPER_ADMIN as it cannot be assigned)
const roles = Object.values(Role)
  .filter((role) => role !== Role.SUPER_ADMIN)
  .map((role) => ({
    title: t(`roles.${role}`),
    value: role,
  }))

// Computed properties
const isCallSignMapped = computed(() => {
  return !!columnMapping.value.callSign
})

const editModalTitle = computed(() => {
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

// Debounced search function
let searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1 // Reset to first page when searching
    loadOperators()
  }, 500)
}

// Load operators from API
const loadOperators = async () => {
  loading.value = true
  try {
    const params = {
      pageNumber: page.value,
      pageSize: itemsPerPage.value,
      sort: sortBy.value.length > 0 ? sortBy.value[0].order.toUpperCase() : 'DESC',
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const response = await api.get('/operator', { params })

    operators.value = response.data || []
    totalItems.value = response.total || 0

    console.log('Loaded operators:', operators.value.length, 'Total:', totalItems.value)
  } catch (error) {
    console.error('Error loading operators:', error)
    errorToast(getErrorMessage(error))
    operators.value = []
    totalItems.value = 0
  } finally {
    loading.value = false
  }
}

// Event handlers
const onPageChange = (newPage) => {
  page.value = newPage
  loadOperators()
}

const onItemsPerPageChange = (newItemsPerPage) => {
  itemsPerPage.value = newItemsPerPage
  page.value = 1
  loadOperators()
}

const onSortChange = (newSortBy) => {
  sortBy.value = newSortBy
  page.value = 1
  loadOperators()
}

// Utility functions
const formatCallSign = (operator) => {
  if (operator.prefix) {
    return `${operator.prefix}/${operator.callSign}${operator.suffix ? `/${operator.suffix}` : ''}`
  }
  return operator.callSign
}

const formatQTH = (operator) => {
  return [operator.district, operator.city, operator.country].filter(Boolean).join(', ')
}

const canEdit = (operator) => {
  return ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) && !operator.user
}

const navigateToUserProfile = (userId) => {
  return navigateTo(`/users/${userId}/profile`)
}

// Role management
const updateUserRole = async (user) => {
  try {
    roleUpdateLoading.value[user.id] = true
    await api.patch(`/user/${user.id}/role`, { role: user.role })
    successToast(t('role.updated'))
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    roleUpdateLoading.value[user.id] = false
  }
}

// Import functionality
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
        title: header.trim().replace(/^"|"$/g, ''),
        value: header.trim().replace(/^"|"$/g, ''),
      }))
      columnMapping.value = {}
      selectedFile.value = file
      showImportDialog.value = true
    }
    reader.readAsText(file)
  } catch (error) {
    errorToast(getErrorMessage(error))
  }
}

const confirmImport = async () => {
  if (!selectedFile.value) return

  importing.value = true
  showImportDialog.value = false

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const cleanMapping = Object.entries(columnMapping.value).reduce((acc, [key, value]) => {
      acc[key] = value.replace(/^"|"$/g, '')
      return acc
    }, {})

    formData.append('mapping', JSON.stringify(cleanMapping))

    await api.upload('/operator/import', formData)
    successToast(t('operator.importSuccess'))
    await loadOperators()
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    importing.value = false
    selectedFile.value = null
    fileInput.value.value = ''
    columnMapping.value = {}
  }
}

// Delete functionality
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
    await loadOperators()
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    deleting.value = false
    showDeleteDialog.value = false
    operatorToDelete.value = null
  }
}

// Edit functionality
const editQTH = (item) => {
  editType.value = 'qth'
  editItem.value = item
  showEditModal.value = true
}

const editGridSquare = (item) => {
  editType.value = 'gridSquare'
  editItem.value = item
  showEditModal.value = true
}

const editFullName = (item) => {
  editType.value = 'fullName'
  editItem.value = item
  showEditModal.value = true
}

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
    successToast(t('operator.updateSuccess'))
    showEditModal.value = false
    await loadOperators()
  } catch (error) {
    errorToast(getErrorMessage(error))
  } finally {
    editLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  if ($auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN) {
    headers.value.push({ title: t('common.actions'), key: 'actions', sortable: false })
  }
  loadOperators()
})

// Page meta
definePageMeta({
  requiresAuth: true,
  roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.MEMBER, Role.VOLUNTEER],
})
</script>

<style scoped>
.clickable-cell {
  cursor: pointer;
}

.custom-select {
  min-width: 120px;
}

.bg-error-lighten-4 {
  background-color: rgba(244, 67, 54, 0.1);
}

.bg-inactive-row {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
