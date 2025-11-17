<template>
  <div class="net-grid">
    <v-row class="grid-padding">
      <v-col v-for="net in nets" :key="net.id" cols="12" sm="6" md="4" lg="3">
        <v-card
          class="net-card"
          :class="{
            'bg-not-started': !net.startedAt,
            'bg-in-progress': net.startedAt && !net.endedAt,
          }"
        >
          <div class="net-content">
            <div class="net-header">
              <div class="net-name">{{ net.name }}</div>
              <div class="net-meta">
                <div class="net-operator">
                  <a
                    class="operator-link"
                    @click.stop="navigateToOperator(net.operator)"
                    :title="t('operator.viewProfile')"
                  >
                    {{ net.operator.callSign }}
                  </a>
                </div>
                <div class="net-status">
                  <v-icon v-if="net.startedAt && !net.endedAt" size="small" color="success"
                    >mdi-circle</v-icon
                  >
                  <v-icon v-else-if="net.endedAt" size="small" color="grey">mdi-circle</v-icon>
                  <v-icon v-else size="small" color="grey-lighten-1">mdi-circle</v-icon>
                </div>
              </div>
            </div>

            <div class="net-info">
              <div class="info-item">
                <v-icon size="small" color="primary">mdi-account-group</v-icon>
                <span class="label">{{ t('net.attendeeCount') }}:</span>
                <span class="value">{{ net.attendeeCount }}</span>
              </div>
              <div class="info-item">
                <v-icon size="small" color="info">mdi-radio-tower</v-icon>
                <span class="label">{{ t('net.frequency') }}:</span>
                <span class="value">{{ REPEATER_FREQUENCY_LABELS[net.frequency] }}</span>
              </div>
              <div v-if="net.startedAt" class="info-item">
                <v-icon size="small" color="success">mdi-play</v-icon>
                <span class="value">{{ formatNetDates(net) }}</span>
              </div>
            </div>

            <div class="net-actions">
              <v-tooltip :text="t('net.manage')" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-if="canManageNet(net)"
                    v-bind="props"
                    color="primary"
                    size="small"
                    variant="text"
                    @click.stop="navigateToManage(net)"
                  >
                    <v-icon>mdi-cog</v-icon>
                    <span class="d-none d-sm-inline ms-1">{{ t('net.manage') }}</span>
                  </v-btn>
                </template>
              </v-tooltip>

              <v-tooltip
                :text="net.attendeeCount ? t('common.report') : t('net.noAttendees')"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-if="canViewReport"
                    v-bind="props"
                    color="secondary"
                    size="small"
                    variant="text"
                    :disabled="!net.attendeeCount"
                    @click.stop="navigateToReport(net)"
                  >
                    <v-icon>mdi-file-document-outline</v-icon>
                    <span class="d-none d-sm-inline ms-1">{{ t('common.report') }}</span>
                  </v-btn>
                </template>
              </v-tooltip>

              <template v-if="isAdmin || isNetOperator(net)">
                <v-tooltip v-if="!net.startedAt" :text="t('net.start')" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="success"
                      size="small"
                      variant="text"
                      @click.stop="$emit('start-net', net)"
                    >
                      <v-icon>mdi-play</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('net.start') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip
                  v-if="net.startedAt && !net.endedAt"
                  :text="t('net.end')"
                  location="top"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="error"
                      size="small"
                      variant="text"
                      @click.stop="$emit('end-net', net)"
                    >
                      <v-icon>mdi-stop</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('net.end') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>

                <v-tooltip
                  v-if="isAdmin && net.startedAt && net.endedAt"
                  :text="t('net.restart')"
                  location="top"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="warning"
                      size="small"
                      variant="text"
                      @click.stop="$emit('restart-net', net)"
                    >
                      <v-icon>mdi-restart</v-icon>
                      <span class="d-none d-sm-inline ms-1">{{ t('net.restart') }}</span>
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
  nets: {
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

const emit = defineEmits(['start-net', 'end-net', 'restart-net'])

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN)

const isNetOperator = (net) => {
  return $auth.user.value?.id === net.operator?.user?.id
}

const canManageNet = (net) => {
  return isAdmin.value || isNetOperator(net)
}

const navigateToManage = (net) => {
  navigateTo(`/nets/${net.id}/manage`)
}

const navigateToOperator = (operator) => {
  if (!operator?.user?.id) return
  navigateTo(`/users/${operator.user.id}/profile`)
}

const canViewReport = computed(() => {
  return $auth.user.value?.role !== Role.GUEST
})

const navigateToReport = (net) => {
  window.open(`/nets/${net.id}/report`, '_blank')
}

const formatNetDates = (net) => {
  if (!net.startedAt) return ''

  const startDate = new Date(net.startedAt)
  const startFormatted = formatDate(startDate, 'DD.MM.YY HH:mm')

  if (!net.endedAt) return startFormatted

  const endDate = new Date(net.endedAt)

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
.net-grid {
  .grid-padding {
    padding: 8px;
  }

  .net-card {
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

  .net-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .net-header {
    .net-name {
      font-size: 1rem;
      font-weight: 500;
      color: rgb(var(--v-theme-on-surface));
      margin-bottom: 4px;
    }

    .net-meta {
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

  .net-info {
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

  .net-actions {
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
  .net-grid {
    .grid-padding {
      padding: 4px;
    }

    .net-card {
      max-width: 100%;
      margin: 0;

      .net-content {
        padding: 8px;
        gap: 8px;
      }

      .net-header {
        .net-name {
          font-size: 0.875rem;
        }
      }

      .net-info {
        .info-item {
          font-size: 0.75rem;
          padding: 2px 6px;
          gap: 4px;

          .label {
            font-size: 0.7rem;
          }
        }
      }

      .net-actions {
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
