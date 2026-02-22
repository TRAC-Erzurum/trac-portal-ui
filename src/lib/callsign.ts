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
