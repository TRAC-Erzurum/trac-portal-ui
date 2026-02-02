<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

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

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div ref="templateRef" class="fixed -left-[9999px] top-0 bg-white p-8 w-[800px]" style="font-family: system-ui, sans-serif;">
    <h1 class="text-xl font-bold text-center text-black mb-6">{{ netName }}</h1>
    
    <table v-if="attendees.length > 0" class="w-full border-collapse text-sm text-black">
      <thead>
        <tr class="bg-zinc-100">
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">#</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.callSign') }}</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.name') }}</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.qth') }}</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.readability') }}</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('operators.signal') }}</th>
          <th class="border border-zinc-300 px-3 py-2 text-left font-medium">{{ t('netReport.joinTime') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(attendee, index) in attendees" :key="attendee.id">
          <td class="border border-zinc-300 px-3 py-2">{{ index + 1 }}</td>
          <td class="border border-zinc-300 px-3 py-2 font-medium">{{ attendee.callSign }}</td>
          <td class="border border-zinc-300 px-3 py-2">{{ attendee.name || '-' }}</td>
          <td class="border border-zinc-300 px-3 py-2">{{ formatQth(attendee) }}</td>
          <td class="border border-zinc-300 px-3 py-2 text-center">{{ attendee.readability || '-' }}</td>
          <td class="border border-zinc-300 px-3 py-2 text-center">{{ attendee.signalStrength || '-' }}</td>
          <td class="border border-zinc-300 px-3 py-2">{{ formatDate(attendee.createdAt) }}</td>
        </tr>
      </tbody>
      <tfoot class="bg-zinc-50">
        <tr>
          <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
            {{ t('netReport.totalAttendees') }}:
          </td>
          <td class="border border-zinc-300 px-3 py-2 font-bold">{{ attendees.length }}</td>
        </tr>
        <tr>
          <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
            {{ t('netReport.operator') }}:
          </td>
          <td class="border border-zinc-300 px-3 py-2">{{ operatorCallSign }}</td>
        </tr>
        <tr>
          <td colspan="6" class="border border-zinc-300 px-3 py-2 text-right font-medium">
            {{ t('netReport.date') }}:
          </td>
          <td class="border border-zinc-300 px-3 py-2">{{ dateInfo }}</td>
        </tr>
      </tfoot>
    </table>
    
    <div v-else class="text-center py-8 text-red-600 font-medium">
      {{ t('netReport.noAttendees') }}
    </div>
  </div>
</template>
