export type FeedbackCategory = 'bug' | 'enhancement' | 'improvement' | 'question' | 'security'

export type FeedbackGithubStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/** A feedback record as returned by the super-admin feedback endpoints. */
export interface FeedbackRecord {
  id: string
  userId: string | null
  callSign: string | null
  category: FeedbackCategory
  summary: string
  body: string
  /** Logical upload paths, e.g. `uploads/feedback/<uuid>.png`. */
  attachmentPaths: string[]
  githubStatus: FeedbackGithubStatus
  githubIssueNumber: number | null
  githubIssueUrl: string | null
  githubError: string | null
  createdAt: string
}

export interface FeedbackListResponse {
  data: FeedbackRecord[]
  total: number
  limit: number
  offset: number
}

/** Response of `POST /feedback`. `issueUrl` is present only when the issue was created on that request. */
export interface FeedbackSubmitResponse {
  success: boolean
  id: string
  issueUrl?: string
}

export interface FeedbackForwardPendingResult {
  processed: number
  sent: number
  failed: number
}
