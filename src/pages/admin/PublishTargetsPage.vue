<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Pencil, Plus } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type { PublishTargetItem } from '@/types/publishing'

const { t, locale } = useI18n()

const targets = ref<PublishTargetItem[]>([])
const isLoading = ref(true)

const showForm = ref(false)
/** `null` while adding a new target. */
const editing = ref<PublishTargetItem | null>(null)
const name = ref('')
const intakeUrl = ref('')
const sourceId = ref('')
/** Write-only: never prefilled. Blank while editing keeps the stored secret. */
const sharedSecret = ref('')
const active = ref(true)
const isSaving = ref(false)

const formTitle = computed(() =>
  editing.value ? t('publishing.targets.edit') : t('publishing.targets.add'),
)

function showError(e: unknown) {
  toast.error(translateError((e as ApiError).message))
}

async function fetchTargets() {
  isLoading.value = true
  try {
    targets.value = await api.get<PublishTargetItem[]>('/publishing/targets')
  } catch (e) {
    showError(e)
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  editing.value = null
  name.value = ''
  intakeUrl.value = ''
  sourceId.value = ''
  sharedSecret.value = ''
  active.value = true
  showForm.value = true
}

function openEdit(target: PublishTargetItem) {
  editing.value = target
  name.value = target.name
  intakeUrl.value = target.intakeUrl
  sourceId.value = target.sourceId
  sharedSecret.value = ''
  active.value = target.active
  showForm.value = true
}

async function save() {
  isSaving.value = true
  try {
    const body: Record<string, unknown> = {
      name: name.value.trim(),
      intakeUrl: intakeUrl.value.trim(),
      sourceId: sourceId.value.trim(),
    }
    if (sharedSecret.value) body.sharedSecret = sharedSecret.value
    if (editing.value) {
      body.active = active.value
      await api.patch<PublishTargetItem>(`/publishing/targets/${editing.value.id}`, body)
      toast.success(t('publishing.targets.updated'))
    } else {
      await api.post<PublishTargetItem>('/publishing/targets', body)
      toast.success(t('publishing.targets.created'))
    }
    showForm.value = false
    sharedSecret.value = ''
    await fetchTargets()
  } catch (e) {
    showError(e)
  } finally {
    isSaving.value = false
  }
}

onMounted(fetchTargets)
</script>

<template>
  <AppLayout :title="t('publishing.targets.title')">
    <p class="text-muted-foreground mb-4">{{ t('publishing.targets.description') }}</p>

    <div class="flex flex-wrap gap-2 mb-6">
      <Button @click="openCreate">
        <Plus class="h-4 w-4 mr-2" />
        {{ t('publishing.targets.add') }}
      </Button>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="h-28 rounded-lg border border-border bg-muted/30 animate-pulse" />
    </div>

    <div v-else-if="targets.length === 0" class="py-8 text-center text-muted-foreground">
      {{ t('publishing.targets.empty') }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-16 lg:pb-0">
      <div
        v-for="target in targets"
        :key="target.id"
        class="rounded-lg border border-border p-4 space-y-3"
        :class="target.active ? '' : 'opacity-60'"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-medium break-words min-w-0">{{ target.name }}</p>
          <div class="flex flex-wrap justify-end gap-1 shrink-0">
            <span
              v-if="target.authFailing"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive"
            >
              {{ t('publishing.targets.authFailing') }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="target.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ target.active ? t('publishing.targets.active') : t('publishing.targets.inactive') }}
            </span>
          </div>
        </div>

        <p v-if="target.authFailing" class="text-sm text-destructive">
          {{ t('publishing.targets.authFailingHint') }}
        </p>

        <div class="text-sm space-y-1">
          <p class="text-muted-foreground">{{ t('publishing.targets.intakeUrl') }}</p>
          <p class="font-mono break-all">{{ target.intakeUrl }}</p>
        </div>

        <div class="text-sm space-y-1">
          <p class="text-muted-foreground">{{ t('publishing.targets.sourceId') }}</p>
          <p class="font-mono break-all">{{ target.sourceId }}</p>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ t('publishing.targets.updatedAt') }}: {{ formatDateTime(target.updatedAt, locale) }}
        </p>

        <Button variant="outline" size="sm" @click="openEdit(target)">
          <Pencil class="h-4 w-4 mr-2" />
          {{ t('publishing.targets.edit') }}
        </Button>
      </div>
    </div>

    <Sheet v-model:open="showForm">
      <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>{{ formTitle }}</SheetTitle>
          <SheetDescription>{{ t('publishing.targets.description') }}</SheetDescription>
        </SheetHeader>
        <form class="space-y-4 py-6" autocomplete="off" @submit.prevent="save">
          <div class="space-y-2">
            <Label for="publish-target-name">{{ t('publishing.targets.name') }}</Label>
            <Input id="publish-target-name" v-model="name" required />
          </div>
          <div class="space-y-2">
            <Label for="publish-target-url">{{ t('publishing.targets.intakeUrl') }}</Label>
            <Input
              id="publish-target-url"
              v-model="intakeUrl"
              type="url"
              class="font-mono text-sm"
              placeholder="https://example.edu/api/intake/observations"
              required
            />
            <p class="text-xs text-muted-foreground">{{ t('publishing.targets.intakeUrlHint') }}</p>
          </div>
          <div class="space-y-2">
            <Label for="publish-target-source">{{ t('publishing.targets.sourceId') }}</Label>
            <Input id="publish-target-source" v-model="sourceId" class="font-mono text-sm" required />
            <p class="text-xs text-muted-foreground">{{ t('publishing.targets.sourceIdHint') }}</p>
          </div>
          <div class="space-y-2">
            <Label for="publish-target-secret">{{ t('publishing.targets.sharedSecret') }}</Label>
            <Input
              id="publish-target-secret"
              v-model="sharedSecret"
              type="password"
              autocomplete="new-password"
              class="font-mono text-sm"
              :required="!editing"
            />
            <p class="text-xs text-muted-foreground">
              {{ editing ? t('publishing.targets.sharedSecretKeepHint') : t('publishing.targets.sharedSecretHint') }}
            </p>
          </div>
          <div v-if="editing" class="flex items-center gap-2">
            <Checkbox id="publish-target-active" v-model="active" />
            <Label for="publish-target-active">{{ t('publishing.targets.active') }}</Label>
          </div>
          <Button type="submit" class="w-full" :disabled="isSaving">
            {{ isSaving ? t('common.loading') : t('common.save') }}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  </AppLayout>
</template>
