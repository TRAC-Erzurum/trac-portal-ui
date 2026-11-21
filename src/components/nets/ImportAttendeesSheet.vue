<script setup lang="ts">
import { ref, computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { FileType, Loader2, Upload, X } from 'lucide-vue-next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, type ApiError } from '@/lib/api'
import { translateError } from '@/i18n'
import {
  ATTENDEE_IMPORT_FIELDS,
  ATTENDEE_IMPORT_MAX_ROWS,
  autoMapColumns,
  buildImportRows,
  columnLetter,
  detectHeaderRow,
  type AttendeeImportResponse,
  type ColumnMapping,
  type ImportField
} from '@/lib/attendee-import'

const props = defineProps<{
  open: boolean
  netId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'imported': []
}>()

const { t } = useI18n()

/** Sentinel for "no column mapped"; SelectItem cannot use value="" */
const UNMAPPED_VALUE = '__unmapped__'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const isSheetLoaded = ref(false)
const matrix = shallowRef<unknown[][]>([])
const firstRowNumber = ref(1)
const hasHeader = ref(false)
const mapping = ref<ColumnMapping>({})
const parseError = ref('')
const isParsing = ref(false)
const isImporting = ref(false)
const result = ref<AttendeeImportResponse | null>(null)
const hasImported = ref(false)

const columnCount = computed(() => matrix.value.reduce((max, row) => Math.max(max, row.length), 0))
const columnOptions = computed(() => Array.from({ length: columnCount.value }, (_, index) => index))
const headerRow = computed(() => matrix.value[0] ?? [])
const rows = computed(() =>
  buildImportRows(matrix.value, hasHeader.value, mapping.value, firstRowNumber.value)
)
const isCallSignMapped = computed(() => mapping.value.callSign !== undefined)
const hasValidRows = computed(
  () => isCallSignMapped.value && rows.value.length > 0 && rows.value.length <= ATTENDEE_IMPORT_MAX_ROWS
)

const validationMessage = computed(() => {
  if (!isSheetLoaded.value) return ''
  if (rows.value.length > ATTENDEE_IMPORT_MAX_ROWS) {
    return t('attendeeImport.tooManyRows', { max: ATTENDEE_IMPORT_MAX_ROWS })
  }
  if (!isCallSignMapped.value) return t('attendeeImport.callSignRequired')
  if (rows.value.length === 0) return t('attendeeImport.noRows')
  return ''
})
const errorMessage = computed(() => parseError.value || validationMessage.value)

function resetState() {
  selectedFileName.value = ''
  isSheetLoaded.value = false
  matrix.value = []
  firstRowNumber.value = 1
  hasHeader.value = false
  mapping.value = {}
  parseError.value = ''
  result.value = null
  hasImported.value = false
  if (fileInput.value) fileInput.value.value = ''
}

// Refresh the parent's attendee list once the sheet is closed after an import.
watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen || !wasOpen) return
    if (hasImported.value) emit('imported')
    resetState()
  }
)

function applyAutoMapping(nextHasHeader: boolean) {
  mapping.value = autoMapColumns(headerRow.value, nextHasHeader, columnCount.value)
}

function setHasHeader(value: boolean) {
  hasHeader.value = value
  applyAutoMapping(value)
}

function mappedValue(field: ImportField): string {
  const column = mapping.value[field]
  return column === undefined ? UNMAPPED_VALUE : String(column)
}

function setMappedColumn(field: ImportField, value: unknown) {
  const next = { ...mapping.value }
  if (typeof value === 'string' && value !== UNMAPPED_VALUE) {
    next[field] = Number(value)
  } else {
    delete next[field]
  }
  mapping.value = next
}

function columnOptionLabel(column: number): string {
  const letter = columnLetter(column)
  const header = hasHeader.value ? String(headerRow.value[column] ?? '').trim() : ''
  return header ? `${letter} — ${header}` : t('attendeeImport.columnLabel', { letter })
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const lowerName = file.name.toLowerCase()
  if (!['.xlsx', '.xls', '.csv'].some(ext => lowerName.endsWith(ext))) {
    parseError.value = t('attendeeImport.invalidFileType')
    isSheetLoaded.value = false
    matrix.value = []
    mapping.value = {}
    return
  }

  selectedFileName.value = file.name
  result.value = null
  parseError.value = ''
  isSheetLoaded.value = false
  isParsing.value = true
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) throw new Error('empty workbook')

    // Keep matrix index aligned with spreadsheet row numbers (blank rows included).
    const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null
    firstRowNumber.value = (range?.s.r ?? 0) + 1
    const sheet = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: true,
      defval: ''
    }) as unknown[][]

    matrix.value = sheet
    isSheetLoaded.value = true
    setHasHeader(detectHeaderRow(sheet[0] ?? []))
  } catch {
    isSheetLoaded.value = false
    matrix.value = []
    mapping.value = {}
    parseError.value = t('attendeeImport.readError')
  } finally {
    isParsing.value = false
  }
}

async function handleImport() {
  if (!hasValidRows.value || isImporting.value) return

  isImporting.value = true
  try {
    const response = await api.post<AttendeeImportResponse>(
      `/net/${props.netId}/attendee/import`,
      { rows: rows.value }
    )
    result.value = response
    hasImported.value = true
    // The sheet may have been closed while the request was in flight: the close watcher
    // already ran, so refresh the parent and clear the state here instead.
    if (!props.open) {
      emit('imported')
      resetState()
    }
  } catch (e) {
    const error = e as ApiError
    toast.error(translateError(error.message))
  } finally {
    isImporting.value = false
  }
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent class="sm:max-w-[640px] flex flex-col h-full">
      <SheetHeader class="px-6 py-4 border-b">
        <SheetTitle>{{ t('attendeeImport.title') }}</SheetTitle>
        <SheetDescription>
          {{ t('attendeeImport.description') }}
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <!-- File selection -->
        <div class="space-y-3">
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            accept=".xlsx,.xls,.csv"
            @change="handleFileSelect"
          />
          <Button
            type="button"
            variant="outline"
            class="gap-2"
            :disabled="isImporting"
            @click="fileInput?.click()"
          >
            <Upload class="h-4 w-4" aria-hidden="true" />
            {{ t('attendeeImport.selectFile') }}
          </Button>
          <p v-if="selectedFileName" class="flex items-center gap-2 text-sm font-medium">
            <FileType class="h-4 w-4" aria-hidden="true" />
            {{ selectedFileName }}
          </p>
          <p v-if="isParsing" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>
          <p v-if="errorMessage" role="alert" class="text-sm text-destructive">{{ errorMessage }}</p>
        </div>

        <!-- Column mapping -->
        <div v-if="isSheetLoaded && !result" class="space-y-4 pt-4 border-t">
          <div class="flex items-center gap-3">
            <Checkbox
              id="attendee-import-header"
              :model-value="hasHeader"
              @update:model-value="setHasHeader($event === true)"
            />
            <Label for="attendee-import-header">{{ t('attendeeImport.firstRowHeader') }}</Label>
          </div>

          <div class="space-y-3">
            <h3 class="text-sm font-medium text-muted-foreground">{{ t('attendeeImport.mappingTitle') }}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="field in ATTENDEE_IMPORT_FIELDS" :key="field" class="space-y-2">
                <Label
                  :for="`attendee-column-${field}`"
                  class="text-xs uppercase text-muted-foreground font-bold flex items-center gap-1"
                >
                  {{ t(`attendeeImport.fields.${field}`) }}
                  <template v-if="field === 'callSign'">
                    <span class="text-destructive" aria-hidden="true">*</span>
                    <span class="sr-only">({{ t('attendeeImport.required') }})</span>
                  </template>
                </Label>
                <Select
                  :model-value="mappedValue(field)"
                  @update:model-value="setMappedColumn(field, $event)"
                >
                  <SelectTrigger :id="`attendee-column-${field}`">
                    <SelectValue :placeholder="t('common.select')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="UNMAPPED_VALUE">--</SelectItem>
                    <SelectItem v-for="column in columnOptions" :key="column" :value="String(column)">
                      {{ columnOptionLabel(column) }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="hasValidRows && !result" class="space-y-3 pt-4 border-t">
          <h3 class="text-sm font-medium text-muted-foreground">{{ t('attendeeImport.previewTitle') }}</h3>
          <p class="text-sm">{{ t('attendeeImport.rowCount', { count: rows.length }) }}</p>
          <div class="max-h-72 overflow-auto border rounded-md">
            <table class="w-full text-xs text-left">
              <thead class="bg-muted sticky top-0">
                <tr>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.row') }}</th>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.callSign') }}</th>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.name') }}</th>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.city') }}</th>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.district') }}</th>
                  <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.signal') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in rows" :key="item.row" class="hover:bg-muted/50 transition-colors">
                  <td class="px-2 py-2 border-b">{{ item.row }}</td>
                  <td class="px-2 py-2 border-b font-medium">{{ item.callSign }}</td>
                  <td class="px-2 py-2 border-b">{{ item.name ?? '-' }}</td>
                  <td class="px-2 py-2 border-b">{{ item.city ?? '-' }}</td>
                  <td class="px-2 py-2 border-b">{{ item.district ?? '-' }}</td>
                  <td class="px-2 py-2 border-b">{{ item.readability }}/{{ item.signalStrength }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Result -->
        <div v-if="result" role="status" class="space-y-3 pt-4 border-t">
          <h3 class="text-sm font-medium text-muted-foreground">{{ t('attendeeImport.resultTitle') }}</h3>
          <p class="text-sm font-medium">
            {{ t('attendeeImport.resultSummary', { added: result.added, skipped: result.skipped.length }) }}
          </p>
          <div v-if="result.skipped.length > 0" class="space-y-2">
            <h4 class="text-sm font-medium text-muted-foreground">{{ t('attendeeImport.skippedTitle') }}</h4>
            <div class="max-h-72 overflow-auto border rounded-md">
              <table class="w-full text-xs text-left">
                <thead class="bg-muted sticky top-0">
                  <tr>
                    <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.row') }}</th>
                    <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.callSign') }}</th>
                    <th scope="col" class="px-2 py-2 border-b whitespace-nowrap">{{ t('attendeeImport.columns.reason') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in result.skipped" :key="`${item.row}-${item.callSign}`" class="hover:bg-muted/50 transition-colors">
                    <td class="px-2 py-2 border-b">{{ item.row }}</td>
                    <td class="px-2 py-2 border-b font-medium">{{ item.callSign }}</td>
                    <td class="px-2 py-2 border-b">{{ t(`attendeeImport.skipReasons.${item.reason}`) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <SheetFooter class="px-6 py-4 border-t trac-sheet-actions">
        <div class="flex w-full justify-end gap-3">
          <Button type="button" variant="outline" class="trac-sheet-btn" :disabled="isImporting" @click="close">
            <X class="h-4 w-4 mr-2" aria-hidden="true" />
            {{ t('common.close') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            class="trac-sheet-btn"
            :disabled="!hasValidRows || isImporting || !!result"
            @click="handleImport"
          >
            <Loader2 v-if="isImporting" class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <Upload v-else class="mr-2 h-4 w-4" aria-hidden="true" />
            {{ isImporting ? t('attendeeImport.importing') : t('attendeeImport.import') }}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
