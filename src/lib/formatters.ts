export interface CallSignParts {
  prefix?: string
  callSign: string
  suffix?: string
}

const LOCALE_MAP: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US'
}

export function toIntlLocale(locale: string): string {
  return LOCALE_MAP[locale] ?? locale
}

export function formatCallSign(parts: CallSignParts): string {
  const { prefix, callSign, suffix } = parts
  if (prefix) return `${prefix}/${callSign}`
  if (suffix) return `${callSign}/${suffix}`
  return callSign
}

export function formatDateTime(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return '-'
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleString(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return ''
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleDateString(intlLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateLong(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return '-'
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateSimple(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return '-'
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatNetDate(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return ''
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatTime(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return '-'
  const intlLocale = toIntlLocale(locale)
  return new Date(dateStr).toLocaleTimeString(intlLocale, {
    hour: '2-digit',
    minute: '2-digit'
  })
}
