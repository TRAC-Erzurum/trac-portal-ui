<template>
  <v-container class="my-8">
    <v-row>
      <v-col cols="12">
        <v-card class="dashboard-card dashboard-card--secondary">
          <div class="card-title">
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center">
                <v-icon size="32" :color="getIconColor(0)" class="mr-4">mdi-radio</v-icon>
                <div class="title-content">
                  <div class="text-h6">Tüm Çevrimler</div>
                  <div class="text-caption">{{ nets.length }} çevrim listeleniyor</div>
                </div>
              </div>
              <v-btn
                v-if="$auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN || $auth.user.value?.role === Role.MEMBER"
                prepend-icon="mdi-plus"
                size="small"
                variant="tonal"
                color="secondary"
                to="/nets/create"
              >
                {{ t('net.create') }}
              </v-btn>
            </div>
          </div>

          <v-card-text>
            <v-row class="mb-6">
              <v-col cols="12">
                <div class="d-flex justify-space-around align-center pa-4 rounded bg-surface">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-primary mb-1">
                      {{ stats.totalNets }}
                    </div>
                    <div class="text-caption">Toplam Çevrim</div>
                  </div>
                  <v-divider vertical class="mx-4" />
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-success mb-1">
                      {{ stats.totalAttendees }}
                    </div>
                    <div class="text-caption">Toplam Katılımcı</div>
                  </div>
                  <v-divider vertical class="mx-4" />
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-info mb-1">
                      {{ stats.averageAttendees }}
                    </div>
                    <div class="text-caption">Ortalama Katılım</div>
                  </div>
                </div>
              </v-col>
            </v-row>

            <v-card class="custom-table-card">
              <v-card-title class="d-flex align-center py-4 px-6 justify-space-between">
                <div class="d-flex align-center">
                  <v-icon icon="mdi-calendar-clock" size="24" class="mr-2" />
                  {{ $t('nav.nets') }}
                  <v-btn
                    class="ml-4"
                    icon="mdi-refresh"
                    size="small"
                    variant="flat"
                    :loading="loading"
                    @click="fetchNets"
                  />
                </div>
              </v-card-title>

              <NetCardView
                :nets="nets"
                :loading="loading"
                @start-net="startNet"
                @end-net="endNet"
                @restart-net="restartNet"
                @delete-net="deleteNet"
              />
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from '~/utils/api'
import { useI18n } from 'vue-i18n'
import { Role } from '~/constants/enums/role'
import { useCardStyles } from '~/composables/useCardStyles'
import { useErrorMessage } from '~/composables/useErrorMessage'
import NetCardView from '~/components/NetCardView.vue'

const { t } = useI18n()
const api = useApi()
const { errorToast, successToast } = useToast()
const { $auth } = useNuxtApp()
const { formatDate, formatDuration } = useFormatDate()
const { getIconColor } = useCardStyles()
const { getErrorMessage } = useErrorMessage()

const loading = ref(true)
const nets = ref([])

const headers = ref([
  { title: t('net.name'), key: 'name' },
  { title: t('net.frequency'), key: 'frequency' },
  { title: t('net.mode'), key: 'mode' },
  { title: t('net.startedAt'), key: 'startedAt' },
  { title: t('net.endedAt'), key: 'endedAt' },
  { title: t('net.duration'), key: 'duration' },
  { title: t('net.attendeeCount'), key: 'attendeeCount' },
  { title: t('net.operator'), key: 'operator' },
])

const stats = ref({
  totalNets: 0,
  totalAttendees: 0,
  averageAttendees: 0,
})

const fetchNets = async () => {
  try {
    loading.value = true
    const response = await api.get('/net')
    nets.value = response
  } catch (error) {
    errorToast(t('net.fetchError', { error: error.message }))
    console.error('Error fetching nets:', error)
    nets.value = []
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await api.get('/dashboard/net-stats')
    stats.value = {
      totalNets: response.totalNets || 0,
      totalAttendees: response.totalAttendees || 0,
      averageAttendees: response.averageAttendees
        ? Number(response.averageAttendees).toFixed(1)
        : 0,
    }
  } catch (error) {
    console.error('Error fetching net stats:', error)
  }
}

const startNet = async (net) => {
  try {
    loading.value = true
    await api.patch(`/net/${net.id}/start`)
    successToast(t('net.startSuccess'))
    await fetchNets()
  } catch (error) {
    errorToast(t('net.startError'))
  } finally {
    loading.value = false
  }
}

const endNet = async (net) => {
  try {
    loading.value = true
    await api.patch(`/net/${net.id}/end`)
    successToast(t('net.endSuccess'))
    await fetchNets()
  } catch (error) {
    errorToast(t('net.endError'))
  } finally {
    loading.value = false
  }
}

const restartNet = async (net) => {
  try {
    loading.value = true
    await api.patch(`/net/${net.id}/restart`)
    successToast(t('net.restartSuccess'))
    await fetchNets()
  } catch (error) {
    errorToast(t('net.restartError'))
  } finally {
    loading.value = false
  }
}

const deleteNet = async (net) => {
  if (net.attendeeCount > 0) {
    errorToast(t('net.deleteAttendeeCount'))
    return
  }

  if (!confirm(t('net.deleteConfirm'))) {
    return
  }

  try {
    loading.value = true
    await api.delete(`/net/${net.id}`)
    successToast(t('net.deleteSuccess'))
    await fetchNets()
  } catch (error) {
    errorToast(t(getErrorMessage(error)))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  Promise.all([fetchNets(), fetchStats()])
})

definePageMeta({
  requiresAuth: true,
})
</script>
