/**
 * Pure parsing for the net attendee Excel/CSV import (see root issue #73).
 * No DOM, no XLSX dependency: callers pass the sheet as a matrix of cell values.
 */

export const ATTENDEE_IMPORT_MAX_ROWS = 500

export const ATTENDEE_TEMPLATE_FILE_NAME = 'cevrim-katilimci-sablonu.xlsx'
export const ATTENDEE_TEMPLATE_HEADERS = ['Çağrı İşareti', 'Adı Soyadı', 'İl', 'İlçe', 'Sinyal']
export const ATTENDEE_TEMPLATE_EXAMPLE_ROW = ['TA9A', 'Örnek Kişi', 'Erzurum', 'Yakutiye', '59']

const DEFAULT_READABILITY = 5
const DEFAULT_SIGNAL_STRENGTH = 9

export type AttendeeImportSkipReason = 'invalidCallSign' | 'duplicate' | 'failed'

export interface AttendeeImportRow {
  /** Spreadsheet row number (1-based), echoed back by the API in skip results. */
  row: number
  callSign: string
  name?: string
  city?: string
  district?: string
  readability: number
  signalStrength: number
}

export interface AttendeeImportSkipped {
  row: number
  callSign: string
  reason: AttendeeImportSkipReason
}

export interface AttendeeImportResponse {
  added: number
  skipped: AttendeeImportSkipped[]
}

export interface AttendeeImportParseResult {
  mode: 'header' | 'positional'
  rows: AttendeeImportRow[]
}

type Field = 'callSign' | 'name' | 'city' | 'district' | 'signal' | 'readability' | 'signalStrength'

const HEADER_ALIASES: Record<Field, string[]> = {
  callSign: ['çağrı işareti', 'cagri isareti', 'çağrı', 'call sign', 'callsign', 'call'],
  name: ['adı soyadı', 'ad soyad', 'adı', 'ad', 'isim', 'name', 'full name'],
  city: ['il', 'şehir', 'sehir', 'city', 'province'],
  district: ['ilçe', 'ilce', 'district'],
  signal: ['sinyal', 'rs', 'rapor', 'signal', 'report'],
  readability: ['okunabilirlik', 'r', 'readability'],
  signalStrength: ['sinyal gücü', 'sinyal gucu', 's', 'signal strength']
}

/** Trim, collapse inner whitespace, lower-case with Turkish rules. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr')
}

function findColumn(headerRow: unknown[], field: Field): number | undefined {
  const aliases = HEADER_ALIASES[field]
  const index = headerRow.findIndex(cell => aliases.includes(normalizeHeader(cell)))
  return index >= 0 ? index : undefined
}

function cellText(row: unknown[], index: number | undefined): string {
  if (index === undefined) return ''
  return String(row[index] ?? '').trim()
}

function toIntInRange(text: string, min: number, max: number, fallback: number): number {
  if (!/^\d+$/.test(text)) return fallback
  const value = Number.parseInt(text, 10)
  return value >= min && value <= max ? value : fallback
}

/**
 * Parses a combined signal value: "59", "5/9", "5-9" or "5 9".
 * The first digit is readability (1-5), the last digit is signal strength (1-9).
 * Missing or out-of-range parts are returned as undefined so the caller can apply defaults.
 */
export function parseCombinedSignal(text: string): { readability?: number; signalStrength?: number } {
  const trimmed = text.trim()
  const pair = /^(\d)\s*[/-]?\s*(\d)$/.exec(trimmed)
  if (pair) {
    return {
      readability: toIntInRange(pair[1], 1, 5, DEFAULT_READABILITY),
      signalStrength: toIntInRange(pair[2], 1, 9, DEFAULT_SIGNAL_STRENGTH)
    }
  }
  const single = /^(\d)$/.exec(trimmed)
  if (single) {
    return { readability: toIntInRange(single[1], 1, 5, DEFAULT_READABILITY) }
  }
  return {}
}

/**
 * Parses sheet rows into import rows.
 *
 * Header mode: when any cell of the first row matches a call-sign alias, the first row is the header
 * and columns are matched by name. Otherwise positional mode: A=callSign, B=name, C=city, D=district,
 * E=combined signal, and every row is data.
 *
 * @param matrix sheet rows, first row first (cell values as read from the file)
 * @param firstRowNumber spreadsheet row number of matrix[0] (defaults to 1)
 */
export function parseAttendeeRows(matrix: unknown[][], firstRowNumber = 1): AttendeeImportParseResult {
  const first = matrix[0] ?? []
  const isHeaderMode = findColumn(first, 'callSign') !== undefined

  let columns: Partial<Record<Field, number>>
  let dataRows: unknown[][]
  let dataStartRowNumber: number

  if (isHeaderMode) {
    columns = {
      callSign: findColumn(first, 'callSign'),
      name: findColumn(first, 'name'),
      city: findColumn(first, 'city'),
      district: findColumn(first, 'district'),
      signal: findColumn(first, 'signal'),
      readability: findColumn(first, 'readability'),
      signalStrength: findColumn(first, 'signalStrength')
    }
    dataRows = matrix.slice(1)
    dataStartRowNumber = firstRowNumber + 1
  } else {
    columns = { callSign: 0, name: 1, city: 2, district: 3, signal: 4 }
    dataRows = matrix
    dataStartRowNumber = firstRowNumber
  }

  const rows: AttendeeImportRow[] = []

  dataRows.forEach((cells, index) => {
    const callSign = cellText(cells, columns.callSign).toUpperCase()
    if (!callSign) return

    const combined = parseCombinedSignal(cellText(cells, columns.signal))
    const readabilityText = cellText(cells, columns.readability)
    const strengthText = cellText(cells, columns.signalStrength)

    // Separate columns take precedence over the combined column when they exist in the file.
    const readability = columns.readability !== undefined
      ? toIntInRange(readabilityText, 1, 5, DEFAULT_READABILITY)
      : combined.readability ?? DEFAULT_READABILITY
    const signalStrength = columns.signalStrength !== undefined
      ? toIntInRange(strengthText, 1, 9, DEFAULT_SIGNAL_STRENGTH)
      : combined.signalStrength ?? DEFAULT_SIGNAL_STRENGTH

    rows.push({
      row: dataStartRowNumber + index,
      callSign,
      name: cellText(cells, columns.name) || undefined,
      city: cellText(cells, columns.city) || undefined,
      district: cellText(cells, columns.district) || undefined,
      readability,
      signalStrength
    })
  })

  return { mode: isHeaderMode ? 'header' : 'positional', rows }
}
