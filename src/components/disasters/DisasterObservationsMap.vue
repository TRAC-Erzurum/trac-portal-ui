<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, ref, render, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import { LMap, LTileLayer } from '@vue-leaflet/vue-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster'
import { useThemeStore } from '@/stores/theme'
import { getObservationTypeIcon } from '@/lib/observation-icons'
import { ROOT_OBSERVATION_TYPES } from '@/lib/observation-hierarchy'
import type { ObservationType, RankedObservation } from '@/types/disaster'

const TURKEY_CENTER: [number, number] = [39.93, 32.85]
const MAP_ZOOM = 6

const TYPE_COLOR: Partial<Record<ObservationType, string>> = {
  COLLAPSED_BUILDING: '#dc2626',
  DAMAGED_BUILDING: '#ea580c',
  ROAD_BLOCKED: '#d97706',
  INFRASTRUCTURE_FAILURE: '#7c3aed',
  ASSEMBLY_AREA: '#16a34a',
  MEDICAL_POINT: '#2563eb',
  OTHER: '#6b7280',
}
const DEFAULT_COLOR = '#6b7280'

const props = withDefaults(
  defineProps<{
    observations: RankedObservation[]
    highlightedId?: string | null
    allowCreate?: boolean
  }>(),
  {
    highlightedId: null,
    allowCreate: false,
  },
)

const emit = defineEmits<{
  select: [id: string]
  createAt: [payload: { lat: number; lng: number; type: ObservationType }]
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

const mapRef = ref<{ leafletObject: L.Map } | null>(null)
let clusterGroup: L.LayerGroup | null = null
const markersById = new Map<string, L.Marker>()

function iconSvgHtml(type: ObservationType, color = '#ffffff'): string {
  const comp = getObservationTypeIcon(type)
  const container = document.createElement('div')
  render(h(comp, { size: 16, color, 'stroke-width': 2.5 }), container)
  const html = container.innerHTML
  render(null, container)
  return html
}

function buildIcon(type: ObservationType): L.DivIcon {
  const color = TYPE_COLOR[type] ?? DEFAULT_COLOR
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${iconSvgHtml(type)}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -17],
  })
}

function locationText(obs: RankedObservation): string {
  return obs.locationLabel ?? `${obs.lat.toFixed(4)}, ${obs.lng.toFixed(4)}`
}

function buildPopup(obs: RankedObservation): HTMLElement {
  const el = document.createElement('div')
  el.className = 'w-[190px]'

  const title = document.createElement('p')
  title.className = 'flex items-center gap-1.5 pr-5 text-sm font-semibold text-foreground'
  const titleIcon = document.createElement('span')
  titleIcon.className = 'text-muted-foreground shrink-0 inline-flex'
  titleIcon.innerHTML = iconSvgHtml(obs.type, 'currentColor')
  const titleText = document.createElement('span')
  titleText.textContent = t(`disaster.observationType.${obs.type}`)
  title.appendChild(titleIcon)
  title.appendChild(titleText)

  const loc = document.createElement('p')
  loc.className = 'mt-1 mb-3 text-xs text-muted-foreground'
  loc.textContent = locationText(obs)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = t('common.detail')
  btn.className =
    'w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors text-xs font-medium'
  btn.addEventListener('click', () => {
    emit('select', obs.id)
    mapRef.value?.leafletObject.closePopup()
  })

  el.appendChild(title)
  el.appendChild(loc)
  el.appendChild(btn)
  return el
}

function buildCreatePopup(latlng: L.LatLng): HTMLElement {
  const el = document.createElement('div')
  el.className = 'w-[260px] max-w-[80vw]'

  const title = document.createElement('p')
  title.className = 'mb-2 pr-5 text-sm font-semibold text-foreground'
  title.textContent = t('disaster.addHere')
  el.appendChild(title)

  const grid = document.createElement('div')
  grid.className = 'grid grid-cols-2 gap-2'

  for (const type of ROOT_OBSERVATION_TYPES) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className =
      'flex items-center gap-2 px-2.5 py-2 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors text-xs font-medium text-left'

    const iconSpan = document.createElement('span')
    iconSpan.className = 'text-muted-foreground shrink-0 inline-flex'
    iconSpan.innerHTML = iconSvgHtml(type, 'currentColor')

    const label = document.createElement('span')
    label.className = 'leading-tight'
    label.textContent = t(`disaster.observationType.${type}`)

    btn.appendChild(iconSpan)
    btn.appendChild(label)
    btn.addEventListener('click', () => {
      emit('createAt', { lat: latlng.lat, lng: latlng.lng, type })
      mapRef.value?.leafletObject.closePopup()
    })
    grid.appendChild(btn)
  }

  el.appendChild(grid)
  return el
}

function onMapClick(e: L.LeafletMouseEvent) {
  if (!props.allowCreate) return
  const map = mapRef.value?.leafletObject
  if (!map) return
  L.popup({ minWidth: 220, className: 'trac-map-popup' })
      .setLatLng(e.latlng)
    .setContent(buildCreatePopup(e.latlng))
    .openOn(map as unknown as L.Map)
}

const tileLayerUrl = computed(() => {
  const isDark = themeStore.effectiveTheme === 'dark'
  return isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
})

const tileLayerAttribution = computed(() =>
  themeStore.effectiveTheme === 'dark' ? '© OpenStreetMap © CARTO' : undefined,
)

const mapCenter = computed((): [number, number] => {
  if (props.observations.length === 0) return TURKEY_CENTER
  const lat = props.observations.reduce((s, o) => s + o.lat, 0) / props.observations.length
  const lng = props.observations.reduce((s, o) => s + o.lng, 0) / props.observations.length
  return [lat, lng]
})

function clearMarkers() {
  markersById.clear()
  if (clusterGroup && mapRef.value?.leafletObject) {
    mapRef.value.leafletObject.removeLayer(clusterGroup)
    clusterGroup = null
  }
}

function renderMarkers() {
  const map = mapRef.value?.leafletObject
  if (!map) return

  clearMarkers()
  if (props.observations.length === 0) return

  const markerClusterGroupFn = (
    L as typeof L & {
      markerClusterGroup?: (opts?: Record<string, unknown>) => L.LayerGroup
    }
  ).markerClusterGroup
  if (!markerClusterGroupFn) return
  clusterGroup = markerClusterGroupFn({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: (cluster: { getChildCount: () => number }) =>
      L.divIcon({
        className: '',
        html: `<div class="trac-cluster">${cluster.getChildCount()}</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      }),
  })
  for (const obs of props.observations) {
    const marker = L.marker([obs.lat, obs.lng], { icon: buildIcon(obs.type) })
    marker.bindPopup(buildPopup(obs), { closeButton: true, minWidth: 160, className: 'trac-map-popup' })
    markersById.set(obs.id, marker)
    clusterGroup.addLayer(marker)
  }
  map.addLayer(clusterGroup)

  if (props.observations.length === 1) {
    map.setView([props.observations[0]!.lat, props.observations[0]!.lng], 14)
  } else {
    const bounds = L.latLngBounds(props.observations.map(o => [o.lat, o.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
  }
}

function onMapReady() {
  const map = mapRef.value?.leafletObject
  if (map) map.on('click', onMapClick)
  renderMarkers()
}

function focusObservation(id: string) {
  const map = mapRef.value?.leafletObject
  const marker = markersById.get(id)
  if (!map || !marker) return

  const group = clusterGroup as (L.LayerGroup & {
    zoomToShowLayer?: (layer: L.Marker, callback: () => void) => void
  }) | null

  if (group?.zoomToShowLayer) {
    group.zoomToShowLayer(marker, () => marker.openPopup())
  } else {
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14))
    marker.openPopup()
  }
}

watch(() => props.observations, () => {
  nextTick(() => renderMarkers())
}, { deep: true })

watch(() => props.highlightedId, (id) => {
  if (!id) return
  nextTick(() => focusObservation(id))
})

onBeforeUnmount(() => {
  clearMarkers()
})

const mapOptions = {
  dragging: true,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  zoomControl: true,
}
</script>

<template>
  <div v-if="observations.length === 0 && !allowCreate" class="py-8 text-center rounded-lg border border-border/50">
    <p class="text-sm text-muted-foreground">{{ t('disaster.mapEmpty') }}</p>
  </div>
  <div v-else class="h-72 lg:h-[34rem] rounded-lg overflow-hidden border border-border/50">
    <LMap
      ref="mapRef"
      :use-global-leaflet="true"
      :center="mapCenter"
      :zoom="MAP_ZOOM"
      class="h-full w-full"
      :options="mapOptions"
      @ready="onMapReady"
    >
      <LTileLayer :url="tileLayerUrl" :attribution="tileLayerAttribution" />
    </LMap>
  </div>
</template>

<style>
/* Themed cluster bubble with a readable count */
.trac-cluster {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9999px;
  background: var(--primary);
  color: var(--primary-foreground);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}

/* Our popups: override the global Leaflet popup tweaks so they stay readable */
.trac-map-popup.leaflet-popup {
  opacity: 1 !important;
}

.trac-map-popup .leaflet-popup-content-wrapper {
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.trac-map-popup .leaflet-popup-content {
  margin: 14px 16px !important;
}

.trac-map-popup .leaflet-popup-tip {
  background: var(--popover);
  border: 1px solid var(--border);
}

.trac-map-popup a.leaflet-popup-close-button {
  display: block !important;
  color: var(--muted-foreground);
  padding: 8px 8px 0 0;
}
</style>
