<template>
  <div class="net-card-grid">
    <div v-if="loading" class="loading-skeleton">
      <v-skeleton-loader
        v-for="i in 6"
        :key="i"
        type="card"
        class="net-card-skeleton"
      ></v-skeleton-loader>
    </div>
    <template v-else>
      <div v-if="nets.length === 0" class="text-center pa-4">
        <v-icon size="48" color="grey">mdi-calendar-blank</v-icon>
        <div class="text-body-1 mt-2">{{ t('net.noNets') }}</div>
      </div>
      <div v-else class="net-card-container">
        <v-card
          v-for="net in nets"
          :key="net.id"
          class="net-card"
          :class="[
            {
              'bg-not-started': !net.startedAt,
              'bg-in-progress': net.startedAt && !net.endedAt,
              'bg-completed': net.startedAt && net.endedAt,
            },
          ]"
          @click="canManageNet(net) && navigateToManage(net)"
        >
          <v-card-item>
            <v-card-title
              class="text-primary text-center"
              :class="{ 'font-weight-bold': net.startedAt && !net.endedAt }"
            >
              {{ net.name }}
            </v-card-title>
          </v-card-item>

          <v-card-text>
            <div class="net-info">
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-account</v-icon>
                <a
                  class="operator-link text-decoration-none text-primary d-inline-flex align-center cursor-pointer"
                  @click.stop="navigateToOperator(net.operator)"
                  :title="t('operator.viewProfile')"
                >
                  {{ net.operator.callSign }}
                  <v-icon size="small" class="ms-1">mdi-open-in-new</v-icon>
                </a>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-signal</v-icon>
                <span>{{ REPEATER_FREQUENCY_LABELS[net.frequency] }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-access-point</v-icon>
                <span>{{ t(`mode.${net.mode}`) }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-start</v-icon>
                <span>{{ formatDate(net.startedAt) || '-' }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-end</v-icon>
                <span>{{ formatDate(net.endedAt) || '-' }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-clock-outline</v-icon>
                <span>{{ formatDuration(net.startedAt, net.endedAt) }}</span>
              </div>
              <div class="info-row">
                <v-icon size="small" color="primary" class="me-2">mdi-account-group</v-icon>
                <span>{{ net.attendeeCount }} katılımcı</span>
              </div>
              <template v-if="isSuperAdmin && (net.createdBy || net.updatedBy?.length)">
                <v-divider class="my-2"></v-divider>
                <div v-if="net.createdBy" class="info-row">
                  <v-tooltip :text="`${t('common.createdBy')}: ${net.createdBy}`">
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        size="small"
                        color="secondary"
                        class="me-2 cursor-pointer"
                      >
                        mdi-account-plus
                      </v-icon>
                    </template>
                  </v-tooltip>
                </div>
                <div v-if="net.updatedBy && net.updatedBy.length > 0" class="info-row">
                  <v-tooltip>
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        size="small"
                        color="secondary"
                        class="me-2 cursor-pointer"
                      >
                        mdi-account-edit
                      </v-icon>
                    </template>
                    <div class="updated-by-tooltip">
                      <div class="tooltip-title">{{ t('common.updatedBy') }}:</div>
                      <div
                        v-for="(email, index) in net.updatedBy"
                        :key="index"
                        class="tooltip-item"
                      >
                        {{ email }}
                      </div>
                    </div>
                  </v-tooltip>
                </div>
              </template>
            </div>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="justify-center flex-wrap pa-2">
            <template v-if="isAdmin || isNetOperator(net)">
              <v-btn
                v-if="!net.startedAt"
                color="success"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('start-net', net)"
                :title="t('net.start')"
              >
                <v-icon>mdi-play</v-icon>
                <span class="ms-1">{{ t('net.start') }}</span>
              </v-btn>

              <v-btn
                v-if="net.startedAt && !net.endedAt"
                color="error"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('end-net', net)"
                :title="t('net.end')"
              >
                <v-icon>mdi-stop</v-icon>
                <span class="ms-1">{{ t('net.end') }}</span>
              </v-btn>

              <v-btn
                v-if="isAdmin && net.startedAt && net.endedAt"
                color="warning"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('restart-net', net)"
                :title="t('net.restart')"
              >
                <v-icon>mdi-restart</v-icon>
                <span class="ms-1">{{ t('net.restart') }}</span>
              </v-btn>

              <v-btn
                v-if="isAdmin"
                color="error"
                size="small"
                variant="text"
                class="action-button"
                @click.stop="$emit('delete-net', net)"
                :title="t('net.delete')"
              >
                <v-icon>mdi-delete</v-icon>
                <span class="ms-1">{{ t('net.delete') }}</span>
              </v-btn>
            </template>

            <v-btn
              v-if="canViewReport && net.attendeeCount > 0"
              color="secondary"
              size="small"
              variant="text"
              class="action-button"
              @click.stop="navigateToReport(net)"
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
  nets: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['start-net', 'end-net', 'restart-net', 'delete-net'])

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN || $auth.user.value?.role === Role.SUPER_ADMIN)
const isSuperAdmin = computed(() => $auth.user.value?.role === Role.SUPER_ADMIN)

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
</script>

<style lang="scss" scoped>
.net-card-grid {
  width: 100%;
}

.loading-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.net-card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.net-card {
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

.net-info {
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

.updated-by-tooltip {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .tooltip-title {
    font-weight: 600;
    margin-bottom: 4px;
  }

  .tooltip-item {
    padding-left: 8px;
    line-height: 1.5;
  }
}
</style>
