<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDateFormat } from '@/composables'
import { formatCommunicationChannelLabel } from '@/lib/formatters'

interface Attendee {
  id: string
  callSign: string
  name?: string | null
  city?: string | null
  district?: string | null
  readability?: number | null
  signalStrength?: number | null
  createdAt: string
}

interface NetCommunicationChannel {
  id: string
  isSimplexAdHoc?: boolean
  simplexFrequency?: string
  communicationChannel?: {
    id: string
    type: string
    txFrequency?: number | null
    rxFrequency?: number | null
    echolinkNode?: string | null
    echolinkName?: string | null
  }
}

interface Props {
  netName: string
  operatorCallSign: string
  operatorName?: string | null
  attendees: Attendee[]
  dateInfo: string
  branchName?: string
  branchCallSign?: string
  branchIsHeadquarters?: boolean
  communicationChannels?: NetCommunicationChannel[]
}

const {
  netName,
  operatorCallSign,
  operatorName,
  attendees,
  dateInfo,
  branchName,
  branchCallSign,
  branchIsHeadquarters,
  communicationChannels,
} = defineProps<Props>()

const { t } = useI18n()
const { formatDateTime } = useDateFormat()

const templateRef = ref<HTMLElement | null>(null)

defineExpose({
  templateRef
})

const formatQth = (attendee: Attendee) => {
  return [attendee.district, attendee.city].filter(Boolean).join(', ') || '-'
}

const formatBranchTitle = () => {
  if (!branchName) return ''
  const prefix = !branchIsHeadquarters && branchCallSign ? `${branchCallSign} · ` : ''
  return `${prefix}${branchName}`
}

const formatOperatorInfo = () => {
  if (operatorName) return `${operatorCallSign} · ${operatorName}`
  return operatorCallSign
}

const formatCommunicationChannels = () => {
  if (!communicationChannels || communicationChannels.length === 0) return ''
  return communicationChannels.map((channel) => formatCommunicationChannelLabel(channel)).join(', ')
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
    <div class="report-header">
      <div class="report-top">
        <img src="/logo-s.svg" alt="TRAC logo" class="report-logo" />
        <h1 class="branch-title">{{ formatBranchTitle() || netName }}</h1>
      </div>
      <h2 class="net-title">{{ netName }}</h2>
      <div class="header-meta">
        <div class="header-meta-item header-meta-left">{{ formatOperatorInfo() }}</div>
        <div class="header-meta-item header-meta-center">
          {{ formatCommunicationChannels() || '-' }}
        </div>
        <div class="header-meta-item header-meta-right">{{ dateInfo }}</div>
      </div>
    </div>
    <div v-if="attendees.length === 0" class="no-attendees-warning">
      <strong>{{ t('netReport.noAttendees') }}</strong>
    </div>
    <table v-else class="attendees-table">
      <colgroup>
        <col class="attendees-col-index" />
        <col class="attendees-col-call-sign" />
        <col class="attendees-col-operator" />
        <col class="attendees-col-qth" />
        <col class="attendees-col-signal" />
        <col class="attendees-col-join-time" />
      </colgroup>
      <thead>
        <tr class="attendees-thead-tr">
          <th class="attendees-th">#</th>
          <th class="attendees-th">{{ t('operators.callSign') }}</th>
          <th class="attendees-th">{{ t('operators.title') }}</th>
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
          <td class="attendees-td">{{ formatReadabilitySignal(attendee) }}</td>
          <td class="attendees-td">{{ formatDateTime(attendee.createdAt) }}</td>
        </tr>
      </tbody>
      <tfoot class="attendees-tfoot">
        <tr>
          <td class="attendees-td attendees-tfoot-label" colspan="5">{{ t('netReport.totalAttendees') }}:</td>
          <td class="attendees-td attendees-tfoot-value">{{ attendees.length }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
