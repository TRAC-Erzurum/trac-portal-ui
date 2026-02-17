/** WGS84 koordinat (derece). */
export interface WGS84 {
  lat: number
  lng: number
}

/** [lat, lng] tuple (derece). */
export type LatLng = [number, number]

/** Geri uyumluluk: native sarmalayıcılar (native* aşağıda tanımlı). */
export function maidenheadToWGS84(loc: string): WGS84 {
  return nativeMaidenheadToWGS84(loc)
}
export function maidenheadToBoundingBox(loc: string): [LatLng, LatLng] {
  return nativeMaidenheadToBoundingBox(loc)
}
export function validateGridLocator(loc: string): boolean {
  return nativeValidateGridLocator(loc)
}

/** WGS84 → locator; uzunluk verilmezse 6 karakter (geri uyumluluk). */
export function WGS84ToMaidenhead(
  coord: WGS84,
  length?: MaidenheadLength
): string {
  return nativeWGS84ToMaidenhead(coord, length ?? 6)
}

/** Desteklenen locator uzunlukları: 2, 4, 6, 8, 10 (IARU standart + 5. çift). */
export const MAIDENHEAD_LENGTHS = [2, 4, 6, 8, 10] as const
export type MaidenheadLength = (typeof MAIDENHEAD_LENGTHS)[number]

/** Locator length in characters: 2, 4, 6, or 8 (Maidenhead pairs). */
const LOCATOR_LENGTHS = [2, 4, 6, 8] as const

// --- Native Maidenhead 2/4/6/8/10 (IARU + extended pair 5) ---
// Ref: https://en.wikipedia.org/wiki/Maidenhead_Locator_System
// Pair 1: A-R base 18 → 20° lon, 10° lat
// Pair 2: 0-9 base 10 → 2° lon, 1° lat
// Pair 3: A-X base 24 → 5' lon, 2.5' lat
// Pair 4: 0-9 base 10 → 30" lon, 15" lat
// Pair 5: A-X base 24 → 1.25" lon, 0.625" lat

function charToIdx18(c: string): number {
  const n = c.toUpperCase().charCodeAt(0) - 65
  return n >= 0 && n <= 17 ? n : -1
}
function charToIdx24(c: string): number {
  const n = c.toUpperCase().charCodeAt(0) - 65
  return n >= 0 && n <= 23 ? n : -1
}
function charToIdx10(c: string): number {
  const n = parseInt(c, 10)
  return n >= 0 && n <= 9 ? n : -1
}

/** Native: locator (2/4/6/8/10 char) → WGS84 merkez. */
export function nativeMaidenheadToWGS84(loc: string): WGS84 {
  const s = (loc || '').trim().toUpperCase()
  if (s.length < 2 || s.length % 2 !== 0) throw new Error('Invalid locator length')
  let lonLow = 0,
    latLow = 0
  let lonSize = 360,
    latSize = 180
  let i = 0
  if (i < s.length) {
    const iLon = charToIdx18(s[i++] ?? ''),
      iLat = charToIdx18(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 1')
    lonLow += iLon * 20
    latLow += iLat * 10
    lonSize = 20
    latSize = 10
  }
  if (i < s.length) {
    const iLon = charToIdx10(s[i++] ?? ''),
      iLat = charToIdx10(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 2')
    lonLow += iLon * 2
    latLow += iLat * 1
    lonSize = 2
    latSize = 1
  }
  if (i < s.length) {
    const iLon = charToIdx24(s[i++] ?? ''),
      iLat = charToIdx24(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 3')
    lonLow += (iLon * 2) / 24
    latLow += (iLat * 1) / 24
    lonSize = 2 / 24
    latSize = 1 / 24
  }
  if (i < s.length) {
    const iLon = charToIdx10(s[i++] ?? ''),
      iLat = charToIdx10(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 4')
    lonLow += (iLon * 2) / 24 / 10
    latLow += (iLat * 1) / 24 / 10
    lonSize = 2 / 24 / 10
    latSize = 1 / 24 / 10
  }
  if (i < s.length) {
    const iLon = charToIdx24(s[i++] ?? ''),
      iLat = charToIdx24(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 5')
    lonLow += (iLon * 2) / 24 / 10 / 24
    latLow += (iLat * 1) / 24 / 10 / 24
    lonSize = 2 / 24 / 10 / 24
    latSize = 1 / 24 / 10 / 24
  }
  const lat = latLow + latSize / 2 - 90
  const lng = lonLow + lonSize / 2 - 180
  return { lat, lng }
}

/** Native: locator (2/4/6/8/10 char) → bbox [[south,west], [north,east]] derece. */
export function nativeMaidenheadToBoundingBox(loc: string): [LatLng, LatLng] {
  const s = (loc || '').trim().toUpperCase()
  if (s.length < 2 || s.length % 2 !== 0) throw new Error('Invalid locator length')
  let lonLow = 0,
    latLow = 0
  let lonSize = 360,
    latSize = 180
  let i = 0
  if (i < s.length) {
    const iLon = charToIdx18(s[i++] ?? ''),
      iLat = charToIdx18(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 1')
    lonLow += iLon * 20
    latLow += iLat * 10
    lonSize = 20
    latSize = 10
  }
  if (i < s.length) {
    const iLon = charToIdx10(s[i++] ?? ''),
      iLat = charToIdx10(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 2')
    lonLow += iLon * 2
    latLow += iLat * 1
    lonSize = 2
    latSize = 1
  }
  if (i < s.length) {
    const iLon = charToIdx24(s[i++] ?? ''),
      iLat = charToIdx24(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 3')
    lonLow += (iLon * 2) / 24
    latLow += (iLat * 1) / 24
    lonSize = 2 / 24
    latSize = 1 / 24
  }
  if (i < s.length) {
    const iLon = charToIdx10(s[i++] ?? ''),
      iLat = charToIdx10(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 4')
    lonLow += (iLon * 2) / 24 / 10
    latLow += (iLat * 1) / 24 / 10
    lonSize = 2 / 24 / 10
    latSize = 1 / 24 / 10
  }
  if (i < s.length) {
    const iLon = charToIdx24(s[i++] ?? ''),
      iLat = charToIdx24(s[i++] ?? '')
    if (iLon < 0 || iLat < 0) throw new Error('Invalid pair 5')
    lonLow += (iLon * 2) / 24 / 10 / 24
    latLow += (iLat * 1) / 24 / 10 / 24
    lonSize = 2 / 24 / 10 / 24
    latSize = 1 / 24 / 10 / 24
  }
  const south = latLow - 90
  const north = latLow + latSize - 90
  const west = lonLow - 180
  const east = lonLow + lonSize - 180
  return [
    [south, west],
    [north, east]
  ]
}

/** Native: WGS84 → locator (istenen uzunluk: 2,4,6,8,10). */
export function nativeWGS84ToMaidenhead(
  coord: WGS84,
  length: MaidenheadLength = 6
): string {
  let latN = coord.lat + 90
  let lngN = coord.lng + 180
  const out: string[] = []
  if (length >= 2) {
    const iLon = Math.floor(lngN / 20),
      iLat = Math.floor(latN / 10)
    out.push(String.fromCharCode(65 + iLon), String.fromCharCode(65 + iLat))
    lngN = lngN % 20
    latN = latN % 10
  }
  if (length >= 4) {
    const iLon = Math.floor(lngN / 2),
      iLat = Math.floor(latN / 1)
    out.push(String(iLon), String(iLat))
    lngN = lngN % 2
    latN = latN % 1
  }
  if (length >= 6) {
    const lngMin = lngN * 60,
      latMin = latN * 60
    const iLon = Math.floor(lngMin / 5),
      iLat = Math.floor(latMin / 2.5)
    out.push(String.fromCharCode(65 + iLon), String.fromCharCode(65 + iLat))
    lngN = (lngMin % 5) / 60
    latN = (latMin % 2.5) / 60
  }
  if (length >= 8) {
    const lngMin = lngN * 60,
      latMin = latN * 60
    const lngSec = lngMin * 60,
      latSec = latMin * 60
    const iLon = Math.floor(lngSec / 30),
      iLat = Math.floor(latSec / 15)
    out.push(String(iLon), String(iLat))
    lngN = (lngSec % 30) / 3600
    latN = (latSec % 15) / 3600
  }
  if (length >= 10) {
    const lngSec = lngN * 3600,
      latSec = latN * 3600
    const iLon = Math.floor(lngSec / 1.25),
      iLat = Math.floor(latSec / 0.625)
    out.push(String.fromCharCode(65 + iLon), String.fromCharCode(65 + iLat))
  }
  return out.join('').toUpperCase()
}

/** Native: 2/4/6/8/10 karakter locator format doğrulama (çiftler: A-R, 0-9, A-X). */
export function nativeValidateGridLocator(loc: string): boolean {
  const s = (loc || '').trim().toUpperCase()
  if (s.length < 2 || s.length > 10 || s.length % 2 !== 0) return false
  for (let i = 0; i < s.length; i += 2) {
    const pair = (i / 2 + 1) as 1 | 2 | 3 | 4 | 5
    const c1 = s[i] ?? '',
      c2 = s[i + 1] ?? ''
    if (pair === 1 || pair === 3 || pair === 5) {
      if (charToIdx24(c1) < 0 || charToIdx24(c2) < 0) return false
      if (pair === 1 && (charToIdx18(c1) < 0 || charToIdx18(c2) < 0)) return false
    } else {
      if (charToIdx10(c1) < 0 || charToIdx10(c2) < 0) return false
    }
  }
  try {
    nativeMaidenheadToWGS84(s)
    return true
  } catch {
    return false
  }
}

/**
 * Truncate a full locator to the length appropriate for the current zoom level.
 * Zoom < 6 → 2 chars; 6 ≤ zoom < 8 → 4; 8 ≤ zoom < 10 → 6; zoom ≥ 10 → 8.
 */
export function truncateLocatorByZoom(locator: string, zoom: number): string {
  if (!locator || locator.length < 2) return locator
  let len: 2 | 4 | 6 | 8 = 2
  if (zoom >= 10) len = 8
  else if (zoom >= 8) len = 6
  else if (zoom >= 6) len = 4
  const clamped = Math.min(len, locator.length)
  const validLen = (LOCATOR_LENGTHS.find(l => l >= clamped) ?? 8) as 2 | 4 | 6 | 8
  return locator.slice(0, Math.min(validLen, locator.length))
}

/** Precision (char count) from zoom: same thresholds as truncateLocatorByZoom. */
export function getGridPrecisionFromZoom(zoom: number): 2 | 4 | 6 | 8 {
  if (zoom >= 10) return 8
  if (zoom >= 8) return 6
  if (zoom >= 6) return 4
  return 2
}

/** Sample step (degrees) per precision so we hit each cell. */
const PRECISION_STEP: Record<2 | 4 | 6 | 8, { lat: number; lng: number }> = {
  2: { lat: 4, lng: 8 },
  4: { lat: 0.4, lng: 0.8 },
  6: { lat: 0.02, lng: 0.04 },
  8: { lat: 0.005, lng: 0.01 }
}

export interface BoundsLike {
  south: number
  west: number
  north: number
  east: number
}

/**
 * Return unique Maidenhead locators at given precision that intersect the bounds.
 * Used to draw grid overlay on the map.
 */
export function getGridLocatorsInBounds(
  bounds: BoundsLike,
  precision: 2 | 4 | 6 | 8
): string[] {
  const step = PRECISION_STEP[precision]
  const set = new Set<string>()
  for (let lat = bounds.south; lat <= bounds.north; lat += step.lat) {
    for (let lng = bounds.west; lng <= bounds.east; lng += step.lng) {
      const loc = nativeWGS84ToMaidenhead({ lat, lng }, precision)
      set.add(loc)
    }
  }
  return Array.from(set)
}

/** Format lat/lng as Degrees Minutes Seconds (e.g. 39°55′48″N 32°51′00″E). */
export function formatLatLngDMS(lat: number, lng: number): string {
  const fmt = (d: number, isLat: boolean) => {
    const abs = Math.abs(d)
    const deg = Math.floor(abs)
    const minF = (abs - deg) * 60
    const min = Math.floor(minF)
    const sec = ((minF - min) * 60).toFixed(1)
    const dir = isLat ? (d >= 0 ? 'N' : 'S') : (d >= 0 ? 'E' : 'W')
    return `${deg}°${min}′${sec}″${dir}`
  }
  return `${fmt(lat, true)} ${fmt(lng, false)}`
}

/** Approximate distance in km between two points (Haversine). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/** Approximate UTC offset from longitude (e.g. "UTC+3"). */
export function approximateUtcOffsetFromLng(lng: number): string {
  const offset = Math.round(lng / 15)
  return offset >= 0 ? `UTC+${offset}` : `UTC${offset}`
}

/** Turkey center (Ankara) for distance reference. */
export const TURKEY_CENTER_LAT = 39.93
export const TURKEY_CENTER_LNG = 32.85

/**
 * Build map URL for a locator (same origin). Use for links that open in new tab.
 */
export function getMapLocatorUrl(locator: string, baseUrl?: string): string {
  const loc = (locator || '').trim().toUpperCase()
  if (!loc) return baseUrl ? `${baseUrl}/map` : '/map'
  const path = `/map?locator=${encodeURIComponent(loc)}`
  return baseUrl ? `${baseUrl}${path}` : path
}

/** Locator karakter sayısına göre Leaflet zoom: uzun locator = yakın (yüksek zoom). */
export function getZoomForLocatorLength(length: MaidenheadLength): number {
  // Zoom = length + 2 (2→4, 4→6, 6→8, 8→10, 10→12)
  const zoomByLength: Record<MaidenheadLength, number> = {
    2: 4,
    4: 6,
    6: 8,
    8: 10,
    10: 12
  }
  return zoomByLength[length] ?? 8
}

/** Harita için denenecek uzunluklar (en uzundan kısaya; native 2–10 destekler). */
const MAP_LOCATOR_LENGTHS: readonly MaidenheadLength[] = [10, 8, 6, 4, 2]

/**
 * URL'den gelen locator'ı harita için parse et: 2/4/6/8/10 karaktere normalize edip
 * native algoritmayla dönüştürür. Çapraz doğrulama: geri locator önek eşleşmesi.
 */
export function parseLocatorForMap(
  loc: string
): { display: string; forConversion: string; wgs84: WGS84; bounds: [LatLng, LatLng] } | null {
  const raw = (loc || '').trim().toUpperCase()
  if (!raw || raw.length < 2) return null
  for (const len of MAP_LOCATOR_LENGTHS) {
    if (raw.length < len) continue
    const candidate = raw.slice(0, len)
    if (!nativeValidateGridLocator(candidate)) continue
    try {
      const wgs84 = nativeMaidenheadToWGS84(candidate)
      const bounds = nativeMaidenheadToBoundingBox(candidate)
      const back = nativeWGS84ToMaidenhead(wgs84, len)
      if (!back.startsWith(candidate)) continue
      return { display: raw, forConversion: candidate, wgs84, bounds }
    } catch {
      continue
    }
  }
  return null
}
