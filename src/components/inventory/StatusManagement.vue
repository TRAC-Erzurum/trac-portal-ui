<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Check, Edit, Loader2, Plus, Save, Tags, Trash2, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface EquipmentStatus {
  id: string
  name: string
  color: string | null
  sortOrder: number
  isDefault: boolean
  isActive: boolean
}

const { t } = useI18n()

const statuses = ref<EquipmentStatus[]>([])
const isLoading = ref(true)
const isSheetOpen = ref(false)
const isEditing = ref(false)
const editingStatus = ref<EquipmentStatus | null>(null)
const showDeleteDialog = ref(false)
const deletingStatus = ref<EquipmentStatus | null>(null)
const isDeleting = ref(false)
const isSaving = ref(false)

const formName = ref('')
const formColor = ref('#6b7280')
const formSortOrder = ref(0)
const formIsDefault = ref(false)

async function fetchStatuses() {
  isLoading.value = true
  try {
    statuses.value = await api.get<EquipmentStatus[]>('/equipment-statuses')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
    statuses.value = []
  } finally {
    isLoading.value = false
  }
}

function openCreateSheet() {
  isEditing.value = false
  editingStatus.value = null
  formName.value = ''
  formColor.value = '#6b7280'
  formSortOrder.value = 0
  formIsDefault.value = false
  isSheetOpen.value = true
}

function openEditSheet(status: EquipmentStatus) {
  isEditing.value = true
  editingStatus.value = status
  formName.value = status.name
  formColor.value = status.color || '#6b7280'
  formSortOrder.value = status.sortOrder
  formIsDefault.value = status.isDefault
  isSheetOpen.value = true
}

function openDeleteDialog(status: EquipmentStatus) {
  deletingStatus.value = status
  showDeleteDialog.value = true
}

async function handleSave() {
  if (!formName.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const payload = {
      name: formName.value.trim(),
      color: formColor.value,
      sortOrder: formSortOrder.value,
      isDefault: formIsDefault.value,
    }

    if (isEditing.value && editingStatus.value) {
      await api.patch(`/equipment-statuses/${editingStatus.value.id}`, payload)
      toast.success(t('inventory.statusUpdated'))
    } else {
      await api.post('/equipment-statuses', payload)
      toast.success(t('inventory.statusCreated'))
    }

    isSheetOpen.value = false
    await fetchStatuses()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!deletingStatus.value || isDeleting.value) return

  isDeleting.value = true
  try {
    await api.delete(`/equipment-statuses/${deletingStatus.value.id}`)
    toast.success(t('inventory.statusDeleted'))
    showDeleteDialog.value = false
    deletingStatus.value = null
    await fetchStatuses()
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isDeleting.value = false
  }
}

onMounted(fetchStatuses)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Tags class="h-4 w-4" />
        {{ t('inventory.statuses') }}
      </h3>
      <Button
        variant="outline"
        size="sm"
        @click="openCreateSheet"
        :aria-label="t('inventory.createStatus')"
      >
        <Plus class="h-4 w-4 mr-2" />
        {{ t('inventory.createStatus') }}
      </Button>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="statuses.length === 0" class="text-center py-8">
      <Tags class="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
      <p class="text-sm text-muted-foreground">{{ t('common.noData') }}</p>
    </div>

    <div v-else class="space-y-1">
      <div
        v-for="status in statuses"
        :key="status.id"
        class="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors group"
      >
        <div
          class="h-3.5 w-3.5 rounded-full flex-shrink-0 border border-border"
          :style="{ backgroundColor: status.color || '#6b7280' }"
        />

        <span class="font-medium text-sm flex-1 truncate">{{ status.name }}</span>

        <span
          v-if="status.isDefault"
          class="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
        >
          <Check class="h-3 w-3" />
          {{ t('inventory.defaultStatus') }}
        </span>

        <span class="text-xs text-muted-foreground">
          #{{ status.sortOrder }}
        </span>

        <div class="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            class="h-7 w-7 p-0"
            @click="openEditSheet(status)"
            :aria-label="t('inventory.editStatus')"
          >
            <Edit class="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 w-7 p-0 trac-btn-destructive-outlined"
            @click="openDeleteDialog(status)"
            :aria-label="t('inventory.deleteStatus')"
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>

    <Sheet :open="isSheetOpen" @update:open="isSheetOpen = $event">
      <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
        <SheetHeader>
          <SheetTitle>
            {{ isEditing ? t('inventory.editStatus') : t('inventory.createStatus') }}
          </SheetTitle>
          <SheetDescription>{{ t('inventory.statuses') }}</SheetDescription>
        </SheetHeader>

        <div class="space-y-4 py-4 px-1">
          <div class="space-y-2">
            <Label>{{ t('inventory.statusName') }} *</Label>
            <Input v-model="formName" autofocus />
          </div>

          <div class="space-y-2">
            <Label>{{ t('inventory.statusColor') }}</Label>
            <div class="flex items-center gap-3">
              <input
                type="color"
                v-model="formColor"
                class="h-9 w-12 rounded-md border border-border cursor-pointer bg-transparent"
              />
              <Input
                v-model="formColor"
                class="flex-1 font-mono text-sm"
                maxlength="7"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>{{ t('inventory.sortOrder') }}</Label>
            <Input v-model.number="formSortOrder" type="number" min="0" />
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="formIsDefault" class="h-4 w-4 rounded border-input" />
            <span class="text-sm">{{ t('inventory.defaultStatus') }}</span>
          </label>
        </div>

        <div class="trac-sheet-actions">
          <Button variant="outline" class="trac-sheet-btn" @click="isSheetOpen = false" :disabled="isSaving">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            class="trac-sheet-btn"
            @click="handleSave"
            :disabled="!formName.trim() || isSaving"
          >
            <Save class="h-4 w-4 mr-2" />
            {{ isSaving ? t('common.saving') : t('common.save') }}
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('inventory.deleteStatus') }}</DialogTitle>
          <DialogDescription>
            {{ deletingStatus?.name }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false" :disabled="isDeleting">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="outline"
            @click="handleDelete"
            :disabled="isDeleting"
            class="trac-btn-destructive-outlined"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            {{ isDeleting ? t('common.loading') : t('common.delete') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
