export interface CertificateTemplateElement {
  type: 'static' | 'placeholder'
  content?: string
  placeholderKey?: string
  /** Yatay konum, 0–100 (şablon genişliğinin yüzdesi) */
  x: number
  /** Dikey konum, 0–100 (şablon yüksekliğinin yüzdesi) */
  y: number
  fontFamily: string
  fontSize: number
  color: string
}

/** Referans yükseklik: fontSize bu yükseğe göre (px); PDF/kart ölçeklenir */
export const REFERENCE_HEIGHT = 300

/** Varsayılan sertifika seri no öğesi: sağ altta, küçük punto, silinemez, düzenlenebilir (x,y %) */
export const DEFAULT_SERIAL_ELEMENT: CertificateTemplateElement = {
  type: 'placeholder',
  placeholderKey: 'certificate_serial',
  x: 70,
  y: 95,
  fontFamily: 'Arial',
  fontSize: 10,
  color: '#666666',
}
