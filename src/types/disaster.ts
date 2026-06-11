export type DisasterType = 'EARTHQUAKE_DRILL'

export type DisasterRole = 'ADMIN' | 'FIELD_OFFICER'

export type DisasterMembershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ObservationFeedbackType = 'SUPPORT' | 'CONTRADICT'

export type ObservationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ObservationType =
  | 'COLLAPSED_BUILDING'
  | 'DAMAGED_BUILDING'
  | 'ROAD_BLOCKED'
  | 'INFRASTRUCTURE_FAILURE'
  | 'ASSEMBLY_AREA'
  | 'MEDICAL_POINT'
  | 'OTHER'
  | 'FIRE'
  | 'FIRE_EXTINGUISHED'
  | 'GAS_LEAK'
  | 'GAS_LEAK_RESOLVED'
  | 'ELECTRICAL_HAZARD'
  | 'POWER_ISOLATED'
  | 'INJURED'
  | 'INJURED_EVACUATED'
  | 'DECEASED'
  | 'RESCUE_REQUIRED'
  | 'RESCUE_COMPLETED'
  | 'RESOURCE_NEED'
  | 'RESOURCE_DISPATCHED'
  | 'RESOURCE_DELIVERED'
  | 'RESOURCE_FULFILLED'
  | 'DEBRIS_REMOVED'
  | 'STRUCTURE_SECURED'
  | 'ROAD_OPENED'
  | 'SERVICE_RESTORED'

export interface DisasterMetadata {
  magnitude?: number
  epicenter?: string
  epicenterLat?: number
  epicenterLng?: number
  affectedCities?: string[]
}

export interface DisasterSeverityCounts {
  LOW: number
  MEDIUM: number
  HIGH: number
  CRITICAL: number
}

export interface DisasterStats {
  observationCount: number
  rootCount: number
  conflictingCount: number
  severityCounts: DisasterSeverityCounts
  lastObservationAt: string | null
}

export interface Disaster {
  id: string
  name: string
  type: DisasterType
  metadata: DisasterMetadata | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string[]
  stats?: DisasterStats
}

export type DisasterWithStats = Disaster & { stats: DisasterStats }

export interface DisasterListResponse {
  data: Disaster[]
  total: number
  limit: number
  offset: number
}

export interface DisasterMembershipUser {
  id: string
  email: string
  fullName?: string
  callSign?: string
}

export interface DisasterMembership {
  id: string
  disasterId: string
  userId: string
  role: DisasterRole
  status: DisasterMembershipStatus
  processedBy: string | null
  processedAt: string | null
  createdAt: string
  user?: DisasterMembershipUser
}

export interface ObservationPhoto {
  id: string
  observationId: string
  filePath: string
  sortOrder: number
  createdAt: string
}

export interface Observation {
  id: string
  disasterId: string
  parentObservationId: string | null
  type: ObservationType
  lat: number
  lng: number
  locationLabel: string | null
  severity: ObservationSeverity | null
  description: string | null
  eventTime: string
  confidenceScore: number
  supportCount: number
  contradictCount: number
  createdByUserId: string
  createdBy?: string
  reporterCallSign?: string | null
  reporterEmail?: string | null
  createdAt: string
  updatedAt: string
  children?: Observation[]
  photos?: ObservationPhoto[]
}

export interface RankedObservation extends Observation {
  rankingScore: number
  conflicting: boolean
}

export interface ObservationFeedback {
  id: string
  observationId: string
  userId: string
  type: ObservationFeedbackType
  createdAt: string
  updatedAt: string
}
