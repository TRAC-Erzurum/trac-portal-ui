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
  counts: { waiting: number; delivered: number; failed: number }
}
