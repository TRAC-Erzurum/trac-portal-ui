<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Download, FileType, Loader2, Upload, X } from 'lucide-vue-next'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { api, type ApiError } from '@/lib/api'
import { translateError } from '@/i18n'
import {
  ATTENDEE_IMPORT_MAX_ROWS,
  ATTENDEE_TEMPLATE_EXAMPLE_ROW,
  ATTENDEE_TEMPLATE_FILE_NAME,
  ATTENDEE_TEMPLATE_HEADERS,
  parseAttendeeRows,
  type AttendeeImportResponse,
  type AttendeeImportRow
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

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const rows = ref<AttendeeImportRow[]>([])
const parseMode = ref<'header' | 'positional' | null>(null)
const parseError = ref('')
const isParsing = ref(false)
const isImporting = ref(false)
const result = ref<AttendeeImportResponse | null>(null)
const hasImported = ref(false)

const hasValidRows = computed(
  () => rows.value.length > 0 && rows.value.length <= ATTENDEE_IMPORT_MAX_ROWS
)

function resetState() {
  selectedFileName.value = ''
  rows.value = []
  parseMode.value = null
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

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const lowerName = file.name.toLowerCase()
  if (!['.xlsx', '.xls', '.csv'].some(ext => lowerName.endsWith(ext))) {
    parseError.value = t('attendeeImport.invalidFileType')
    rows.value = []
    parseMode.value = null
    return
  }

  selectedFileName.value = file.name
  result.value = null
  parseError.value = ''
  isParsing.value = true
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) throw new Error('empty workbook')

    // Keep matrix index aligned with spreadsheet row numbers (blank rows included).
    const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null
    const firstRowNumber = (range?.s.r ?? 0) + 1
    const matrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: true,
      defval: ''
    }) as unknown[][]

    const parsed = parseAttendeeRows(matrix, firstRowNumber)
    parseMode.value = parsed.mode
    rows.value = parsed.rows

    if (parsed.rows.length === 0) {
      parseError.value = t('attendeeImport.noRows')
    } else if (parsed.rows.length > ATTENDEE_IMPORT_MAX_ROWS) {
      parseError.value = t('attendeeImport.tooManyRows', { max: ATTENDEE_IMPORT_MAX_ROWS })
    }
  } catch {
    rows.value = []
    parseMode.value = null
    parseError.value = t('attendeeImport.readError')
  } finally {
    isParsing.value = false
  }
}

async function downloadTemplate() {
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      [...ATTENDEE_TEMPLATE_HEADERS],
      [...ATTENDEE_TEMPLATE_EXAMPLE_ROW]
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, t('attendeeImport.sheetName'))
    XLSX.writeFile(workbook, ATTENDEE_TEMPLATE_FILE_NAME)
  } catch {
    toast.error(t('error.serverError'))
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
        <!-- Template -->
        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">{{ t('attendeeImport.templateDescription') }}</p>
          <Button type="button" variant="outline" size="sm" class="gap-2" @click="downloadTemplate">
            <Download class="h-4 w-4" aria-hidden="true" />
            {{ t('attendeeImport.downloadTemplate') }}
          </Button>
        </div>

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
          <p v-if="parseError" role="alert" class="text-sm text-destructive">{{ parseError }}</p>
          <p v-if="parseMode === 'header'" class="text-xs text-muted-foreground">
            {{ t('attendeeImport.headerDetected') }}
          </p>
          <p v-else-if="parseMode === 'positional'" class="text-xs text-muted-foreground">
            {{ t('attendeeImport.positionalDetected') }}
          </p>
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
