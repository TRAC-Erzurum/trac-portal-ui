/** Claim names the portal can release to a client application. */
export type OidcClaim = 'sub' | 'email' | 'email_verified' | 'name' | 'call_sign' | 'verified'

export type OidcConsentContext =
  | { consentRequired: true; clientName: string; claims: OidcClaim[] }
  | { consentRequired: false; redirectTo: string }

export interface OidcRedirect {
  redirectTo: string
}

export interface OidcClientItem {
  id: string
  clientId: string
  name: string
  redirectUris: string[]
  active: boolean
  createdAt: string
}

/** Create and rotate-secret responses: the only time the secret is visible. */
export interface OidcClientWithSecret {
  client: OidcClientItem
  clientSecret: string
}
