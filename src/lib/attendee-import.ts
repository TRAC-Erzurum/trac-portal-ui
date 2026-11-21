/**
 * Pure logic for the net attendee Excel/CSV import (see root issue #73, column mapping #150).
 * No DOM, no XLSX dependency: callers pass the sheet as a matrix of cell values.
 */

export const ATTENDEE_IMPORT_MAX_ROWS = 500

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

/** Import fields in the order the mapping UI shows them. */
export const ATTENDEE_IMPORT_FIELDS = [
  'callSign',
  'name',
  'city',
  'district',
  'signal',
  'readability',
  'signalStrength'
] as const

export type ImportField = (typeof ATTENDEE_IMPORT_FIELDS)[number]

/** Field to zero-based column index. Unmapped fields are absent. */
export type ColumnMapping = Partial<Record<ImportField, number>>

/** Aliases are normalized with the same rules as cell values before matching. */
const HEADER_ALIASES: Record<ImportField, string[]> = {
  callSign: ['çağrı işareti', 'çağrı kodu', 'çağrı', 'callsign', 'call sign', 'call'],
  name: ['adı soyadı', 'ad soyad', 'adı', 'ad', 'isim', 'name', 'full name'],
  city: ['il', 'şehir', 'city', 'province'],
  district: ['ilçe', 'district'],
  signal: ['sinyal', 'rs', 'rapor', 'signal', 'report'],
  readability: ['okunabilirlik', 'r', 'readability'],
  signalStrength: ['sinyal gücü', 's', 'signal strength', 'strength']
}

const TURKISH_TO_ASCII: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u'
}

/** Trim, Turkish lower-case, fold Turkish letters to ASCII, keep only a-z0-9. */
function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, char => TURKISH_TO_ASCII[char] ?? char)
    .replace(/[^a-z0-9]/g, '')
}

const EXACT_MATCH = 2
const PARTIAL_MATCH = 1

/**
 * Scores a cell against one alias: exact matches beat substring matches, and longer aliases
 * beat shorter ones. Returns 0 for no match. Aliases shorter than 3 characters match exactly only.
 */
function matchScore(cell: string, alias: string): number {
  if (!cell || !alias) return 0
  if (cell === alias) return EXACT_MATCH * 100 + alias.length
  if (alias.length >= 3 && cell.includes(alias)) return PARTIAL_MATCH * 100 + alias.length
  return 0
}

function fieldScore(cell: unknown, field: ImportField): number {
  const normalized = normalizeHeader(cell)
  return Math.max(0, ...HEADER_ALIASES[field].map(alias => matchScore(normalized, normalizeHeader(alias))))
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

const CALL_SIGN_PATTERN = /^([a-z0-9]{1,4}\/)?[a-z0-9]{1,3}[0-9][a-z0-9]{0,3}[a-z](\/[a-z0-9]{1,4})?$/i

/** True when the trimmed cell text looks like an amateur radio call sign (e.g. TA9A, TA1/DL1ABC, TA9A/P). */
export function looksLikeCallSign(value: unknown): boolean {
  return CALL_SIGN_PATTERN.test(String(value ?? '').trim())
}

/**
 * True when the first row is a header. A row containing a call sign is never a header.
 * Otherwise a cell must match a field alias exactly, or partially (substring) with no digits,
 * so data such as "Kadir Yılmaz" or "Kırşehir 59" does not count as a header.
 */
export function detectHeaderRow(firstRow: unknown[]): boolean {
  if (firstRow.some(looksLikeCallSign)) return false
  return firstRow.some(cell => {
    const score = ATTENDEE_IMPORT_FIELDS.reduce((best, field) => Math.max(best, fieldScore(cell, field)), 0)
    if (score >= EXACT_MATCH * 100) return true
    return score > 0 && !/\d/.test(String(cell ?? ''))
  })
}

/**
 * Maps fields to columns.
 *
 * With a header: each field gets its best-matching column. Candidates are assigned greedily by
 * score, so a column is never used for two fields and exact matches win over substring matches.
 * Without a header: positional mapping A=callSign, B=name, C=city, D=district, E=signal.
 */
export function autoMapColumns(firstRow: unknown[], hasHeader: boolean, columnCount: number): ColumnMapping {
  const mapping: ColumnMapping = {}

  if (!hasHeader) {
    const positional: ImportField[] = ['callSign', 'name', 'city', 'district', 'signal']
    positional.forEach((field, index) => {
      if (index < columnCount) mapping[field] = index
    })
    return mapping
  }

  const candidates: { field: ImportField; column: number; score: number; fieldOrder: number }[] = []
  firstRow.slice(0, columnCount).forEach((cell, column) => {
    ATTENDEE_IMPORT_FIELDS.forEach((field, fieldOrder) => {
      const score = fieldScore(cell, field)
      if (score > 0) candidates.push({ field, column, score, fieldOrder })
    })
  })

  candidates.sort((a, b) => b.score - a.score || a.fieldOrder - b.fieldOrder || a.column - b.column)

  const usedColumns = new Set<number>()
  for (const candidate of candidates) {
    if (mapping[candidate.field] !== undefined || usedColumns.has(candidate.column)) continue
    mapping[candidate.field] = candidate.column
    usedColumns.add(candidate.column)
  }
  return mapping
}

/**
 * Builds import rows from the sheet matrix using the given mapping.
 * Data starts after the header row when hasHeader is set. Rows keep their spreadsheet row numbers
 * and rows with an empty call sign are skipped. Without a call sign column there are no rows.
 *
 * @param matrix sheet rows, first row first (cell values as read from the file)
 * @param firstRowNumber spreadsheet row number of matrix[0]
 */
export function buildImportRows(
  matrix: unknown[][],
  hasHeader: boolean,
  mapping: ColumnMapping,
  firstRowNumber: number
): AttendeeImportRow[] {
  if (mapping.callSign === undefined) return []

  const dataStart = hasHeader ? 1 : 0
  const rows: AttendeeImportRow[] = []

  matrix.slice(dataStart).forEach((cells, index) => {
    const callSign = cellText(cells, mapping.callSign).toUpperCase()
    if (!callSign) return

    const combined = parseCombinedSignal(cellText(cells, mapping.signal))
    const readabilityText = cellText(cells, mapping.readability)
    const strengthText = cellText(cells, mapping.signalStrength)

    // Separate columns take precedence over the combined column when they are mapped.
    const readability = mapping.readability !== undefined
      ? toIntInRange(readabilityText, 1, 5, DEFAULT_READABILITY)
      : combined.readability ?? DEFAULT_READABILITY
    const signalStrength = mapping.signalStrength !== undefined
      ? toIntInRange(strengthText, 1, 9, DEFAULT_SIGNAL_STRENGTH)
      : combined.signalStrength ?? DEFAULT_SIGNAL_STRENGTH

    rows.push({
      row: firstRowNumber + dataStart + index,
      callSign,
      name: cellText(cells, mapping.name) || undefined,
      city: cellText(cells, mapping.city) || undefined,
      district: cellText(cells, mapping.district) || undefined,
      readability,
      signalStrength
    })
  })

  return rows
}

/** Spreadsheet column letter for a zero-based index: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}
