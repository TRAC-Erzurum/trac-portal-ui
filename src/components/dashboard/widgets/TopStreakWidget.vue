<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'
import { buildStatsQuery, defaultStatsScope, type StatsScope } from '@/composables/useStatsScope'

interface Entry {
  rank: number
  callSign: string
  operatorId: string | null
  value: number
}

const props = withDefaults(defineProps<{ scope?: StatsScope; branchId?: string | null }>(), {
  scope: defaultStatsScope,
  branchId: null,
})
const { t } = useI18n()
const router = useRouter()
const data = ref<Entry[]>([])
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  if (props.scope === 'branch' && !props.branchId) {
    data.value = []
    loading.value = false
    return
  }
  try {
    loading.value = true
    error.value = false
    const query = buildStatsQuery(props.scope, props.branchId)
    data.value = await api.get<Entry[]>(`/insights/stats/top-streak?${query}`)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const goToOperator = (id: string | null) => {
  if (id) router.push(`/operators/${id}`)
}

onMounted(fetchData)
watch([() => props.scope, () => props.branchId], fetchData)
</script>

<template>
  <StatCard
    v-if="branchId"
    :title="t('dashboard.stats.topStreak')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data.length">
      <div class="space-y-1">
        <button
          v-for="entry in data"
          :key="entry.operatorId ?? entry.callSign"
          type="button"
          class="w-full flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-muted/30 text-left text-sm"
          @click="goToOperator(entry.operatorId)"
        >
          <span class="w-5 font-bold text-muted-foreground">{{ entry.rank }}.</span>
          <span class="flex-1 font-medium truncate">{{ entry.callSign }}</span>
          <span class="text-muted-foreground">{{ entry.value }}</span>
        </button>
      </div>
    </template>
    <p v-else-if="!loading && !error" class="text-sm text-muted-foreground">
      {{ t('dashboard.noStats') }}
    </p>
  </StatCard>
</template>
