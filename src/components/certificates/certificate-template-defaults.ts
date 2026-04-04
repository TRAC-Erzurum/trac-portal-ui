export interface CertificateTemplateElement {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  /** Yatay konum, 0–100 (şablon genişliğinin yüzdesi) */
  x: number
  /** Dikey konum, 0–100 (şablon yüksekliğinin yüzdesi) */
  y: number
  fontSize: number
  color: string
}

/** Browser preview only; PDF uses embedded Noto Sans on the server. */
export const CERTIFICATE_PREVIEW_FONT_FAMILY = '"Noto Sans", sans-serif'

/** Referans yükseklik: fontSize bu yükseğe göre (px); PDF/kart ölçeklenir */
export const REFERENCE_HEIGHT = 300

/** Varsayılan sertifika seri no öğesi: sağ altta, küçük punto, silinemez, düzenlenebilir (x,y %) */
export const DEFAULT_SERIAL_ELEMENT: CertificateTemplateElement = {
  type: 'placeholder',
  placeholderKey: 'certificate_serial',
  x: 70,
  y: 95,
  fontSize: 10,
  color: '#666666',
}

export type CertificateTemplateElementPayload = {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  x: number
  y: number
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
    fontSize: el.fontSize,
    color: el.color,
  }))
}
