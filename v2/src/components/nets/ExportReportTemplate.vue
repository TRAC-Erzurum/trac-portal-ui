<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/lib/formatters'

interface Attendee {
  id: string
  callSign: string
  name?: string
  city?: string
  district?: string
  readability?: number
  signalStrength?: number
  createdAt: string
}

interface Props {
  netName: string
  operatorCallSign: string
  attendees: Attendee[]
  dateInfo: string
}

defineProps<Props>()

const { t } = useI18n()

const templateRef = ref<HTMLElement | null>(null)

defineExpose({
  templateRef
})

const formatQth = (attendee: Attendee) => {
  return [attendee.district, attendee.city].filter(Boolean).join(', ') || '-'
}

const formatReadabilitySignal = (attendee: Attendee) => {
  const r = attendee.readability
  const s = attendee.signalStrength
  if (r == null && s == null) return ''
  return `${r ?? '-'}/${s ?? '-'}`
}
</script>

<template>
  <div ref="templateRef" class="report-container fixed -left-[9999px] top-0">
    <div class="net-title">{{ netName }}</div>
    <div v-if="attendees.length === 0" class="no-attendees-warning">
      <strong>{{ t('netReport.noAttendees') }}</strong>
    </div>
    <table v-else class="attendees-table">
      <thead>
        <tr class="attendees-thead-tr">
          <th class="attendees-th">#</th>
          <th class="attendees-th">{{ t('operators.callSign') }}</th>
          <th class="attendees-th">{{ t('operators.name') }}</th>
          <th class="attendees-th">{{ t('operators.qth') }}</th>
          <th class="attendees-th">{{ t('operators.signal') }}</th>
          <th class="attendees-th">{{ t('netReport.joinTime') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(attendee, index) in attendees" :key="attendee.id" class="attendees-tbody-tr">
          <td class="attendees-td">{{ index + 1 }}</td>
          <td class="attendees-td attendees-td-bold">{{ attendee.callSign }}</td>
          <td class="attendees-td">{{ attendee.name || '-' }}</td>
          <td class="attendees-td">{{ formatQth(attendee) }}</td>
          <td class="attendees-td attendees-td-center">{{ formatReadabilitySignal(attendee) }}</td>
          <td class="attendees-td">{{ formatDateTime(attendee.createdAt) }}</td>
        </tr>
      </tbody>
      <tfoot class="attendees-tfoot">
        <tr>
          <td class="attendees-td attendees-tfoot-label">{{ t('netReport.totalAttendees') }}:</td>
          <td class="attendees-td attendees-tfoot-value" colspan="5">{{ attendees.length }}</td>
        </tr>
        <tr>
          <td class="attendees-td attendees-tfoot-label">{{ t('netReport.operator') }}:</td>
          <td class="attendees-td attendees-tfoot-value" colspan="5">{{ operatorCallSign }}</td>
        </tr>
        <tr>
          <td class="attendees-td attendees-tfoot-label">{{ t('netReport.date') }}:</td>
          <td class="attendees-td attendees-tfoot-value" colspan="5">{{ dateInfo }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
