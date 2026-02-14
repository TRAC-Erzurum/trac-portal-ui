/**
 * Builds "Nasıl bağlanırım" tutorial title and content from infrastructure data.
 * Uses i18n templates with placeholders filled from the selected channel.
 */

export type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs'

export interface TutorialInfra {
  type: InfrastructureType
  name: string
  location?: string
  /** API may return number or string (decimal) */
  rxFrequency?: number | string
  txFrequency?: number | string
  offset?: string
  txCtcssTone?: number | string
  rxCtcssTone?: number | string
  txDcsCode?: string
  rxDcsCode?: string
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number | string
  aprsIsIgate?: boolean
  aprsIsDigipeater?: boolean
  aprsPath?: string
  aprsServer?: string
}

const NA = '—'

function fmtNum(v: number | string | undefined): string {
  if (v == null || v === '') return NA
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return NA
  return String(n)
}

function fmtStr(v: string | undefined): string {
  if (v == null || String(v).trim() === '') return NA
  return String(v).trim()
}

/** Build placeholder object for repeater tutorial from infra */
function repeaterVars(infra: TutorialInfra, t: (key: string) => string) {
  const hasCtcss =
    (infra.txCtcssTone != null && infra.txCtcssTone !== '') ||
    (infra.rxCtcssTone != null && infra.rxCtcssTone !== '')
  const hasDcs = !!(infra.txDcsCode && String(infra.txDcsCode).trim()) || !!(infra.rxDcsCode && String(infra.rxDcsCode).trim())
  const toneNote = hasCtcss ? 'CTCSS' : hasDcs ? 'DCS' : t('communicationChannels.toneTypes.none')
  return {
    name: infra.name || NA,
    txFrequency: fmtNum(infra.txFrequency),
    rxFrequency: fmtNum(infra.rxFrequency),
    offset: fmtStr(infra.offset),
    txTone: hasCtcss ? fmtNum(infra.txCtcssTone) : (infra.txDcsCode ? String(infra.txDcsCode).trim() : NA),
    rxTone: hasCtcss ? fmtNum(infra.rxCtcssTone) : (infra.rxDcsCode ? String(infra.rxDcsCode).trim() : NA),
    toneNote,
    location: fmtStr(infra.location),
  }
}

/** Build placeholder object for EchoLink tutorial from infra */
function echolinkVars(infra: TutorialInfra) {
  return {
    name: infra.name || NA,
    echolinkNode: fmtStr(infra.echolinkNode),
    echolinkName: fmtStr(infra.echolinkName),
    location: fmtStr(infra.location),
  }
}

/** Build placeholder object for APRS tutorial from infra */
function aprsVars(infra: TutorialInfra, t: (key: string) => string) {
  const parts: string[] = []
  if (infra.aprsIsIgate) parts.push(t('communicationChannels.aprsIgate'))
  if (infra.aprsIsDigipeater) parts.push(t('communicationChannels.aprsDigipeater'))
  const stationType = parts.length ? parts.join(', ') : NA
  return {
    name: infra.name || NA,
    aprsFrequency: fmtNum(infra.aprsFrequency),
    aprsStationType: stationType,
    aprsPath: fmtStr(infra.aprsPath),
    aprsServer: fmtStr(infra.aprsServer),
    location: fmtStr(infra.location),
  }
}

export type TFunction = (key: string) => string

/** Placeholder format [[key]] to avoid vue-i18n interpreting {key}. Replaces [[key]] with vars[key]. */
function interpolate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\[\\[${escapeRegExp(k)}\\]\\]`, 'g'), v),
    template
  )
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Snake-case counterpart of camelCase key (e.g. rxFrequency -> rx_frequency). */
function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/** Normalize raw API/reactive object to TutorialInfra. Reads camelCase and snake_case. */
function normalizeTutorialInfra(raw: unknown): TutorialInfra {
  const o = raw as Record<string, unknown>
  const get = (camelKey: string): string | number | boolean | undefined => {
    const v = o[camelKey] ?? o[toSnake(camelKey)]
    if (v === null || v === undefined) return undefined
    return v as string | number | boolean
  }
  return {
    type: (get('type') as TutorialInfra['type']) ?? 'vhf_uhf_repeater',
    name: typeof get('name') === 'string' ? (get('name') as string) : '',
    location: get('location') as string | undefined,
    rxFrequency: get('rxFrequency') as number | string | undefined,
    txFrequency: get('txFrequency') as number | string | undefined,
    offset: get('offset') as string | undefined,
    txCtcssTone: get('txCtcssTone') as number | string | undefined,
    rxCtcssTone: get('rxCtcssTone') as number | string | undefined,
    txDcsCode: get('txDcsCode') as string | undefined,
    rxDcsCode: get('rxDcsCode') as string | undefined,
    echolinkNode: get('echolinkNode') as string | undefined,
    echolinkName: get('echolinkName') as string | undefined,
    aprsFrequency: get('aprsFrequency') as number | string | undefined,
    aprsIsIgate: get('aprsIsIgate') as boolean | undefined,
    aprsIsDigipeater: get('aprsIsDigipeater') as boolean | undefined,
    aprsPath: get('aprsPath') as string | undefined,
    aprsServer: get('aprsServer') as string | undefined,
  }
}

/**
 * Returns { title, content } for the tutorial modal, with placeholders filled from infra.
 */
export function buildTutorialContent(
  infra: TutorialInfra | Record<string, unknown>,
  t: TFunction,
): { title: string; content: string } {
  const normalized = normalizeTutorialInfra(infra)
  const type = normalized.type
  const baseKey = `communicationChannels.tutorials.${type}`

  switch (type) {
    case 'vhf_uhf_repeater': {
      const vars = repeaterVars(normalized, t) as Record<string, string>
      const hasFreq =
        (normalized.txFrequency != null && normalized.txFrequency !== '') ||
        (normalized.rxFrequency != null && normalized.rxFrequency !== '')
      const hasOffset = !!(normalized.offset && String(normalized.offset).trim())
      const hasTone =
        (normalized.txCtcssTone != null && normalized.txCtcssTone !== '') ||
        (normalized.rxCtcssTone != null && normalized.rxCtcssTone !== '') ||
        !!(normalized.txDcsCode && String(normalized.txDcsCode).trim()) ||
        !!(normalized.rxDcsCode && String(normalized.rxDcsCode).trim())
      const parts: string[] = []
      if (hasFreq) parts.push(t(`${baseKey}.step1Body`))
      if (hasTone) parts.push(t(`${baseKey}.step2ToneBody`))
      if (hasOffset) parts.push(t(`${baseKey}.step3OffsetBody`))
      parts.push(t(`${baseKey}.step4TestBody`))
      const content = parts
        .map((body, i) => `${i + 1}. ${interpolate(body, vars)}`)
        .join('\n\n')
      return {
        title: interpolate(t(`${baseKey}.title`), vars) || normalized.name || '',
        content,
      }
    }
    case 'echolink': {
      const vars = echolinkVars(normalized) as Record<string, string>
      const hasNode = !!(normalized.echolinkNode && String(normalized.echolinkNode).trim())
      const hasName = !!(normalized.echolinkName && String(normalized.echolinkName).trim())
      if (hasNode && hasName) vars.connectHint = interpolate(t(`${baseKey}.connectHintNodeAndName`), { node: vars.echolinkNode ?? '', name: vars.echolinkName ?? '' })
      else if (hasNode) vars.connectHint = interpolate(t(`${baseKey}.connectHintNodeOnly`), { node: vars.echolinkNode ?? '' })
      else if (hasName) vars.connectHint = interpolate(t(`${baseKey}.connectHintNameOnly`), { name: vars.echolinkName ?? '' })
      else vars.connectHint = ''
      const parts: string[] = [t(`${baseKey}.step1Body`), t(`${baseKey}.step2Body`)]
      if (vars.connectHint) parts.push(t(`${baseKey}.step3ConnectBody`))
      parts.push(t(`${baseKey}.step4Body`))
      const content = parts
        .map((body, i) => `${i + 1}. ${interpolate(body, vars)}`)
        .join('\n\n')
      return {
        title: interpolate(t(`${baseKey}.title`), vars) || normalized.name || '',
        content,
      }
    }
    case 'aprs': {
      const vars = aprsVars(normalized, t) as Record<string, string>
      const hasFreq = normalized.aprsFrequency != null && normalized.aprsFrequency !== ''
      const hasPath = !!(normalized.aprsPath && String(normalized.aprsPath).trim())
      const parts: string[] = []
      if (hasFreq) parts.push(t(`${baseKey}.step1FreqBody`))
      if (normalized.aprsIsIgate) parts.push(t(`${baseKey}.step2IgateBody`))
      if (hasPath) parts.push(t(`${baseKey}.step3PathBody`))
      parts.push(t(`${baseKey}.step4Body`))
      const content = parts
        .map((body, i) => `${i + 1}. ${interpolate(body, vars)}`)
        .join('\n\n')
      return {
        title: interpolate(t(`${baseKey}.title`), vars) || normalized.name || '',
        content,
      }
    }
    default:
      return {
        title: normalized.name ?? '',
        content: '',
      }
  }
}
