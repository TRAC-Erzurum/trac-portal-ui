import { i18n } from '@/i18n'

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

/** Band key from TX frequency (MHz) for VHF/UHF repeater */
function getBandKeyFromTxFrequency(txFrequency?: number | null): 'bandVhf' | 'bandUhf' | 'band6m' | 'band23cm' | null {
  if (txFrequency == null) return null
  const freq = Number(txFrequency)
  if (freq >= 144 && freq <= 148) return 'bandVhf'
  if (freq >= 430 && freq <= 440) return 'bandUhf'
  if (freq >= 50 && freq <= 54) return 'band6m'
  if (freq >= 1240 && freq <= 1300) return 'band23cm'
  return null
}

/**
 * Display label for a net's communication channel (relay: band + TX freq, echolink: Echolink + node/name, aprs: APRS, simplex: Simpleks + freq).
 * Uses i18n; must be called when i18n is ready (e.g. inside app).
 */
export function formatCommunicationChannelLabel(channel: {
  isSimplexAdHoc?: boolean
  simplexFrequency?: string | null
  communicationChannel?: {
    type: string
    txFrequency?: number | null
    echolinkNode?: string | null
    echolinkName?: string | null
  } | null
}): string {
  const t = (key: string, params?: Record<string, string>) =>
    params ? i18n.global.t(key, params) : i18n.global.t(key)

  if (channel.isSimplexAdHoc && channel.simplexFrequency?.trim()) {
    return t('communicationChannels.channelLabelSimplex', {
      frequency: channel.simplexFrequency.trim()
    })
  }
  const ch = channel.communicationChannel
  if (!ch) return ''
  switch (ch.type) {
    case 'vhf_uhf_repeater': {
      const bandKey = getBandKeyFromTxFrequency(ch.txFrequency)
      const band = bandKey ? t(`communicationChannels.${bandKey}`) : null
      const txFreq =
        ch.txFrequency != null && Number.isFinite(Number(ch.txFrequency))
          ? Number(ch.txFrequency).toFixed(3)
          : null
      if (band && txFreq) return t('communicationChannels.channelLabelRepeater', { frequency: txFreq, band })
      if (txFreq) return t('communicationChannels.channelLabelRepeaterFreqOnly', { frequency: txFreq })
      if (band) return t('communicationChannels.channelLabelRepeaterBandOnly', { band })
      return t('communicationChannels.channelLabelVhfUhf')
    }
    case 'echolink': {
      const name = ch.echolinkName?.trim()
      const node = ch.echolinkNode?.trim()
      const display = name || node || ''
      return display
        ? t('communicationChannels.channelLabelEcholink', { display })
        : t('communicationChannels.channelLabelEcholinkOnly')
    }
    case 'aprs':
      return t('communicationChannels.types.aprs')
    default:
      return ch.type || ''
  }
}
