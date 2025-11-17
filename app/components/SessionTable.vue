<template>
  <div class="session-grid">
    <v-row class="grid-padding">
      <v-col v-for="session in sessions" :key="session.id" cols="12" sm="6" md="4" lg="3">
        <v-card
          class="session-card"
          :class="{
            'bg-not-started': !session.startedAt,
            'bg-in-progress': session.startedAt && !session.endedAt,
          }"
        >
          <div class="session-content">
            <div class="session-header">
              <div class="session-name">{{ session.name }}</div>
              <div class="session-meta">
                <div class="session-operator">
                  <a
                    class="operator-link"
                    @click.stop="navigateToOperator(session.operator)"
                    :title="t('operator.viewProfile')"
                  >
                    {{ session.operator.callSign }}
                  </a>
                </div>
                <div class="session-status">
                  <v-icon v-if="session.startedAt && !session.endedAt" size="small" color="success"
                    >mdi-circle</v-icon
                  >
                  <v-icon v-else-if="session.endedAt" size="small" color="grey">mdi-circle</v-icon>
                  <v-icon v-else size="small" color="grey-lighten-1">mdi-circle</v-icon>
                </div>
              </div>
            </div>

            <div class="session-info">
              <div class="info-item">
                <v-icon size="small" color="primary">mdi-account-group</v-icon>
                <span class="label">{{ t('session.attendeeCount') }}:</span>
                <span class="value">{{ session.attendeeCount }}</span>
              </div>
              <div class="info-item">
                <v-icon size="small" color="info">mdi-radio-tower</v-icon>
                <span class="label">{{ t('session.frequency') }}:</span>
                <span class="value">{{ REPEATER_FREQUENCY_LABELS[session.frequency] }}</span>
              </div>
              <div v-if="session.startedAt" class="info-item">
                <v-icon size="small" color="success">mdi-play</v-icon>
                <span class="value">{{ formatSessionDates(session) }}</span>
              </div>
            </div>

            <div class="session-actions">
              <v-tooltip :text="t('session.manage')" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-if="canManageSession(session)"
                    v-bind="props"
                    color="primary"
                    size="small"
                    variant="text"
                    @click.stop="navigateToManage(session)"
                  >
                    <v-icon>mdi-cog</v-icon>
                    <span class="d-none d-sm-inline ms-1">{{ t('session.manage') }}</span>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip
                :text="session.attendeeCount ? t('common.report') : t('session.noAttendees')"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-if="canViewReport"
                    v-bind="props"
                    color="secondary"
                    size="small"
                    variant="text"
                    :disabled="!session.attendeeCount"
                    @click.stop="navigateToReport(session)"
                  >
                    <v-icon>mdi-file-document-outline</v-icon>
                    <span class="d-none d-sm-inline ms-1">{{ t('common.report') }}</span>
                  </v-btn>
                </template>
              </v-tooltip>

              <template v-if="isAdmin || isSessionOperator(session)">
                <v-tooltip v-if="!session.startedAt" :text="t('session.start')" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="success"
                      size="small"
                      variant="text"
                      @click.stop="$emit('start-session', session)"
                    >
                      <v-icon>mdi-play</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('session.start') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip
                  v-if="session.startedAt && !session.endedAt"
                  :text="t('session.end')"
                  location="top"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="error"
                      size="small"
                      variant="text"
                      @click.stop="$emit('end-session', session)"
                    >
                      <v-icon>mdi-stop</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('session.end') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip
                  v-if="isAdmin && session.startedAt && session.endedAt"
                  :text="t('session.restart')"
                  location="top"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="warning"
                      size="small"
                      variant="text"
                      @click.stop="$emit('restart-session', session)"
                    >
                      <v-icon>mdi-restart</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('session.restart') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>
              </template>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatDate } from '~/composables/useFormatDate'
import { REPEATER_FREQUENCY_LABELS } from '~/constants/enums/repeater-frequency'
import { Role } from '~/constants/enums/role'

const { t } = useI18n()
const { formatDate } = useFormatDate()
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
  hidePagination: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start-session', 'end-session', 'restart-session'])

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN)

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

const formatSessionDates = (session) => {
  if (!session.startedAt) return ''

  const startDate = new Date(session.startedAt)
  const startFormatted = formatDate(startDate, 'DD.MM.YY HH:mm')

  if (!session.endedAt) return startFormatted

  const endDate = new Date(session.endedAt)

  // Eğer başlangıç ve bitiş aynı gün ise
  if (startDate.toDateString() === endDate.toDateString()) {
    const startTime = formatDate(startDate, 'HH:mm')
    const endTime = formatDate(endDate, 'HH:mm')
    return `${formatDate(startDate, 'DD.MM.YY')} ${startTime}-${endTime}`
  }

  const endFormatted = formatDate(endDate, 'DD.MM.YY HH:mm')
  return `${startFormatted}-${endFormatted}`
}
</script>

<style lang="scss" scoped>
.session-grid {
  .grid-padding {
    padding: 8px;
  }

  .session-card {
    height: 100%;
    transition: all 0.2s ease;
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), 0.12);
    background: rgb(var(--v-theme-surface));
    max-width: 300px;
    margin: 0 auto;

    &:hover {
      border-color: rgba(var(--v-theme-primary), 0.2);
    }

    &.bg-not-started {
      background: rgb(var(--v-theme-surface));
    }

    &.bg-in-progress {
      background: rgba(var(--v-theme-success), 0.02);
    }
  }

  .session-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .session-header {
    .session-name {
      font-size: 1rem;
      font-weight: 500;
      color: rgb(var(--v-theme-on-surface));
      margin-bottom: 4px;
    }

    .session-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      color: rgba(var(--v-theme-on-surface), 0.7);
    }

    .operator-link {
      color: rgb(var(--v-theme-primary));
      text-decoration: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .session-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 4px 0;

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: rgba(var(--v-theme-on-surface), 0.7);
      padding: 4px 8px;
      background: rgba(var(--v-theme-surface), 0.5);
      border-radius: 4px;

      .v-icon {
        opacity: 0.7;
      }

      .label {
        color: rgba(var(--v-theme-on-surface), 0.5);
        font-size: 0.75rem;
      }

      .value {
        font-weight: 500;
      }
    }
  }

  .session-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;

    .v-btn {
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      border-radius: 4px;
      background: rgba(var(--v-theme-surface), 0.5);
      font-size: 0.75rem;

      &:hover {
        background: rgba(var(--v-theme-surface), 0.8);
      }

      .v-icon {
        font-size: 18px;
      }
    }
  }
}

@media (max-width: 600px) {
  .session-grid {
    .grid-padding {
      padding: 4px;
    }

    .session-card {
      max-width: 100%;
      margin: 0;

      .session-content {
        padding: 8px;
        gap: 8px;
      }

      .session-header {
        .session-name {
          font-size: 0.875rem;
        }
      }

      .session-info {
        .info-item {
          font-size: 0.75rem;
          padding: 2px 6px;
          gap: 4px;

          .label {
            font-size: 0.7rem;
          }
        }
      }

      .session-actions {
        .v-btn {
          min-width: 28px;
          height: 28px;
          padding: 0 4px;
          font-size: 0.7rem;

          .v-icon {
            font-size: 16px;
          }
        }
      }
    }
  }
}
</style>
