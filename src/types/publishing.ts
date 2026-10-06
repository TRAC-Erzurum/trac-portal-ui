import type { ObservationType } from '@/types/disaster'

/** A registered publish target. The shared secret is write-only and never returned. */
export interface PublishTargetItem {
  id: string
  name: string
  intakeUrl: string
  sourceId: string
  active: boolean
  /** The target refused authentication; its queue is held until its credentials change. */
  authFailing: boolean
  createdAt: string
  updatedAt: string
}

export interface DisasterPublishing {
  enabled: boolean
  target: { id: string; name: string; active: boolean; authFailing: boolean } | null
  availableTargets: { id: string; name: string }[]
  /** `alreadyExisted` is the part of `delivered` the recipient already held. */
  counts: { waiting: number; delivered: number; failed: number; alreadyExisted: number }
  /** Observations the recipient has not been given yet. */
  notSent: number
  /** Records refused for good, or still failing and being retried. */
  issues: PublicationIssue[]
}

export interface PublicationIssue {
  observationId: string
  observationType: ObservationType | null
  /** `FAILED`: refused for good. `PENDING`: tried and failed, will be retried. */
  status: 'FAILED' | 'PENDING'
  observedAt: string
  description: string | null
  lastResult: string | null
  attempts: number
  lastAttemptAt: string | null
}

export interface DisasterPublishingSync extends DisasterPublishing {
  queued: number
  retried: number
}
