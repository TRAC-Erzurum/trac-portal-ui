<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Copy, KeyRound, Plus, Power } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/formatters'
import type { OidcClientItem, OidcClientWithSecret } from '@/types/oidc'

const { t, locale } = useI18n()

const clients = ref<OidcClientItem[]>([])
const isLoading = ref(true)
const busyId = ref<string | null>(null)

const showCreate = ref(false)
const newName = ref('')
const newRedirectUris = ref('')
const isCreating = ref(false)

/** Shown once after create or rotate, then discarded. */
const revealed = ref<OidcClientWithSecret | null>(null)

const discoveryUrl = `${window.location.origin}/api/oidc/.well-known/openid-configuration`

function showError(e: unknown) {
  toast.error(translateError((e as ApiError).message))
}

async function fetchClients() {
  isLoading.value = true
  try {
    clients.value = await api.get<OidcClientItem[]>('/oidc/admin/clients')
  } catch (e) {
    showError(e)
  } finally {
    isLoading.value = false
  }
}

function openCreate() {
  newName.value = ''
  newRedirectUris.value = ''
  showCreate.value = true
}

async function createClient() {
  isCreating.value = true
  try {
    const redirectUris = newRedirectUris.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const result = await api.post<OidcClientWithSecret>('/oidc/admin/clients', {
      name: newName.value.trim(),
      redirectUris,
    })
    showCreate.value = false
    revealed.value = result
    toast.success(t('oidc.clients.created'))
    await fetchClients()
  } catch (e) {
    showError(e)
  } finally {
    isCreating.value = false
  }
}

async function rotateSecret(client: OidcClientItem) {
  if (!confirm(t('oidc.clients.rotateSecretConfirm', { name: client.name }))) return
  busyId.value = client.id
  try {
    revealed.value = await api.post<OidcClientWithSecret>(`/oidc/admin/clients/${client.id}/rotate-secret`)
    toast.success(t('oidc.clients.secretRotated'))
  } catch (e) {
    showError(e)
  } finally {
    busyId.value = null
  }
}

async function deactivate(client: OidcClientItem) {
  if (!confirm(t('oidc.clients.deactivateConfirm', { name: client.name }))) return
  busyId.value = client.id
  try {
    await api.post(`/oidc/admin/clients/${client.id}/deactivate`)
    toast.success(t('oidc.clients.deactivated'))
    await fetchClients()
  } catch (e) {
    showError(e)
  } finally {
    busyId.value = null
  }
}

async function rotateKey() {
  if (!confirm(t('oidc.clients.rotateKeyConfirm'))) return
  busyId.value = 'key'
  try {
    await api.post('/oidc/admin/keys/rotate')
    toast.success(t('oidc.clients.keyRotated'))
  } catch (e) {
    showError(e)
  } finally {
    busyId.value = null
  }
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(t('oidc.clients.copied'))
  } catch {
    // Clipboard blocked: the value stays selectable on screen.
  }
}

function closeReveal(open: boolean) {
  if (!open) revealed.value = null
}

onMounted(fetchClients)
</script>

<template>
  <AppLayout :title="t('oidc.clients.title')">
    <p class="text-muted-foreground mb-4">{{ t('oidc.clients.description') }}</p>

    <div class="rounded-lg border border-border p-3 mb-6 text-sm space-y-1">
      <p class="text-muted-foreground">{{ t('oidc.clients.discoveryUrl') }}</p>
      <p class="font-mono break-all select-all">{{ discoveryUrl }}</p>
    </div>

    <div class="flex flex-wrap gap-2 mb-6">
      <Button @click="openCreate">
        <Plus class="h-4 w-4 mr-2" />
        {{ t('oidc.clients.add') }}
      </Button>
      <Button variant="outline" :disabled="busyId === 'key'" @click="rotateKey">
        <KeyRound class="h-4 w-4 mr-2" />
        {{ t('oidc.clients.rotateKey') }}
      </Button>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-lg border border-border bg-muted/30 animate-pulse" />
    </div>

    <div v-else-if="clients.length === 0" class="py-8 text-center text-muted-foreground">
      {{ t('oidc.clients.empty') }}
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-16 lg:pb-0">
      <div
        v-for="client in clients"
        :key="client.id"
        class="rounded-lg border border-border p-4 space-y-3"
        :class="client.active ? '' : 'opacity-60'"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="font-medium break-words min-w-0">{{ client.name }}</p>
          <span
            class="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="client.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
          >
            {{ client.active ? t('oidc.clients.active') : t('oidc.clients.inactive') }}
          </span>
        </div>

        <div class="text-sm space-y-1">
          <p class="text-muted-foreground">{{ t('oidc.clients.clientId') }}</p>
          <p class="font-mono break-all select-all">{{ client.clientId }}</p>
        </div>

        <div class="text-sm space-y-1">
          <p class="text-muted-foreground">{{ t('oidc.clients.redirectUris') }}</p>
          <p v-for="uri in client.redirectUris" :key="uri" class="font-mono break-all">{{ uri }}</p>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ t('oidc.clients.createdAt') }}: {{ formatDateTime(client.createdAt, locale) }}
        </p>

        <div v-if="client.active" class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" :disabled="busyId === client.id" @click="rotateSecret(client)">
            <KeyRound class="h-4 w-4 mr-2" />
            {{ t('oidc.clients.rotateSecret') }}
          </Button>
          <Button variant="destructive" size="sm" :disabled="busyId === client.id" @click="deactivate(client)">
            <Power class="h-4 w-4 mr-2" />
            {{ t('oidc.clients.deactivate') }}
          </Button>
        </div>
      </div>
    </div>

    <Sheet v-model:open="showCreate">
      <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>{{ t('oidc.clients.add') }}</SheetTitle>
          <SheetDescription>{{ t('oidc.clients.description') }}</SheetDescription>
        </SheetHeader>
        <form class="space-y-4 py-6" @submit.prevent="createClient">
          <div class="space-y-2">
            <Label for="oidc-client-name">{{ t('oidc.clients.name') }}</Label>
            <Input id="oidc-client-name" v-model="newName" :placeholder="t('oidc.clients.namePlaceholder')" required />
          </div>
          <div class="space-y-2">
            <Label for="oidc-client-redirects">{{ t('oidc.clients.redirectUris') }}</Label>
            <Textarea
              id="oidc-client-redirects"
              v-model="newRedirectUris"
              rows="4"
              class="font-mono text-sm"
              placeholder="https://example.org/auth/callback"
              required
            />
            <p class="text-xs text-muted-foreground">{{ t('oidc.clients.redirectUrisHint') }}</p>
          </div>
          <Button type="submit" class="w-full" :disabled="isCreating">
            {{ isCreating ? t('oidc.clients.creating') : t('oidc.clients.create') }}
          </Button>
        </form>
      </SheetContent>
    </Sheet>

    <Dialog :open="!!revealed" @update:open="closeReveal">
      <DialogContent v-if="revealed" class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{{ t('oidc.clients.secretTitle') }}</DialogTitle>
          <DialogDescription>{{ t('oidc.clients.secretWarning') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 text-sm">
          <div class="space-y-1">
            <p class="text-muted-foreground">{{ t('oidc.clients.clientId') }}</p>
            <div class="flex items-start gap-2">
              <p class="font-mono break-all select-all flex-1 min-w-0">{{ revealed.client.clientId }}</p>
              <Button variant="outline" size="sm" :aria-label="t('oidc.clients.copy')" @click="copy(revealed.client.clientId)">
                <Copy class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-muted-foreground">{{ t('oidc.clients.clientSecret') }}</p>
            <div class="flex items-start gap-2">
              <p class="font-mono break-all select-all flex-1 min-w-0">{{ revealed.clientSecret }}</p>
              <Button variant="outline" size="sm" :aria-label="t('oidc.clients.copy')" @click="copy(revealed.clientSecret)">
                <Copy class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button @click="revealed = null">{{ t('oidc.clients.done') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>
