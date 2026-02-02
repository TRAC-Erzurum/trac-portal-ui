export interface CallSignParts {
  prefix?: string
  callSign: string
  suffix?: string
}

export function formatCallSign(parts: CallSignParts): string {
  const { prefix, callSign, suffix } = parts
  if (prefix) return `${prefix}/${callSign}`
  if (suffix) return `${callSign}/${suffix}`
  return callSign
}

export function formatDateTime(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(dateStr?: string | null, locale: string = 'tr-TR'): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateLong(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateSimple(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

export function formatNetDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
