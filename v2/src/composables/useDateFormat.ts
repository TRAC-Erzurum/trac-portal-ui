import { useI18n } from 'vue-i18n'
import {
  formatDateTime as fmtDateTime,
  formatDateShort as fmtDateShort,
  formatDateLong as fmtDateLong,
  formatDateSimple as fmtDateSimple,
  formatNetDate as fmtNetDate,
  formatTime as fmtTime,
  toIntlLocale
} from '@/lib/formatters'

export function useDateFormat() {
  const { locale } = useI18n()

  const intlLocale = () => toIntlLocale(locale.value || 'tr')

  return {
    formatDateTime: (dateStr?: string | null) => fmtDateTime(dateStr, intlLocale()),
    formatDateShort: (dateStr?: string | null) => fmtDateShort(dateStr, intlLocale()),
    formatDateLong: (dateStr?: string | null) => fmtDateLong(dateStr, intlLocale()),
    formatDateSimple: (dateStr?: string | null) => fmtDateSimple(dateStr, intlLocale()),
    formatNetDate: (dateStr?: string | null) => fmtNetDate(dateStr, intlLocale()),
    formatTime: (dateStr?: string | null) => fmtTime(dateStr, intlLocale())
  }
}
