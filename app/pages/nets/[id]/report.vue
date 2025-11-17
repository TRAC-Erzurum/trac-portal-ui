<template>
  <div class="report-container" ref="reportContainer">
    <div class="net-title">
      {{ net?.name }}
    </div>

    <div class="tables-container" ref="tablesContainer">
      <div v-if="loading" class="skeleton-loader">
        <div v-for="n in 10" :key="n" class="skeleton-row">
          <div class="skeleton-cell" v-for="m in 5" :key="m"></div>
        </div>
      </div>
      <template v-else>
        <template v-if="attendees.length === 0">
          <div class="no-attendees-warning">
            <strong style="color: red">Uyarı: Bu çevrimde hiç katılımcı yok!</strong>
          </div>
        </template>
        <template v-else>
          <table class="attendees-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Çağrı İşareti</th>
                <th>Ad Soyad</th>
                <th>QTH</th>
                <th>Katılım Zamanı</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(attendee, index) in attendees" :key="attendee.id">
                <td>{{ index + 1 }}</td>
                <td>{{ attendee.callSign }}</td>
                <td>{{ attendee.name || '-' }}</td>
                <td>{{ formatQth(attendee) }}</td>
                <td>{{ formatDate(attendee.createdAt) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right">
                  <strong>Toplam Katılımcı Sayısı:</strong>
                </td>
                <td>
                  {{ attendees.length }}
                </td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right">
                  <strong>Çevrim Operatörü:</strong>
                </td>
                <td>{{ net?.operator?.callSign }}&nbsp;{{ net?.operator?.fullName }}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right">
                  <strong>Tarih:</strong>
                </td>
                <td>
                  {{ getNetDateDetails(net) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </template>
      </template>
    </div>

    <div class="export-button">
      <v-btn
        color="primary"
        :loading="loading"
        variant="flat"
        @click="exportToPdf"
        icon="mdi-printer"
        class="print-hide"
        data-html2canvas-ignore="true"
      >
      </v-btn>
      <v-btn
        color="primary"
        :loading="loading"
        variant="flat"
        @click="exportToImage"
        icon="mdi-image"
        class="print-hide ml-2"
        data-html2canvas-ignore="true"
      >
      </v-btn>
      <v-btn
        color="primary"
        :loading="loading"
        variant="flat"
        @click="exportToCsv"
        icon="mdi-file-delimited"
        class="print-hide ml-2"
        data-html2canvas-ignore="true"
      >
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/utils/api'
import { useFormatDate } from '~/composables/useFormatDate'
import html2canvas from 'html2canvas'

const { t } = useI18n()
const { errorToast } = useToast()

const route = useRoute()
const api = useApi()
const { formatDate, formatTime } = useFormatDate()
const tablesContainer = ref<HTMLElement | null>(null)
const reportContainer = ref<HTMLElement | null>(null)
const net = ref<any>(null)
const attendees = ref<any[]>([])
const loading = ref(true)

const fetchAttendees = async () => {
  try {
    console.debug('[Report] Fetching attendees for net:', route.params.id)
    const data = await api.get(`/net/${route.params.id}/attendee?sort=ASC`)
    console.debug('[Report] Attendees data:', data)

    attendees.value = data || []
  } catch (error) {
    console.error('[Report] Error fetching attendees:', error)
  }
}

const formatQth = (attendee: any) => {
  return [attendee.district, attendee.city, attendee.country].filter(Boolean).join(', ') || '-'
}

const getNetDateDetails = (net: any) => {
  if (!net || (!net.startedAt && !net.endedAt)) {
    return ''
  }

  if (!net.endedAt) {
    return formatDate(net.startedAt)
  }

  if (net.startedAt.split('T')[0] === net.endedAt.split('T')[0]) {
    return `${formatDate(net.startedAt)} - ${formatTime(net.endedAt)}`
  }

  return `${formatDate(net.startedAt)} - ${formatDate(net.endedAt)}`
}

onMounted(async () => {
  if (!route.params.id) {
    console.error('[Report] No netId found in route params')
    errorToast(t('net.noId'))
    return
  }

  try {
    console.debug('[Report] Fetching net details:', route.params.id)
    const response = await api.get(`/net/${route.params.id}`)
    console.debug('[Report] Net data:', response)
    net.value = response
    await fetchAttendees()
  } catch (error) {
    console.error('[Report] Error fetching net:', error)
  } finally {
    loading.value = false
  }
})

const exportToPdf = () => {
  window.print()
}

const exportToImage = async () => {
  const element = reportContainer.value
  if (!element) return

  const canvas = await html2canvas(element)
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `${net.value.name}.png`
  link.click()
}

const exportToCsv = async () => {
  try {
    const csvContent = attendees.value.map((attendee) => {
      const fields = [
        attendee.callSign || '',
        (attendee.name || '').replace(/"/g, '""'),
        (attendee.country || '').replace(/"/g, '""'),
        (attendee.city || '').replace(/"/g, '""'),
        (attendee.district || '').replace(/"/g, '""'),
        attendee.readability?.toString() || '',
        attendee.signalStrength?.toString() || '',
      ]

      return fields
        .map((field) => {
          const strField = String(field)
          if (
            strField &&
            (strField.includes(',') || strField.includes('"') || strField.includes('\n'))
          ) {
            return `"${strField}"`
          }
          return strField
        })
        .join(',')
    })

    csvContent.unshift(
      [
        t('operator.callSign'),
        t('fullName'),
        t('qth.country'),
        t('qth.city'),
        t('qth.district'),
        t('operator.readability'),
        t('operator.signalStrength'),
      ].join(',')
    )

    const date = new Date()
      .toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(/[/.]/g, '-')
      .replace(':', '-')

    const fileName = `${net.value.name.replace(/[/\\?%*:|"<>]/g, '-')}_${date}.csv`

    const blob = new Blob(['\ufeff' + csvContent.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting attendees:', error)
    errorToast(t('net.exportError'))
  }
}

definePageMeta({
  layout: 'print',
  requiresAuth: true,
  key: (route) => route.fullPath,
})
</script>

<style scoped>
.report-container {
  background: white;
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.net-title {
  text-align: center;
  font-weight: bold;
  font-size: 1.5em;
  margin-bottom: 2rem;
}

.tables-container {
  --table-padding: 0.5rem;
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  width: 100%;
}

.skeleton-loader {
  width: 100%;
  padding: 1rem;
}

.skeleton-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.skeleton-cell {
  height: 20px;
  background: #f0f0f0;
  border-radius: 4px;
  flex: 1;
}

.skeleton-cell:nth-child(1) {
  width: 40px;
  flex: none;
}
.skeleton-cell:nth-child(2) {
  width: 120px;
  flex: none;
}
.skeleton-cell:nth-child(3) {
  flex: 2;
}
.skeleton-cell:nth-child(4) {
  flex: 1;
}
.skeleton-cell:nth-child(5) {
  width: 150px;
  flex: none;
}

.attendees-table {
  border-collapse: collapse;
  width: 100%;
}

.attendees-table th,
.attendees-table td {
  border: 1px solid #ddd;
  padding: var(--table-padding);
  text-align: left;
  word-wrap: break-word;
  word-break: break-word;
}

.attendees-table tr {
  height: auto;
}

.no-attendees-warning {
  text-align: center;
  margin: 20px 0;
  font-size: 1.2em;
}

.net-info {
  text-align: right;
  margin-top: auto;
}

.export-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 100;
}

@media print {
  .print-hide {
    display: none;
  }

  .report-container {
    padding: 0;
  }

  @page {
    size: A4;
    margin: 1cm;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  ::-webkit-scrollbar {
    display: none;
  }
}
</style>
