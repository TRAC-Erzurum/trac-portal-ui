<template>
  <div class="custom-data-table">
    <div class="tables-wrapper">
      <v-data-table
        :headers="headers"
        :items="sessions"
        :loading="loading"
        :hide-default-footer="hidePagination"
        hover
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
            :class="[
              {
                'bg-not-started': !item.startedAt,
                'bg-in-progress': item.startedAt && !item.endedAt,
              },
            ]"
          >
            <td class="px-6">
              <v-tooltip
                :text="item.name"
                location="top"
                :disabled="!shouldShowTooltip(item.name, cellRefs[`name-${item.id}`])"
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`name-${item.id}`] = el)"
                  >
                    {{ item.name }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <v-tooltip
                :text="REPEATER_FREQUENCY_LABELS[item.frequency]"
                location="top"
                :disabled="
                  !shouldShowTooltip(
                    REPEATER_FREQUENCY_LABELS[item.frequency],
                    cellRefs[`freq-${item.id}`]
                  )
                "
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`freq-${item.id}`] = el)"
                  >
                    {{ REPEATER_FREQUENCY_LABELS[item.frequency] }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <v-tooltip
                :text="t(`mode.${item.mode}`)"
                location="top"
                :disabled="!shouldShowTooltip(t(`mode.${item.mode}`), cellRefs[`mode-${item.id}`])"
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`mode-${item.id}`] = el)"
                  >
                    {{ t(`mode.${item.mode}`) }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <v-tooltip
                :text="formatDate(item.startedAt)"
                location="top"
                :disabled="
                  !shouldShowTooltip(formatDate(item.startedAt), cellRefs[`startedAt-${item.id}`])
                "
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`startedAt-${item.id}`] = el)"
                  >
                    {{ formatDate(item.startedAt) }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <v-tooltip
                :text="formatDate(item.endedAt)"
                location="top"
                :disabled="
                  !shouldShowTooltip(formatDate(item.endedAt), cellRefs[`endedAt-${item.id}`])
                "
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`endedAt-${item.id}`] = el)"
                  >
                    {{ formatDate(item.endedAt) }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <v-tooltip
                :text="formatDuration(item.startedAt, item.endedAt)"
                location="top"
                :disabled="
                  !shouldShowTooltip(
                    formatDuration(item.startedAt, item.endedAt),
                    cellRefs[`duration-${item.id}`]
                  )
                "
              >
                <template v-slot:activator="{ props }">
                  <div
                    class="text-truncate"
                    v-bind="props"
                    :ref="(el) => (cellRefs[`duration-${item.id}`] = el)"
                  >
                    {{ formatDuration(item.startedAt, item.endedAt) }}
                  </div>
                </template>
              </v-tooltip>
            </td>
            <td class="px-6">
              <div class="text-truncate">{{ item.attendeeCount }}</div>
            </td>
            <td class="px-6">
              <a
                @click.stop
                class="operator-link text-decoration-none text-primary d-inline-flex align-center cursor-pointer"
                @click="navigateToOperator(item.operator)"
                :title="t('operator.viewProfile')"
              >
                {{ item.operator.callSign }}
                <v-icon size="small" class="ms-1">mdi-open-in-new</v-icon>
              </a>
            </td>
            <td v-if="showManageColumn" class="actions-column px-6">
              <div class="d-flex gap-2">
                <v-tooltip :text="t('session.manage')" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-if="canManageSession(item)"
                      v-bind="props"
                      color="primary"
                      size="small"
                      variant="text"
                      @click.stop="navigateToManage(item)"
                    >
                      <v-icon>mdi-cog</v-icon>
                      <span class="d-none d-sm-inline ms-2">{{ t('session.manage') }}</span>
                    </v-btn>
                  </template>
                </v-tooltip>

                <div>
                  <v-tooltip
                    :text="item.attendeeCount ? t('common.report') : t('session.noAttendees')"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <div v-bind="props">
                        <v-btn
                          v-if="canViewReport"
                          color="secondary"
                          size="small"
                          variant="text"
                          :disabled="!item.attendeeCount"
                          @click.stop="navigateToReport(item)"
                        >
                          <v-icon>mdi-file-document-outline</v-icon>
                          <span class="d-none d-sm-inline ms-2">{{ t('common.report') }}</span>
                        </v-btn>
                      </div>
                    </template>
                  </v-tooltip>
                </div>

                <template v-if="isAdmin || isSessionOperator(item)">
                  <v-tooltip v-if="!item.startedAt" :text="t('session.start')" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="success"
                        size="small"
                        variant="text"
                        @click.stop="$emit('start-session', item)"
                      >
                        <v-icon>mdi-play</v-icon>
                        <span class="d-none d-sm-inline ms-2">{{ t('session.start') }}</span>
                      </v-btn>
                    </template>
                  </v-tooltip>

                  <v-tooltip
                    v-if="item.startedAt && !item.endedAt"
                    :text="t('session.end')"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="error"
                        size="small"
                        variant="text"
                        @click.stop="$emit('end-session', item)"
                      >
                        <v-icon>mdi-stop</v-icon>
                        <span class="d-none d-sm-inline ms-2">{{ t('session.end') }}</span>
                      </v-btn>
                    </template>
                  </v-tooltip>

                  <v-tooltip
                    v-if="isAdmin && item.startedAt && item.endedAt"
                    :text="t('session.restart')"
                    location="top"
                  >
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        color="warning"
                        size="small"
                        variant="text"
                        @click.stop="$emit('restart-session', item)"
                      >
                        <v-icon>mdi-restart</v-icon>
                        <span class="d-none d-sm-inline ms-2">{{ t('session.restart') }}</span>
                      </v-btn>
                    </template>
                  </v-tooltip>
                </template>
              </div>
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFormatDate } from '~/composables/useFormatDate'
import { REPEATER_FREQUENCY_LABELS } from '~/constants/enums/repeater-frequency'
import { Role } from '~/constants/enums/role'
import { useTruncate } from '~/composables/useTruncate'

const { t } = useI18n()
const { formatDate, formatDuration } = useFormatDate()
const { $auth } = useNuxtApp()
const { shouldShowTooltip } = useTruncate()

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

const isAdmin = computed(() => $auth.user.value?.role === Role.ADMIN)

const headers = computed(() => {
  const baseHeaders = [
    { title: t('session.name'), key: 'name' },
    { title: t('session.frequency'), key: 'frequency' },
    { title: t('session.mode'), key: 'mode' },
    { title: t('session.startedAt'), key: 'startedAt' },
    { title: t('session.endedAt'), key: 'endedAt' },
    { title: t('session.duration'), key: 'duration' },
    { title: t('session.attendeeCount'), key: 'attendeeCount' },
    { title: t('session.operator'), key: 'operator' },
  ]

  if (showManageColumn.value) {
    baseHeaders.push({
      title: t('common.actions'),
      key: 'actions',
      sortable: false,
    })
  }

  return baseHeaders
})

const showManageColumn = computed(() => {
  return isAdmin.value || props.sessions.some((session) => isSessionOperator(session))
})

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

const cellRefs = ref({})
</script>

<style lang="scss">
.custom-data-table {
  display: flex;
  flex-direction: column;

  .tables-wrapper {
    width: 100%;
    overflow-x: auto;
  }

  .v-data-table {
    width: 100%;
    min-width: max-content;

    :deep(.v-data-table-header) {
      th {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    td {
      max-width: 200px;
      min-width: 120px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
