<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Upload, FileType, CheckCheck, Loader2, X } from 'lucide-vue-next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, type ApiError } from '@/lib/api'
import { translateError } from '@/i18n'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'imported': []
}>()

const { t } = useI18n()

/** Sentinel for "no column mapped"; SelectItem cannot use value="" */
const UNMAPPED_VALUE = '__unmapped__'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const headers = ref<string[]>([])
const previewRows = ref<string[][]>([])
const isLoading = ref(false)

const mapping = ref<Record<string, string>>({
  callSign: UNMAPPED_VALUE,
  fullName: UNMAPPED_VALUE,
  city: UNMAPPED_VALUE,
  district: UNMAPPED_VALUE,
  country: UNMAPPED_VALUE,
  gridSquare: UNMAPPED_VALUE
})

const fields = [
  'callSign',
  'fullName',
  'city',
  'district',
  'country',
  'gridSquare'
]

const isFileSelected = computed(() => !!selectedFile.value)
const isCallSignMapped = computed(
  () => !!mapping.value.callSign && mapping.value.callSign !== UNMAPPED_VALUE
)

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    toast.error(t('error.invalidFileType'))
    return
  }

  selectedFile.value = file
  parseExcelHeaders(file)
}

async function parseExcelHeaders(file: File) {
  try {
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    
    if (!worksheet) {
      toast.error(t('error.invalidFileType'))
      return
    }

    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
    if (data.length === 0) {
      toast.error(t('error.invalidFileType'))
      return
    }

    const firstRow = data[0] ?? []
    headers.value = firstRow.map(h => String(h).trim())

    // Parse preview rows (up to 5)
    previewRows.value = (data.slice(1, 6) as unknown[][]).map(row =>
      row.map(cell => String(cell ?? '').trim())
    )

    // Auto-mapping attempt
    headers.value.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[\s_-]/g, '')
      fields.forEach(field => {
        const lowerField = field.toLowerCase()
        if (lowerHeader === lowerField || (lowerField === 'callsign' && lowerHeader === 'cagriisareti')) {
          mapping.value[field] = header
        }
      })
    })
  } catch (error) {
    toast.error(t('error.invalidFileType'))
    selectedFile.value = null
  }
}

async function handleImport() {
  if (!selectedFile.value || !isCallSignMapped.value) return

  isLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    
    // Clean up mapping (remove unmapped/empty values)
    const finalMapping: Record<string, string> = {}
    Object.entries(mapping.value).forEach(([key, value]) => {
      if (value && value !== UNMAPPED_VALUE) finalMapping[key] = value
    })
    
    formData.append('mapping', JSON.stringify(finalMapping))

    await api.post('/operator/import', formData)
    
    toast.success(t('operators.importSuccess'))
    emit('imported')
    emit('update:open', false)
    reset()
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isLoading.value = false
  }
}

function reset() {
  selectedFile.value = null
  headers.value = []
  previewRows.value = []
  mapping.value = {
    callSign: UNMAPPED_VALUE,
    fullName: UNMAPPED_VALUE,
    city: UNMAPPED_VALUE,
    district: UNMAPPED_VALUE,
    country: UNMAPPED_VALUE,
    gridSquare: UNMAPPED_VALUE
  }
  if (fileInput.value) fileInput.value.value = ''
}

function getMappedValue(rowIndex: number, field: string) {
  const header = mapping.value[field]
  if (!header) return '-'
  const headerIndex = headers.value.indexOf(header)
  const row = previewRows.value[rowIndex]
  if (!row || headerIndex < 0) return '-'
  return row[headerIndex] ?? '-'
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-[540px] flex flex-col h-full">
      <SheetHeader class="px-6 py-4 border-b">
        <SheetTitle>{{ t('operators.importTitle') }}</SheetTitle>
        <SheetDescription>
          {{ t('operators.importDescription') }}
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <!-- File Selection -->
        <div class="space-y-4">
          <div 
            class="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50 transition-colors hover:bg-muted/80 cursor-pointer"
            @click="fileInput?.click()"
          >
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".xlsx,.xls"
              @change="handleFileSelect"
            />
            <div v-if="!selectedFile" class="flex flex-col items-center gap-2">
              <Upload class="h-10 w-10 text-muted-foreground" />
              <p class="font-medium">{{ t('operators.selectFile') }}</p>
            </div>
            <div v-else class="flex flex-col items-center gap-2 text-primary">
              <FileType class="h-10 w-10" />
              <p class="font-medium">{{ selectedFile.name }}</p>
              <Button variant="ghost" size="sm" @click.stop="reset" class="mt-2">
                {{ t('common.cancel') }}
              </Button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground text-center italic">
            {{ t('operators.importNotice') }}
          </p>
        </div>

        <!-- Mapping -->
        <div v-if="isFileSelected" class="space-y-4">
          <h3 class="font-semibold text-sm flex items-center gap-2">
            <CheckCheck class="h-4 w-4" />
            {{ t('operators.columnMapping') }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="field in fields" :key="field" class="space-y-2">
              <Label class="text-xs uppercase text-muted-foreground font-bold flex items-center gap-1">
                {{ t(`operators.fields.${field}`) }}
                <span v-if="field === 'callSign'" class="text-destructive">*</span>
              </Label>
              <Select v-model="mapping[field]">
                <SelectTrigger>
                  <SelectValue :placeholder="t('common.select')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="UNMAPPED_VALUE">--</SelectItem>
                  <SelectItem v-for="header in headers" :key="header" :value="header">
                    {{ header }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="isFileSelected && previewRows.length > 0" class="space-y-4 pt-4 border-t">
          <h3 class="font-semibold text-sm">{{ t('operators.preview') }}</h3>
          <div class="overflow-x-auto border rounded-md">
            <table class="w-full text-xs text-left">
              <thead class="bg-muted">
                <tr>
                  <th v-for="field in fields" :key="field" class="px-2 py-2 border-b whitespace-nowrap">
                    {{ t(`operators.fields.${field}`) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(_, idx) in previewRows" :key="idx" class="hover:bg-muted/50 transition-colors">
                  <td v-for="field in fields" :key="field" class="px-2 py-2 border-b">
                    {{ getMappedValue(idx, field) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SheetFooter class="px-6 py-4 border-t trac-sheet-actions">
        <div class="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" class="trac-sheet-btn" @click="emit('update:open', false)" :disabled="isLoading">
            <X class="h-4 w-4 mr-2" />
            {{ t('common.cancel') }}
          </Button>
          <Button 
            class="trac-sheet-btn"
            :disabled="!isFileSelected || !isCallSignMapped || isLoading"
            @click="handleImport"
          >
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            <Upload v-else class="mr-2 h-4 w-4" />
            {{ isLoading ? t('common.loading') : t('operators.import') }}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
