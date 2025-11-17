<template>
  <div class="session-card-grid">
    <div v-if="loading" class="loading-skeleton">
      <v-skeleton-loader
        v-for="i in 6"
        :key="i"
        type="card"
        class="session-card-skeleton"
      ></v-skeleton-loader>
    </div>
    <template v-else>
      <div v-if="sessions.length === 0" class="text-center pa-4">
        <v-icon size="48" color="grey">mdi-calendar-blank</v-icon>
        <div class="text-body-1 mt-2">{{ t('session.noSessions') }}</div>
      </div>
      <div v-else class="session-card-container">
        <v-card
          v-for="session in sessions"
          :key="session.id"
          class="session-card"
          :class="[
            {
              'bg-not-started': !session.startedAt,
              'bg-in-progress': session.startedAt && !session.endedAt,
              'bg-completed': session.startedAt && session.endedAt,
            },
          ]"
          @click="canManageSession(session) && navigateToManage(session)"
        >
          <v-card-item>
            <v-card-title
              class="text-primary text-center"
              :class="{ 'font-weight-bold': session.startedAt && !session.endedAt }"
            >
              {{ session.name }}
            </v-card-title>
          </v-card-item>

          <v-card-text>
            <div class="session-info">
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-account</v-icon>
                <a
                  class="operator-link text-decoration-none text-primary d-inline-flex align-center cursor-pointer"
                  @click.stop="navigateToOperator(session.operator)"
                  :title="t('operator.viewProfile')"
                >
                  {{ session.operator.callSign }}
                  <v-icon size="small" class="ms-1">mdi-open-in-new</v-icon>
                </a>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-signal</v-icon>
                <span>{{ REPEATER_FREQUENCY_LABELS[session.frequency] }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-access-point</v-icon>
                <span>{{ t(`mode.${session.mode}`) }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-start</v-icon>
                <span>{{ formatDate(session.startedAt) || '-' }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-end</v-icon>
                <span>{{ formatDate(session.endedAt) || '-' }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-outline</v-icon>
                <span>{{ formatDuration(session.startedAt, session.endedAt) }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-account-group</v-icon>
                <span>{{ session.attendeeCount }} katılımcı</span>
              </div>
              <template v-if="isSuperAdmin && (session.createdBy || session.updatedBy?.length)">
                <v-divider class="my-2"></v-divider>
                <div v-if="session.createdBy" class="info-row">
                  <v-icon size="small" color="secondary" class="me-2">mdi-account-plus</v-icon>
                  <span class="text-caption">{{ t('common.createdBy') }}: {{ session.createdBy }}</span>
                </div>
                <div v-if="session.updatedBy && session.updatedBy.length > 0" class="info-row">
                  <v-icon size="small" color="secondary" class="me-2">mdi-account-edit</v-icon>
                  <span class="text-caption">{{ t('common.updatedBy') }}: {{ session.updatedBy.join(', ') }}</span>
                </div>
              </template>
            </div>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="justify-center flex-wrap pa-2">
            <template v-if="isAdmin || isSessionOperator(session)">
              <v-btn
                v-if="!session.startedAt"
                color="success"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('start-session', session)"
                :title="t('session.start')"
              >
                <v-icon>mdi-play</v-icon>
                <span class="ms-1">{{ t('session.start') }}</span>
              </v-btn>

              <v-btn
                v-if="session.startedAt && !session.endedAt"
                color="error"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('end-session', session)"
                :title="t('session.end')"
              >
                <v-icon>mdi-stop</v-icon>
                <span class="ms-1">{{ t('session.end') }}</span>
              </v-btn>

              <v-btn
                v-if="isAdmin && session.startedAt && session.endedAt"
                color="warning"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('restart-session', session)"
                :title="t('session.restart')"
              >
                <v-icon>mdi-restart</v-icon>
                <span class="ms-1">{{ t('session.restart') }}</span>
              </v-btn>

              <v-btn
                v-if="isAdmin"
                color="error"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('delete-session', session)"
                :title="t('session.delete')"
              >
                <v-icon>mdi-delete</v-icon>
                <span class="ms-1">{{ t('session.delete') }}</span>
              </v-btn>
            </template>

            <v-btn
              v-if="canViewReport && session.attendeeCount > 0"
              color="secondary"
              size="small"
              variant="text"
              class="action-button"
              @click.stop="navigateToReport(session)"
              :title="t('common.report')"
            >
              <v-icon>mdi-file-document-outline</v-icon>
              <span class="ms-1">{{ t('common.report') }}</span>
            </v-btn>
          </v-card-actions>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatDate } from '~/composables/useFormatDate'
import { REPEATER_FREQUENCY_LABELS } from '~/constants/enums/repeater-frequency'
import { Role } from '~/constants/enums/role'

const { t } = useI18n()
const { formatDate, formatDuration } = useFormatDate()
const { $auth } = useNuxtApp()

const props = defineProps({
  sessions: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start-session', 'end-session', 'restart-session', 'delete-session'])

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN)
const isSuperAdmin = computed(() => $auth.user.value?.role === Role.SUPER_ADMIN)

const isSessionOperator = (session) => {
  return $auth.user.value?.id === session.operator?.user?.id
}

const canManageSession = (session) => {
  return isAdmin.value || isSessionOperator(session)
}

const navigateToManage = (session) => {
  navigateTo(`/sessions/${session.id}/manage`)
}

const navigateToOperator = (operator) => {
  if (!operator?.user?.id) return
  navigateTo(`/users/${operator.user.id}/profile`)
}

const canViewReport = computed(() => {
  return $auth.user.value?.role !== Role.GUEST
})

const navigateToReport = (session) => {
  window.open(`/sessions/${session.id}/report`, '_blank')
}
</script>

<style lang="scss" scoped>
.session-card-grid {
  width: 100%;
}

.loading-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.session-card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.session-card {
  border-radius: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.bg-not-started {
    border-left: 4px solid rgba(var(--v-theme-info), 0.7);
  }

  &.bg-in-progress {
    border-left: 4px solid rgba(var(--v-theme-success), 0.7);
  }

  &.bg-completed {
    border-left: 4px solid rgba(var(--v-theme-secondary), 0.7);
  }

  .v-card-item {
    padding-bottom: 8px;
  }

  .v-card-text {
    flex-grow: 1;
    padding-top: 0;
  }

  .v-card-title {
    word-break: break-word;
    white-space: normal;
    line-height: 1.4;
  }
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .info-row {
    display: flex;
    align-items: center;

    i {
      width: 20px;
    }
  }
}

.action-button {
  margin: 4px;
}

.operator-link {
  &:hover {
    text-decoration: underline !important;
  }
}
</style>
