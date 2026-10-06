import type { ObservationType } from '@/types/disaster'

/** A disaster's sharing settings. The key is write-only and never part of it. */
export interface DisasterPublishing {
  /** `null` until the disaster has been given a recipient. */
  target: { name: string; intakeUrl: string } | null
  enabled: boolean
  counts: {
    delivered: number
    /** The part of `delivered` the recipient already held. */
    alreadyExisted: number
    failed: number
    /** Queued, not tried yet. */
    waiting: number
  }
  /** Observations the recipient has not been given yet. */
  notSent: number
}

export interface SaveDisasterPublishing {
  name: string
  intakeUrl: string
  /** Required the first time; left out afterwards to keep the current key. */
  sharedSecret?: string
  enabled: boolean
}

export type PublicationStatus = 'PENDING' | 'DELIVERED' | 'FAILED'

export interface PublicationHistoryItem {
  id: string
  observationId: string
  observationType: ObservationType | null
  observedAt: string
  description: string | null
  status: PublicationStatus
  alreadyExisted: boolean
  /** What the recipient answered, e.g. `409 {"error":"..."}` or `network: ECONNREFUSED`. */
  lastResult: string | null
  lastAttemptAt: string | null
}

export interface PublicationHistoryPage {
  items: PublicationHistoryItem[]
  total: number
  page: number
  limit: number
}

export interface DisasterPublishingSync extends DisasterPublishing {
  queued: number
  retried: number
}
