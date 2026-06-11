import type { ObservationType } from '@/types/disaster'

export const ROOT_OBSERVATION_TYPES: ObservationType[] = [
  'COLLAPSED_BUILDING',
  'DAMAGED_BUILDING',
  'ROAD_BLOCKED',
  'INFRASTRUCTURE_FAILURE',
  'ASSEMBLY_AREA',
  'MEDICAL_POINT',
  'OTHER',
]

const BASE_OBSERVATION_HIERARCHY: Record<ObservationType, ObservationType[]> = {
  COLLAPSED_BUILDING: [
    'FIRE',
    'GAS_LEAK',
    'ELECTRICAL_HAZARD',
    'INJURED',
    'DECEASED',
    'RESCUE_REQUIRED',
    'RESOURCE_NEED',
    'DEBRIS_REMOVED',
    'STRUCTURE_SECURED',
  ],
  DAMAGED_BUILDING: [
    'FIRE',
    'GAS_LEAK',
    'ELECTRICAL_HAZARD',
    'INJURED',
    'RESOURCE_NEED',
    'STRUCTURE_SECURED',
  ],
  ROAD_BLOCKED: ['DEBRIS_REMOVED', 'ROAD_OPENED'],
  INFRASTRUCTURE_FAILURE: ['RESOURCE_NEED', 'SERVICE_RESTORED'],
  ASSEMBLY_AREA: ['RESOURCE_NEED', 'RESOURCE_DELIVERED', 'RESOURCE_FULFILLED'],
  MEDICAL_POINT: [
    'RESOURCE_NEED',
    'RESOURCE_DELIVERED',
    'RESOURCE_FULFILLED',
    'INJURED',
    'INJURED_EVACUATED',
  ],
  OTHER: [
    'FIRE',
    'GAS_LEAK',
    'ELECTRICAL_HAZARD',
    'INJURED',
    'RESOURCE_NEED',
    'RESCUE_REQUIRED',
  ],
  FIRE: [],
  FIRE_EXTINGUISHED: [],
  GAS_LEAK: [],
  GAS_LEAK_RESOLVED: [],
  ELECTRICAL_HAZARD: [],
  POWER_ISOLATED: [],
  INJURED: [],
  INJURED_EVACUATED: [],
  DECEASED: [],
  RESCUE_REQUIRED: [],
  RESCUE_COMPLETED: [],
  RESOURCE_NEED: [],
  RESOURCE_DISPATCHED: [],
  RESOURCE_DELIVERED: [],
  RESOURCE_FULFILLED: [],
  DEBRIS_REMOVED: [],
  STRUCTURE_SECURED: [],
  ROAD_OPENED: [],
  SERVICE_RESTORED: [],
}

const LIFECYCLE_FOLLOW_UPS: Array<{
  childType: ObservationType
  parentRoots: ObservationType[]
}> = [
  {
    childType: 'FIRE_EXTINGUISHED',
    parentRoots: ['COLLAPSED_BUILDING', 'DAMAGED_BUILDING', 'OTHER'],
  },
  {
    childType: 'GAS_LEAK_RESOLVED',
    parentRoots: ['COLLAPSED_BUILDING', 'DAMAGED_BUILDING', 'OTHER'],
  },
  {
    childType: 'POWER_ISOLATED',
    parentRoots: ['COLLAPSED_BUILDING', 'DAMAGED_BUILDING', 'OTHER'],
  },
  {
    childType: 'RESCUE_COMPLETED',
    parentRoots: ['COLLAPSED_BUILDING', 'OTHER'],
  },
  {
    childType: 'RESOURCE_DISPATCHED',
    parentRoots: [
      'COLLAPSED_BUILDING',
      'DAMAGED_BUILDING',
      'INFRASTRUCTURE_FAILURE',
      'ASSEMBLY_AREA',
      'MEDICAL_POINT',
      'OTHER',
    ],
  },
]

function buildObservationHierarchy(): Record<ObservationType, ObservationType[]> {
  const hierarchy: Record<ObservationType, ObservationType[]> = {
    ...BASE_OBSERVATION_HIERARCHY,
  }

  for (const root of ROOT_OBSERVATION_TYPES) {
    hierarchy[root] = [...(hierarchy[root] ?? [])]
  }

  for (const { childType, parentRoots } of LIFECYCLE_FOLLOW_UPS) {
    for (const root of parentRoots) {
      if (!hierarchy[root].includes(childType)) {
        hierarchy[root].push(childType)
      }
    }
  }

  return hierarchy
}

export const OBSERVATION_HIERARCHY = buildObservationHierarchy()

export function isRootType(type: ObservationType): boolean {
  return ROOT_OBSERVATION_TYPES.includes(type)
}

export function getAllowedChildTypes(rootType: ObservationType): ObservationType[] {
  return OBSERVATION_HIERARCHY[rootType] ?? []
}
