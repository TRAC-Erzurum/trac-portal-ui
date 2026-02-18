/**
 * Resolve scheduler name template and compute next occurrence date for display.
 * Mirrors backend NetSchedulerService logic (resolveNameTemplate, dateFallsInRecurrence).
 */

export interface SchedulerForResolve {
  name: string
  startDate: string
  endDate?: string | null
  recurrence: string
  scheduledTime?: string
  branch?: { name?: string } | null
  branchCallSign?: { callSign?: string } | null
  operator?: { callSign?: string; fullName?: string } | null
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Whether this scheduler should produce a net on dateStr (YYYY-MM-DD). */
export function dateFallsInRecurrence(
  scheduler: SchedulerForResolve,
  dateStr: string,
): boolean {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const start = scheduler.startDate
  if (dateStr < start) return false
  if (scheduler.endDate != null && dateStr > scheduler.endDate) return false

  switch (scheduler.recurrence) {
    case 'one_time':
      return dateStr === start
    case 'daily':
      return true
    case 'weekly': {
      const startDate = new Date(start + 'T12:00:00Z')
      const checkDate = new Date(dateStr + 'T12:00:00Z')
      return startDate.getDay() === checkDate.getDay()
    }
    case 'monthly': {
      const startDay = new Date(start + 'T12:00:00Z').getDate()
      const lastDay = getLastDayOfMonth(y, m)
      const targetDay = Math.min(startDay, lastDay)
      return d === targetDay
    }
    default:
      return false
  }
}

/** First occurrence date (YYYY-MM-DD) on or after afterDateStr. */
export function getNextOccurrenceDate(
  scheduler: SchedulerForResolve,
  afterDateStr?: string,
): string | null {
  const after = afterDateStr ?? new Date().toISOString().slice(0, 10)
  let current = new Date(after + 'T12:00:00Z')
  const maxIter = 400
  for (let i = 0; i < maxIter; i++) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    if (dateFallsInRecurrence(scheduler, dateStr)) return dateStr
    current.setDate(current.getDate() + 1)
  }
  return null
}

/** Resolve name template with placeholders for the given date. */
export function resolveSchedulerName(
  scheduler: SchedulerForResolve,
  dateStr: string,
  locale: string = 'tr',
): string {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const date = new Date(y, m - 1, d)
  const branchName = scheduler.branch?.name ?? ''
  const branchCallsign =
    scheduler.branchCallSign?.callSign ?? ''
  const operatorCallsign = scheduler.operator?.callSign ?? ''
  const operatorName = scheduler.operator?.fullName ?? ''
  const time =
    scheduler.scheduledTime?.slice(0, 5) ?? '20:00'
  const monthNamesTr = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ]
  const dayNamesTr = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
  ]
  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const dayNamesEn = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ]
  const monthNames = locale === 'en' ? monthNamesEn : monthNamesTr
  const dayNames = locale === 'en' ? dayNamesEn : dayNamesTr

  const dayPadded = String(d).padStart(2, '0')
  const monthName = monthNames[m - 1] ?? ''
  const dayOfWeek = dayNames[date.getDay()] ?? ''

  const map: Record<string, string> = {
    '{{branch_name}}': branchName,
    '{{branch_callsign}}': branchCallsign,
    '{{day}}': dayPadded,
    '{{month}}': monthName,
    '{{year}}': String(y),
    '{{day_of_week}}': dayOfWeek,
    '{{time}}': time,
    '{{operator_callsign}}': operatorCallsign,
    '{{operator_name}}': operatorName,
  }

  let out = scheduler.name
  for (const [key, value] of Object.entries(map)) {
    out = out.split(key).join(value)
  }
  return out.replace(/\{\{[^}]+\}\}/g, '').trim() || scheduler.name
}
