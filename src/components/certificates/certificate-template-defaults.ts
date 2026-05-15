export interface CertificateTemplateElement {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  /** Yatay konum, 0–100 (şablon genişliğinin yüzdesi) */
  x: number
  /** Dikey konum, 0–100 (şablon yüksekliğinin yüzdesi) */
  y: number
  /** Metin kutusu genişliği, 0–100 (şablon genişliğinin yüzdesi) */
  boxWidth: number
  /** Metin kutusu yüksekliği, 0–100 (şablon yüksekliğinin yüzdesi) */
  boxHeight: number
  /** Metin yatay hizası */
  textAlign: 'left' | 'center' | 'right'
  fontSize: number
  color: string
}

/** Browser preview only; PDF uses embedded Noto Sans on the server. */
export const CERTIFICATE_PREVIEW_FONT_FAMILY = '"Noto Sans", sans-serif'

/** Referans yükseklik: fontSize bu yükseğe göre (px); PDF/kart ölçeklenir */
export const REFERENCE_HEIGHT = 300

export const DEFAULT_ELEMENT_VALUES = {
  x: 50,
  y: 50,
  boxWidth: 40,
  boxHeight: 12,
  textAlign: 'center' as const,
  fontSize: 16,
  color: '#000000',
}

export const DEFAULT_SERIAL_ELEMENT: CertificateTemplateElement = {
  type: 'placeholder',
  placeholderKey: 'certificate_serial',
  x: 74,
  y: 94,
  boxWidth: 26,
  boxHeight: 6,
  textAlign: 'right',
  fontSize: 8,
  color: '#666666',
}

export function createDefaultCertificateElement(
  type: 'static' | 'placeholder',
  placeholderKey?: string,
): CertificateTemplateElement {
  return {
    type,
    content: type === 'static' ? '' : undefined,
    placeholderKey: type === 'placeholder' ? placeholderKey : undefined,
    ...DEFAULT_ELEMENT_VALUES,
  }
}

const normalizePercent = (value: unknown, legacyBase: number, fallback: number) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  if (num > 100) return (num / legacyBase) * 100
  return Math.min(100, Math.max(0, num))
}

export function normalizeCertificateTemplateElement(raw: unknown): CertificateTemplateElement {
  const e = (raw ?? {}) as Record<string, unknown>
  return {
    type: e.type === 'placeholder' ? 'placeholder' : 'static',
    content: typeof e.content === 'string' ? e.content : undefined,
    placeholderKey: typeof e.placeholderKey === 'string' ? e.placeholderKey : undefined,
    x: normalizePercent(e.x, 400, DEFAULT_ELEMENT_VALUES.x),
    y: normalizePercent(e.y, 300, DEFAULT_ELEMENT_VALUES.y),
    boxWidth: normalizePercent(e.boxWidth, 400, DEFAULT_ELEMENT_VALUES.boxWidth),
    boxHeight: normalizePercent(e.boxHeight, 300, DEFAULT_ELEMENT_VALUES.boxHeight),
    textAlign: e.textAlign === 'left' || e.textAlign === 'right' ? e.textAlign : 'center',
    fontSize: Number(e.fontSize) || DEFAULT_ELEMENT_VALUES.fontSize,
    color: (e.color as string) ?? DEFAULT_ELEMENT_VALUES.color,
  }
}

export type CertificateTemplateElementPayload = {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  x: number
  y: number
  boxWidth: number
  boxHeight: number
  textAlign: 'left' | 'center' | 'right'
  fontSize: number
  color: string
}

/** API body: no fontFamily — server renders with one embedded font. */
export function toCertificateTemplateElementsPayload(
  list: CertificateTemplateElement[],
): CertificateTemplateElementPayload[] {
  return list.map((el) => ({
    type: el.type,
    content: el.content,
    placeholderKey: el.placeholderKey,
    x: el.x,
    y: el.y,
    boxWidth: el.boxWidth,
    boxHeight: el.boxHeight,
    textAlign: el.textAlign,
    fontSize: el.fontSize,
    color: el.color,
  }))
}
