/**
 * Turkish character mapping for case-insensitive and Turkish-character-compatible search
 * Handles special characters like ş, ç, ğ, ı, ö, ü
 */

// Character normalization map for Turkish support
const TURKISH_CHAR_MAP: Record<string, string> = {
  // Uppercase to lowercase
  'Ş': 's',
  'ş': 's',
  'Ç': 'c',
  'ç': 'c',
  'Ğ': 'g',
  'ğ': 'g',
  'Ü': 'u',
  'ü': 'u',
  'Ö': 'o',
  'ö': 'o',
  'İ': 'i',
  'ı': 'i',
  'I': 'i',
};

/**
 * Normalizes Turkish text for search by:
 * 1. Converting to lowercase
 * 2. Replacing Turkish characters with their ASCII equivalents
 * This makes search case-insensitive and Turkish-character-compatible
 * 
 * Examples:
 * - "Şahin" -> "sahin"
 * - "İstanbul" -> "istanbul"
 * - "ÇANKIRI" -> "cankiri"
 * - "ş" and "s" both normalize to "s"
 * - "İ" and "i" both normalize to "i"
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split('')
    .map(char => TURKISH_CHAR_MAP[char] || char)
    .join('');
}

/**
 * Checks if a string matches a search term with Turkish character support
 * Useful for client-side filtering
 * 
 * @param text - The text to search in
 * @param searchTerm - The term to search for
 * @returns true if the normalized text includes the normalized search term
 */
export function matchesTurkishSearch(text: string, searchTerm: string): boolean {
  const normalizedText = normalizeTurkishText(text);
  const normalizedTerm = normalizeTurkishText(searchTerm);
  return normalizedText.includes(normalizedTerm);
}

/**
 * Filters an array of strings with Turkish-compatible search
 * 
 * @param items - Array of strings to filter
 * @param searchTerm - The term to search for
 * @returns Filtered array containing matching items
 */
export function filterWithTurkishSearch(items: string[], searchTerm: string): string[] {
  if (!searchTerm?.trim()) return items;
  return items.filter(item => matchesTurkishSearch(item, searchTerm));
}

/**
 * Filters objects by property with Turkish-compatible search
 * 
 * @param items - Array of objects to filter
 * @param property - The property to search in
 * @param searchTerm - The term to search for
 * @returns Filtered array containing matching items
 */
export function filterObjectsWithTurkishSearch<T extends Record<string, any>>(
  items: T[],
  property: keyof T,
  searchTerm: string,
): T[] {
  if (!searchTerm?.trim()) return items;
  return items.filter(item => {
    const value = item[property];
    if (typeof value === 'string') {
      return matchesTurkishSearch(value, searchTerm);
    }
    return false;
  });
}
