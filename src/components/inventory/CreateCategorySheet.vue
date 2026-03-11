<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImagePlus, Save, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { translateError } from '@/i18n'
import { api, type ApiError } from '@/lib/api'

interface Category {
  id: string
  name: string
  parentId: string | null
  children: Category[]
  [key: string]: unknown
}

const props = defineProps<{
  open: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
}>()

const { t } = useI18n()

const name = ref('')
const parentId = ref<string>('none')
const photoFile = ref<File | null>(null)
const photoPreview = ref<string | null>(null)
const isSaving = ref(false)

const flatCategories = computed(() => {
  const result: { id: string; name: string; depth: number }[] = []
  function flatten(items: Category[], depth: number) {
    for (const item of items) {
      result.push({ id: item.id, name: item.name, depth })
      if (item.children?.length) {
        flatten(item.children, depth + 1)
      }
    }
  }
  flatten(props.categories, 0)
  return result
})

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    toast.error(t('error.invalidFileType'))
    return
  }

  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}

function removePhoto() {
  photoFile.value = null
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = null
  }
}

async function handleSave() {
  if (!name.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const payload: Record<string, unknown> = { name: name.value.trim() }
    if (parentId.value && parentId.value !== 'none') {
      payload.parentId = parentId.value
    }

    const created = await api.post<{ id: string }>('/equipment-categories', payload)

    if (photoFile.value && created.id) {
      const formData = new FormData()
      formData.append('file', photoFile.value)
      await api.post(`/equipment-categories/${created.id}/upload`, formData)
    }

    toast.success(t('inventory.categoryCreated'))
    resetForm()
    emit('created')
  } catch (e) {
    const err = e as ApiError
    toast.error(translateError(err.message))
  } finally {
    isSaving.value = false
  }
}

function resetForm() {
  name.value = ''
  parentId.value = 'none'
  removePhoto()
}

function handleClose(value: boolean) {
  if (!value) resetForm()
  emit('update:open', value)
}

watch(() => props.open, (val) => {
  if (val) resetForm()
})
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent class="sm:max-w-md overflow-y-auto px-4 sm:px-6">
      <SheetHeader>
        <SheetTitle>{{ t('inventory.createCategory') }}</SheetTitle>
        <SheetDescription>{{ t('inventory.categories') }}</SheetDescription>
      </SheetHeader>

      <div class="space-y-4 py-4 px-1">
        <div class="space-y-2">
          <Label>{{ t('inventory.categoryName') }} *</Label>
          <Input
            v-model="name"
            :placeholder="t('inventory.categoryName')"
            autofocus
          />
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.parentCategory') }}</Label>
          <Select v-model="parentId">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('inventory.noParentCategory')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{{ t('inventory.noParentCategory') }}</SelectItem>
              <SelectItem
                v-for="cat in flatCategories"
                :key="cat.id"
                :value="cat.id"
              >
                <span :style="{ paddingLeft: `${cat.depth * 12}px` }">
                  {{ cat.name }}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>{{ t('inventory.categoryPhoto') }}</Label>
          <div v-if="photoPreview" class="relative w-32 h-32">
            <img
              :src="photoPreview"
              alt=""
              class="w-32 h-32 rounded-md object-cover border border-border"
            />
            <Button
              variant="outline"
              size="sm"
              class="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
              @click="removePhoto"
              :aria-label="t('common.delete')"
            >
              <X class="h-3 w-3" />
            </Button>
          </div>
          <label
            v-else
            class="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <ImagePlus class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm text-muted-foreground">{{ t('inventory.uploadPhoto') }}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handlePhotoChange"
            />
          </label>
        </div>
      </div>

      <div class="trac-sheet-actions">
        <Button variant="outline" class="trac-sheet-btn" @click="handleClose(false)" :disabled="isSaving">
          <X class="h-4 w-4 mr-2" />
          {{ t('common.cancel') }}
        </Button>
        <Button
          class="trac-sheet-btn"
          @click="handleSave"
          :disabled="!name.trim() || isSaving"
        >
          <Save class="h-4 w-4 mr-2" />
          {{ isSaving ? t('common.saving') : t('common.save') }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
