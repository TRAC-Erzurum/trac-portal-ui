export interface UtcBusiestCell {
  dayOfWeek: number
  hour: number
  count: number
}

export interface LocalBusiestCell {
  dayOfWeek: number
  hour: number
  count: number
}

const DAY_MINUTES = 24 * 60
const WEEK_MINUTES = 7 * DAY_MINUTES

function positiveModulo(value: number, base: number): number {
  return ((value % base) + base) % base
}

/**
 * Converts a UTC busiest-time bucket to browser local day/hour.
 */
export function utcCellToBrowserLocal(cell: UtcBusiestCell): LocalBusiestCell | null {
  const count = Number(cell.count)
  const utcDay = Number(cell.dayOfWeek)
  const utcHour = Number(cell.hour)

  if (!Number.isFinite(count)) return null
  if (!Number.isFinite(utcDay) || !Number.isFinite(utcHour)) return null

  const normalizedDay = positiveModulo(Math.trunc(utcDay), 7)
  const normalizedHour = positiveModulo(Math.trunc(utcHour), 24)
  const utcWeekMinute = normalizedDay * DAY_MINUTES + normalizedHour * 60
  const browserOffsetMinutes = -new Date().getTimezoneOffset()
  const localWeekMinute = positiveModulo(utcWeekMinute + browserOffsetMinutes, WEEK_MINUTES)

  return {
    dayOfWeek: Math.floor(localWeekMinute / DAY_MINUTES),
    hour: Math.floor((localWeekMinute % DAY_MINUTES) / 60),
    count,
  }
}
