<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Radio, Users } from 'lucide-vue-next'
import StatCard from '../StatCard.vue'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'

interface LastNetInfo {
  id: string
  name: string
  date: string
  netId?: string
}

interface Data {
  lastAttended: LastNetInfo | null
  lastManaged: LastNetInfo | null
}

const { t } = useI18n()
const router = useRouter()
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref(false)

const fetchData = async () => {
  try {
    loading.value = true
    error.value = false
    data.value = await api.get<Data>('/dashboard/personal/last-nets')
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const goToNet = (id: string) => {
  router.push(`/nets/${id}`)
}

onMounted(fetchData)
</script>

<template>
  <StatCard
    :title="t('dashboard.stats.lastNetsTitle')"
    :loading="loading"
    :error="error"
  >
    <template v-if="data">
      <div class="space-y-3">
        <button
          v-if="data.lastAttended"
          type="button"
          class="w-full flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-muted/30 text-left"
          @click="goToNet(data.lastAttended!.netId ?? data.lastAttended!.id)"
        >
          <Users class="h-4 w-4 text-muted-foreground shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ data.lastAttended.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(data.lastAttended.date) }}</p>
          </div>
        </button>
        <button
          v-if="data.lastManaged"
          type="button"
          class="w-full flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-muted/30 text-left"
          @click="goToNet(data.lastManaged!.netId ?? data.lastManaged!.id)"
        >
          <Radio class="h-4 w-4 text-muted-foreground shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="font-medium truncate">{{ data.lastManaged.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(data.lastManaged.date) }}</p>
          </div>
        </button>
        <p v-if="!data.lastAttended && !data.lastManaged" class="text-sm text-muted-foreground">
          {{ t('dashboard.noStats') }}
        </p>
      </div>
    </template>
  </StatCard>
</template>
