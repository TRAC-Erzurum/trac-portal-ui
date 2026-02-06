<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Users, Radio } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'

interface Data {
  thisMonthParticipated: number
  lastMonthParticipated: number
  thisMonthManaged: number
  lastMonthManaged: number
}

const props = defineProps<{ branchId?: string | null }>()
const { t } = useI18n()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const url = props.branchId
      ? `/v2/dashboard/personal/trend?branchId=${props.branchId}`
      : '/v2/dashboard/personal/trend'
    data.value = await api.get<Data>(url)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const participatedDiff = () =>
  data.value
    ? data.value.thisMonthParticipated - data.value.lastMonthParticipated
    : 0
const managedDiff = () =>
  data.value ? data.value.thisMonthManaged - data.value.lastMonthManaged : 0

onMounted(fetchData)
watch(() => props.branchId, fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.personalTrend')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data">
      <div class="grid grid-cols-2 gap-3">
        <div class="p-3 rounded-lg border border-border/50">
          <div class="flex items-center gap-1 text-muted-foreground text-xs mb-1">
            <Users class="h-3 w-3" />
            {{ t('dashboard.stats.participated') }}
          </div>
          <p class="text-lg font-bold">{{ data.thisMonthParticipated }} {{ t('dashboard.stats.thisMonth') }}</p>
          <p class="text-xs text-muted-foreground">
            {{ data.lastMonthParticipated }} {{ t('dashboard.stats.lastMonth') }}
            <span v-if="participatedDiff() !== 0" :class="participatedDiff() > 0 ? 'text-green-600' : 'text-red-600'">
              ({{ participatedDiff() > 0 ? '+' : '' }}{{ participatedDiff() }})
            </span>
          </p>
        </div>
        <div class="p-3 rounded-lg border border-border/50">
          <div class="flex items-center gap-1 text-muted-foreground text-xs mb-1">
            <Radio class="h-3 w-3" />
            {{ t('dashboard.managed') }}
          </div>
          <p class="text-lg font-bold">{{ data.thisMonthManaged }} {{ t('dashboard.stats.thisMonth') }}</p>
          <p class="text-xs text-muted-foreground">
            {{ data.lastMonthManaged }} {{ t('dashboard.stats.lastMonth') }}
            <span v-if="managedDiff() !== 0" :class="managedDiff() > 0 ? 'text-green-600' : 'text-red-600'">
              ({{ managedDiff() > 0 ? '+' : '' }}{{ managedDiff() }})
            </span>
          </p>
        </div>
      </div>
    </template>
  </StatCard>
</template>
