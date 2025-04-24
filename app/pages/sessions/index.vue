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
                  <div class="text-caption">{{ sessions.length }} çevrim listeleniyor</div>
                </div>
              </div>
              <v-btn
                v-if="$auth.user.value?.role === Role.ADMIN"
                prepend-icon="mdi-plus"
                size="small"
                variant="tonal"
                color="secondary"
                to="/sessions/create"
              >
                {{ t('session.create') }}
              </v-btn>
            </div>
          </div>

          <v-card-text>
            <v-row class="mb-6">
              <v-col cols="12">
                <div class="d-flex justify-space-around align-center pa-4 rounded bg-surface">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-primary mb-1">
                      {{ stats.totalSessions }}
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
                  {{ $t('Sessions') }}
                  <v-btn
                    class="ml-4"
                    icon="mdi-refresh"
                    size="small"
                    variant="flat"
                    :loading="loading"
                    @click="fetchSessions"
                  />
                </div>
              </v-card-title>

              <SessionCardView
                :sessions="sessions"
                :loading="loading"
                @start-session="startSession"
                @end-session="endSession"
                @restart-session="restartSession"
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
import SessionCardView from '~/components/SessionCardView.vue'

const { t } = useI18n()
const api = useApi()
const { errorToast, successToast } = useToast()
const { $auth } = useNuxtApp()
const { formatDate, formatDuration } = useFormatDate()
const { getIconColor } = useCardStyles()

const loading = ref(true)
const sessions = ref([])

const headers = ref([
  { title: t('session.name'), key: 'name' },
  { title: t('session.frequency'), key: 'frequency' },
  { title: t('session.mode'), key: 'mode' },
  { title: t('session.startedAt'), key: 'startedAt' },
  { title: t('session.endedAt'), key: 'endedAt' },
  { title: t('session.duration'), key: 'duration' },
  { title: t('session.attendeeCount'), key: 'attendeeCount' },
  { title: t('session.operator'), key: 'operator' },
])

const stats = ref({
  totalSessions: 0,
  totalAttendees: 0,
  averageAttendees: 0,
})

const fetchSessions = async () => {
  try {
    loading.value = true
    const response = await api.get('/session')
    sessions.value = response
  } catch (error) {
    errorToast(t('session.fetchError', { error: error.message }))
    console.error('Error fetching sessions:', error)
    sessions.value = []
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const response = await api.get('/dashboard/session-stats')
    stats.value = {
      totalSessions: response.totalSessions || 0,
      totalAttendees: response.totalAttendees || 0,
      averageAttendees: response.averageAttendees
        ? Number(response.averageAttendees).toFixed(1)
        : 0,
    }
  } catch (error) {
    console.error('Error fetching session stats:', error)
  }
}

const startSession = async (session) => {
  try {
    loading.value = true
    await api.patch(`/session/${session.id}/start`)
    successToast(t('session.startSuccess'))
    await fetchSessions()
  } catch (error) {
    errorToast(t('session.startError'))
  } finally {
    loading.value = false
  }
}

const endSession = async (session) => {
  try {
    loading.value = true
    await api.patch(`/session/${session.id}/end`)
    successToast(t('session.endSuccess'))
    await fetchSessions()
  } catch (error) {
    errorToast(t('session.endError'))
  } finally {
    loading.value = false
  }
}

const restartSession = async (session) => {
  try {
    loading.value = true
    await api.patch(`/session/${session.id}/restart`)
    successToast(t('session.restartSuccess'))
    await fetchSessions()
  } catch (error) {
    errorToast(t('session.restartError'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  Promise.all([fetchSessions(), fetchStats()])
})

definePageMeta({
  requiresAuth: true,
})
</script>
