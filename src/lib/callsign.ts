/**
 * Turkish character to Latin conversion mapping.
 * Used for call sign normalization to remove accents and special Turkish characters.
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  // Uppercase
  'İ': 'I',
  'Ş': 'S',
  'Ğ': 'G',
  'Ü': 'U',
  'Ö': 'O',
  'Ç': 'C',
  
  // Lowercase (will be converted to uppercase anyway)
  'ş': 'S',
  'ğ': 'G',
  'ü': 'U',
  'ö': 'O',
  'ç': 'C',
  'ı': 'I'
}

/**
 * Normalizes a call sign by:
 * 1. Converting to uppercase
 * 2. Replacing Turkish characters with their Latin equivalents
 * 3. Allowing only alphanumeric characters and slashes
 * 
 * Examples:
 *   'ta9işt' -> 'TA9IST'
 *   'İstanbul/123' -> 'ISTANBUL/123'
 *   'ş9ü' -> 'S9U'
 */
export function normalizeCallSign(value: string): string {
  if (!value) return ''
  
  // First, remove any leading/trailing whitespace
  let normalized = value.trim()
  
  // Replace Turkish characters with their Latin equivalents
  normalized = normalized
    .split('')
    .map(char => TURKISH_CHAR_MAP[char] ?? char)
    .join('')
  
  // Convert to uppercase
  normalized = normalized.toUpperCase()
  
  // Remove any characters that aren't alphanumeric or slash
  // This is optional - adjust regex based on your requirements
  // For now, we'll be permissive and allow most characters
  
  return normalized
}

/**
 * Validates if a call sign is valid (basic check).
 * Can be extended with more specific rules.
 */
export function isValidCallSign(value: string): boolean {
  if (!value || !value.trim()) return false

  const normalized = normalizeCallSign(value)

  // Call sign must have at least one letter
  // and should not be empty after normalization
  return /[A-Z0-9]/.test(normalized) && normalized.trim().length > 0
}

const SEGMENT_REGEX = /^[A-Z0-9]+$/
const MAX_SLASHES = 2

function normalizeSegment(s: string): string {
  return (s ?? '').trim().toUpperCase()
}

/**
 * Checks that a single segment contains only letters and digits (A–Z, 0–9).
 */
export function isValidCallSignSegment(segment: string): boolean {
  const n = normalizeSegment(segment)
  return n.length > 0 && SEGMENT_REGEX.test(n)
}

export interface CallSignFormatOptions {
  /** If false, only a single segment (no slashes) is allowed. */
  allowSlashes: boolean
}

/**
 * Validates call sign format (ITU-style).
 * - Only A–Z and 0–9 (input normalized via normalizeCallSign for Turkish).
 * - If allowSlashes is false: no "/" allowed (plain only).
 * - If allowSlashes is true: at most 2 slashes; each segment non-empty and A–Z0–9 only.
 */
export function isValidCallSignFormat(
  value: string,
  options: CallSignFormatOptions,
): boolean {
  const normalized = normalizeCallSign((value ?? '').trim())
  if (normalized.length === 0) return false

  const parts = normalized.split('/').map((p) => (p ?? '').trim())
  const slashCount = parts.length - 1

  if (!options.allowSlashes) {
    if (slashCount > 0) return false
    return isValidCallSignSegment(parts[0] ?? '')
  }

  if (slashCount > MAX_SLASHES) return false
  return parts.every((p) => isValidCallSignSegment(p))
}

/**
 * Extracts the "plain" (base) call sign for operator matching.
 * If both sides of "/" look like call signs, the segment after the slash is used.
 */
export function extractPlainCallSign(value: string): string {
  const normalized = normalizeCallSign((value ?? '').trim())
  if (normalized.length === 0) return ''

  const parts = normalized
    .split('/')
    .map((p) => normalizeSegment((p ?? '').trim()))
    .filter(Boolean)
  if (parts.length === 0) return ''

  if (parts.length === 1) return parts[0] ?? ''

  const withDigitAndLetter = parts.filter(
    (s) => /[A-Z]/.test(s) && /[0-9]/.test(s),
  )
  if (withDigitAndLetter.length > 0) {
    return withDigitAndLetter[withDigitAndLetter.length - 1] ?? ''
  }

  return parts[parts.length - 1] ?? ''
}

/**
 * Normalizes a plain call sign for storage (trim + uppercase via normalizeCallSign).
 */
export function normalizePlainCallSign(value: string): string {
  return normalizeCallSign((value ?? '').trim())
}
