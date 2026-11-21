import { ref, computed } from 'vue'
import { api } from '@/lib/api'

/**
 * Shared A→B measurement state for the QTH map.
 *
 * Module-level singleton: MapPage and every MapSearchPanel instance read and
 * write the same refs, so the points survive panel/sheet unmounts. Call
 * `resetMeasurement()` when the map page is left.
 */

export type MeasureLetter = 'A' | 'B'
export type MeasureTab = 'search' | 'measure'
/** Where a point selection was started: the panel (Select button) or the map popup ruler. */
export type SelectionOrigin = 'panel' | 'popup'

export interface MeasurePoint {
  lat: number
  lng: number
  label: string
  /** null when unknown (still loading, API error or non-numeric response) */
  elevation: number | null
  elevationLoading: boolean
}

const pointA = ref<MeasurePoint | null>(null)
const pointB = ref<MeasurePoint | null>(null)
const selectingPoint = ref<MeasureLetter | null>(null)
const selectionOrigin = ref<SelectionOrigin>('panel')
const panelTab = ref<MeasureTab>('search')

const elevationCache = new Map<string, number>()

const EARTH_RADIUS_M = 6371000

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

/** Bird's-eye distance in metres, or null until both points are set. */
const distanceM = computed<number | null>(() => {
  const a = pointA.value
  const b = pointB.value
  if (!a || !b) return null
  return haversineDistance(a.lat, a.lng, b.lat, b.lng)
})

/** B minus A in metres; null unless both elevations are known numbers. */
const elevationDiffM = computed<number | null>(() => {
  const a = pointA.value?.elevation
  const b = pointB.value?.elevation
  if (typeof a !== 'number' || typeof b !== 'number') return null
  return b - a
})

function pointRef(which: MeasureLetter) {
  return which === 'A' ? pointA : pointB
}

async function loadElevation(point: MeasurePoint) {
  const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
  const cached = elevationCache.get(key)
  if (cached !== undefined) {
    point.elevation = cached
    point.elevationLoading = false
    return
  }
  point.elevationLoading = true
  let value: number | null = null
  try {
    const data = await api.get<{ elevation: number | null }>(
      `/qth/elevation?lat=${encodeURIComponent(point.lat)}&lng=${encodeURIComponent(point.lng)}`,
    )
    const m = data?.elevation
    if (typeof m === 'number' && Number.isFinite(m)) {
      value = m
      elevationCache.set(key, m)
    }
  } catch {
    value = null
  }
  // The point may have been replaced or cleared while the request was in flight.
  if (pointA.value === point || pointB.value === point) {
    point.elevation = value
    point.elevationLoading = false
  }
}

/** Set point A or B from coordinates and fetch its elevation. Clears the selection mode for that point. */
function setPoint(which: MeasureLetter, lat: number, lng: number, label = '') {
  const point: MeasurePoint = {
    lat,
    lng,
    label: label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    elevation: null,
    elevationLoading: false,
  }
  pointRef(which).value = point
  if (selectingPoint.value === which) selectingPoint.value = null
  void loadElevation(point)
}

/** Enter "pick a point on the map" mode. */
function startSelecting(which: MeasureLetter, origin: SelectionOrigin = 'panel') {
  selectionOrigin.value = origin
  selectingPoint.value = which
}

function cancelSelecting() {
  selectingPoint.value = null
}

function clearPoint(which: MeasureLetter) {
  pointRef(which).value = null
  if (selectingPoint.value === which) selectingPoint.value = null
}

function clearMeasurement() {
  pointA.value = null
  pointB.value = null
  selectingPoint.value = null
}

/** Full reset, used when leaving the map page. */
function resetMeasurement() {
  clearMeasurement()
  panelTab.value = 'search'
  selectionOrigin.value = 'panel'
}

export function useMapMeasurement() {
  return {
    pointA,
    pointB,
    selectingPoint,
    selectionOrigin,
    panelTab,
    distanceM,
    elevationDiffM,
    setPoint,
    startSelecting,
    cancelSelecting,
    clearPoint,
    clearMeasurement,
    resetMeasurement,
  }
}
