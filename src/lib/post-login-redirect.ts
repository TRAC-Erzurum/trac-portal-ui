const STORAGE_KEY = 'postLoginRedirect'

/** Only same-app paths; `//host` and absolute URLs would be an open redirect. */
export function isInternalPath(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}

/**
 * Google sign-in leaves the SPA and the API sends the user back to `/`, which
 * drops the `redirect` query. Keep it for the tab so the flow can resume.
 */
export function rememberPostLoginRedirect(path: unknown): void {
  try {
    if (isInternalPath(path)) sessionStorage.setItem(STORAGE_KEY, path)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: the user lands on the dashboard as before.
  }
}

export function takePostLoginRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    return isInternalPath(path) ? path : null
  } catch {
    return null
  }
}
