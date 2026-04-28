<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Radio, Users } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import { buildStatsQuery, defaultStatsScope, type StatsScope } from '@/composables/useStatsScope'

interface LastNetInfo {
  id: string
  name: string
  date: string
  netId?: string
}

interface Data {
  lastAttendedNets: LastNetInfo[]
  lastManagedNets: LastNetInfo[]
}

const props = withDefaults(defineProps<{ scope?: StatsScope; branchId?: string | null }>(), {
  scope: defaultStatsScope,
  branchId: null,
})

const { t } = useI18n()
const router = useRouter()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)
const listScope = ref<'attended' | 'managed'>('attended')

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    const query = buildStatsQuery(props.scope, props.branchId)
    const url = query ? `/insights/personal/last-nets?${query}` : '/insights/personal/last-nets'
    data.value = await api.get<Data>(url)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const goToNet = (id: string) => {
  router.push(`/nets/${id}`)
}

const activeList = computed(() =>
  listScope.value === 'attended'
    ? (data.value?.lastAttendedNets ?? [])
    : (data.value?.lastManagedNets ?? [])
)

onMounted(fetchData)
watch([() => props.scope, () => props.branchId], fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.lastNetsTitle')"
    :loading="loading"
    :error="error"
  >
    <template #actions>
      <div
        class="flex items-center gap-1 shrink-0"
        role="group"
        :aria-label="t('dashboard.statsScopeGroup')"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="listScope === 'attended' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="listScope === 'attended'"
          @click="listScope = 'attended'"
        >
          {{ t('dashboard.lastNetsAttended') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-8 px-2 text-xs"
          :class="listScope === 'managed' ? 'border-primary text-primary bg-primary/10' : ''"
          :aria-pressed="listScope === 'managed'"
          @click="listScope = 'managed'"
        >
          {{ t('dashboard.lastNetsManaged') }}
        </Button>
      </div>
    </template>
    <template v-if="data">
      <div
        v-if="activeList.length"
        class="max-h-[18rem] overflow-y-auto space-y-1 pr-1 -mr-1"
      >
        <button
          v-for="net in activeList"
          :key="net.id"
          type="button"
          class="w-full flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background hover:bg-muted/30 text-left"
          @click="goToNet(net.netId ?? net.id)"
        >
          <Users v-if="listScope === 'attended'" class="h-4 w-4 text-muted-foreground shrink-0" />
          <Radio v-else class="h-4 w-4 text-muted-foreground shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="font-medium text-sm truncate">{{ net.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(net.date) }}</p>
          </div>
        </button>
      </div>
      <p v-else class="text-sm text-muted-foreground py-1">
        {{ t('dashboard.noStats') }}
      </p>
    </template>
  </StatCard>
</template>
