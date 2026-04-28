export type StatsScope = 'all' | 'my-branches' | 'branch'

export const defaultStatsScope: StatsScope = 'my-branches'

export function buildStatsQuery(
  scope: StatsScope,
  branchId?: string | null,
  extraParams: Record<string, string | number | boolean | null | undefined> = {},
) {
  const params = new URLSearchParams()

  if (scope === 'branch') {
    if (branchId) {
      params.set('branchId', branchId)
    }
  } else {
    params.set('branchFilter', scope)
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined || value === '') continue
    params.set(key, String(value))
  }

  return params.toString()
}