import type { Component } from 'vue'
import {
  Ambulance,
  Bandage,
  Building,
  Building2,
  CheckCheck,
  CircleCheck,
  CircleHelp,
  Droplets,
  Flame,
  HeartPulse,
  LifeBuoy,
  Lock,
  Package,
  PackageCheck,
  Plug,
  PlugZap,
  Route,
  ShieldCheck,
  Shovel,
  TrafficCone,
  Truck,
  Users,
  UserX,
  Wind,
  Zap,
  ZapOff,
} from 'lucide-vue-next'
import { ROOT_OBSERVATION_TYPES } from '@/lib/observation-hierarchy'
import type { ObservationType } from '@/types/disaster'

export const OBSERVATION_TYPE_ICONS: Record<ObservationType, Component> = {
  COLLAPSED_BUILDING: Building2,
  DAMAGED_BUILDING: Building,
  ROAD_BLOCKED: TrafficCone,
  INFRASTRUCTURE_FAILURE: PlugZap,
  ASSEMBLY_AREA: Users,
  MEDICAL_POINT: HeartPulse,
  OTHER: CircleHelp,
  FIRE: Flame,
  FIRE_EXTINGUISHED: Droplets,
  GAS_LEAK: Wind,
  GAS_LEAK_RESOLVED: ShieldCheck,
  ELECTRICAL_HAZARD: Zap,
  POWER_ISOLATED: ZapOff,
  INJURED: Bandage,
  INJURED_EVACUATED: Ambulance,
  DECEASED: UserX,
  RESCUE_REQUIRED: LifeBuoy,
  RESCUE_COMPLETED: CircleCheck,
  RESOURCE_NEED: Package,
  RESOURCE_DISPATCHED: Truck,
  RESOURCE_DELIVERED: PackageCheck,
  RESOURCE_FULFILLED: CheckCheck,
  DEBRIS_REMOVED: Shovel,
  STRUCTURE_SECURED: Lock,
  ROAD_OPENED: Route,
  SERVICE_RESTORED: Plug,
}

export const ROOT_OBSERVATION_TYPE_ICONS = Object.fromEntries(
  ROOT_OBSERVATION_TYPES.map((type) => [type, OBSERVATION_TYPE_ICONS[type]]),
) as Record<(typeof ROOT_OBSERVATION_TYPES)[number], Component>

export function getObservationTypeIcon(type: ObservationType): Component {
  return OBSERVATION_TYPE_ICONS[type] ?? CircleHelp
}
