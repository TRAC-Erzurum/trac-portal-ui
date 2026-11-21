/**
 * Builds "Nasıl bağlanırım" tutorial title and content from communication channel data.
 * Each step is composed from the channel's actual values; a step whose data is missing is omitted.
 *
 * Frequencies and tones are stored from the repeater's point of view:
 * - txFrequency: the repeater transmits here, so the user listens.
 * - rxFrequency: the repeater receives here, so the user transmits.
 * - rxCtcssTone / rxDcs*: the repeater's input tone, i.e. the user's transmit (encode) tone.
 * - txCtcssTone / txDcs*: the repeater's output tone, i.e. the user's optional receive (decode) tone.
 * - offset: stored as rx - tx in kHz with a sign (e.g. "-600 kHz"), which is the user's radio shift.
 */

export type InfrastructureType = 'vhf_uhf_repeater' | 'echolink' | 'aprs'

export interface TutorialTalkgroup {
  talkgroupId?: number | string
  talkgroupName?: string
  timeslot?: number | string
  isStatic?: boolean
}

export interface TutorialInfra {
  type: InfrastructureType
  name: string
  location?: string
  /** API may return number or string (decimal) */
  rxFrequency?: number | string
  txFrequency?: number | string
  repeaterMode?: string
  offset?: string
  txCtcssTone?: number | string
  rxCtcssTone?: number | string
  txDcsCode?: string
  txDcsPolarity?: string
  rxDcsCode?: string
  rxDcsPolarity?: string
  dmrColorCode?: number | string
  dmrNetwork?: string
  dmrRepeaterId?: number | string
  talkgroups?: TutorialTalkgroup[]
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number | string
  aprsIsIgate?: boolean
  aprsIgateMode?: string
  aprsIsDigipeater?: boolean
  aprsDigipeaterType?: string
  aprsPath?: string
  aprsServer?: string
}

export type TFunction = (key: string) => string

const DMR_NETWORK_LABELS = new Map<string, string>([
  ['brandmeister', 'BrandMeister'],
  ['tgif', 'TGIF'],
  ['freedmr', 'FreeDMR'],
])

const VALUE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  // renderMarkdown turns "[text](url)" into a link (javascript: URLs possible), so markdown metacharacters are encoded too.
  '[': '&#91;',
  ']': '&#93;',
  '*': '&#42;',
  '`': '&#96;',
}

/** Parses a number from a number, a numeric string, or a string with a unit (e.g. "+600 kHz"). */
function parseNumber(v: unknown): number | undefined {
  if (v == null) return undefined
  const s = String(v).replace('−', '-').replace(/[^0-9.+-]/g, '')
  if (s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function trimmed(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

/** Frequency with 3 decimals, e.g. 145.7 -> "145.700". */
function fmtFreq(v: unknown): string | undefined {
  const n = parseNumber(v)
  return n === undefined ? undefined : n.toFixed(3)
}

/** CTCSS as "88.5 Hz", or DCS as "D023N" (polarity letter omitted when empty). */
function toneLabel(ctcss: unknown, dcsCode: unknown, dcsPolarity: unknown): string | undefined {
  const hz = parseNumber(ctcss)
  if (hz !== undefined) return `${hz.toFixed(1)} Hz`
  const code = trimmed(dcsCode)?.replace(/^D/i, '')
  if (!code) return undefined
  const polarity = trimmed(dcsPolarity)?.toUpperCase()
  return `D${code.padStart(3, '0')}${polarity === 'N' || polarity === 'I' ? polarity : ''}`
}

/** Radio shift from the stored offset ("+600 kHz" / "-600 kHz"), falling back to rx - tx. */
function shiftLabel(offset: unknown, rx: number | undefined, tx: number | undefined): string | undefined {
  let khz = parseNumber(offset)
  if (khz === undefined && rx !== undefined && tx !== undefined) {
    khz = Math.round((rx - tx) * 1000 * 10) / 10
  }
  if (khz === undefined) return undefined
  return `${khz < 0 ? '−' : '+'}${Math.abs(khz)} kHz`
}

function networkLabel(network: unknown, t: TFunction): string | undefined {
  const v = trimmed(network)
  if (!v) return undefined
  if (v === 'other') return t('common.other')
  return DMR_NETWORK_LABELS.get(v) ?? v
}

/** Entity-encodes a channel value for HTML and markdown output; line breaks become spaces. */
function escapeValue(v: string): string {
  return v.replace(/[\r\n]+/g, ' ').replace(/[&<>"[\]*`]/g, (c) => VALUE_ESCAPES[c])
}

/** Replaces [[key]] placeholders (avoids vue-i18n interpreting {key}). Values are escaped. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\[\[(\w+)\]\]/g, (_, key: string) => (key in vars ? escapeValue(vars[key]) : ''))
}

/** Snake-case counterpart of camelCase key (e.g. rxFrequency -> rx_frequency). */
function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/** Normalize raw API/reactive object to TutorialInfra. Reads camelCase and snake_case. */
function normalizeTutorialInfra(raw: unknown): TutorialInfra {
  const o = (raw ?? {}) as Record<string, unknown>
  const get = (camelKey: string): unknown => {
    const v = o[camelKey] ?? o[toSnake(camelKey)]
    return v === null ? undefined : v
  }
  return {
    type: (get('type') as TutorialInfra['type']) ?? 'vhf_uhf_repeater',
    name: typeof get('name') === 'string' ? (get('name') as string) : '',
    location: get('location') as string | undefined,
    rxFrequency: get('rxFrequency') as number | string | undefined,
    txFrequency: get('txFrequency') as number | string | undefined,
    repeaterMode: get('repeaterMode') as string | undefined,
    offset: get('offset') as string | undefined,
    txCtcssTone: get('txCtcssTone') as number | string | undefined,
    rxCtcssTone: get('rxCtcssTone') as number | string | undefined,
    txDcsCode: get('txDcsCode') as string | undefined,
    txDcsPolarity: get('txDcsPolarity') as string | undefined,
    rxDcsCode: get('rxDcsCode') as string | undefined,
    rxDcsPolarity: get('rxDcsPolarity') as string | undefined,
    dmrColorCode: get('dmrColorCode') as number | string | undefined,
    dmrNetwork: get('dmrNetwork') as string | undefined,
    dmrRepeaterId: get('dmrRepeaterId') as number | string | undefined,
    talkgroups: Array.isArray(get('talkgroups')) ? (get('talkgroups') as TutorialTalkgroup[]) : [],
    echolinkNode: get('echolinkNode') as string | undefined,
    echolinkName: get('echolinkName') as string | undefined,
    aprsFrequency: get('aprsFrequency') as number | string | undefined,
    aprsIsIgate: get('aprsIsIgate') as boolean | undefined,
    aprsIgateMode: get('aprsIgateMode') as string | undefined,
    aprsIsDigipeater: get('aprsIsDigipeater') as boolean | undefined,
    aprsDigipeaterType: get('aprsDigipeaterType') as string | undefined,
    aprsPath: get('aprsPath') as string | undefined,
    aprsServer: get('aprsServer') as string | undefined,
  }
}

function repeaterSteps(infra: TutorialInfra, t: TFunction): string[] {
  const base = 'communicationChannels.tutorials.vhf_uhf_repeater'
  const mode = trimmed(infra.repeaterMode) ?? ''
  const analog = mode === '' || mode === 'analog' || mode === 'mixed'
  const digital = mode === 'digital' || mode === 'mixed'
  const tx = parseNumber(infra.txFrequency)
  const rx = parseNumber(infra.rxFrequency)
  const steps: string[] = []

  if (tx !== undefined) {
    steps.push(interpolate(t(`${base}.listen`), { tx: tx.toFixed(3) }))
  }
  if (tx !== undefined && rx !== undefined && Math.abs(rx - tx) > 1e-9) {
    const shift = shiftLabel(infra.offset, rx, tx)
    if (shift) steps.push(interpolate(t(`${base}.transmitShift`), { rx: rx.toFixed(3), shift }))
  } else if (tx !== undefined || rx !== undefined) {
    steps.push(t(`${base}.simplex`))
  }

  if (analog) {
    const encode = toneLabel(infra.rxCtcssTone, infra.rxDcsCode, infra.rxDcsPolarity)
    steps.push(encode ? interpolate(t(`${base}.encodeTone`), { rxTone: encode }) : t(`${base}.noTone`))
    const decode = toneLabel(infra.txCtcssTone, infra.txDcsCode, infra.txDcsPolarity)
    if (decode) steps.push(interpolate(t(`${base}.decodeTone`), { txTone: decode }))
  }

  if (digital) {
    const dmrParts: string[] = []
    const cc = parseNumber(infra.dmrColorCode)
    if (cc !== undefined) dmrParts.push(interpolate(t(`${base}.dmrColorCode`), { cc: String(cc) }))
    const network = networkLabel(infra.dmrNetwork, t)
    if (network) dmrParts.push(interpolate(t(`${base}.dmrNetwork`), { network }))
    const id = parseNumber(infra.dmrRepeaterId)
    if (id !== undefined) dmrParts.push(interpolate(t(`${base}.dmrRepeaterId`), { id: String(id) }))
    if (dmrParts.length) steps.push(interpolate(t(`${base}.dmr`), { details: dmrParts.join(', ') }))

    for (const tg of infra.talkgroups ?? []) {
      const id = parseNumber(tg.talkgroupId)
      if (id === undefined) continue
      const name = trimmed(tg.talkgroupName)
      const slot = parseNumber(tg.timeslot)
      const kind =
        tg.isStatic === true ? t(`${base}.talkgroupStatic`) : tg.isStatic === false ? t(`${base}.talkgroupDynamic`) : ''
      steps.push(
        interpolate(t(`${base}.talkgroup`), {
          id: String(id),
          name: name ? ` ${name}` : '',
          timeslot: slot !== undefined ? String(slot) : '',
          kind: kind ? `, ${kind}` : '',
        }),
      )
    }
  }

  steps.push(t(`${base}.test`))
  return steps
}

function echolinkSteps(infra: TutorialInfra, t: TFunction): string[] {
  const base = 'communicationChannels.tutorials.echolink'
  const node = trimmed(infra.echolinkNode)
  const name = trimmed(infra.echolinkName)
  const steps: string[] = []
  if (node && name) steps.push(interpolate(t(`${base}.connectHintNodeAndName`), { node, name }))
  else if (node) steps.push(interpolate(t(`${base}.connectHintNodeOnly`), { node }))
  else if (name) steps.push(interpolate(t(`${base}.connectHintNameOnly`), { name }))
  steps.push(t(`${base}.step4Body`))
  return steps
}

function aprsSteps(infra: TutorialInfra, t: TFunction): string[] {
  const base = 'communicationChannels.tutorials.aprs'
  const steps: string[] = []

  const freq = fmtFreq(infra.aprsFrequency)
  if (freq) steps.push(interpolate(t(`${base}.step1FreqBody`), { freq }))

  const path = trimmed(infra.aprsPath)
  if (path) steps.push(interpolate(t(`${base}.step3PathBody`), { path }))

  const igateMode = trimmed(infra.aprsIgateMode)
  if (infra.aprsIsIgate && (igateMode === 'rx_only' || igateMode === 'tx_rx')) {
    const mode = t(`communicationChannels.aprsIgateModes.${igateMode}`)
    const server = trimmed(infra.aprsServer)
    let text = server
      ? interpolate(t(`${base}.igateStep`), { mode, server })
      : interpolate(t(`${base}.igateStepNoServer`), { mode })
    if (igateMode === 'rx_only') text += ` ${t(`${base}.igateRxOnlyNote`)}`
    steps.push(text)
  }

  const digiType = trimmed(infra.aprsDigipeaterType)
  if (infra.aprsIsDigipeater && (digiType === 'fill_in' || digiType === 'wide')) {
    const type = t(`communicationChannels.aprsDigipeaterTypes.${digiType}`)
    steps.push(interpolate(t(`${base}.digipeaterStep`), { type }))
  }

  steps.push(t(`${base}.step4Body`))
  return steps
}

/**
 * Returns { title, content } for the tutorial modal, with steps built from the channel data.
 */
export function buildTutorialContent(
  infra: TutorialInfra | Record<string, unknown>,
  t: TFunction,
): { title: string; content: string } {
  const normalized = normalizeTutorialInfra(infra)
  const baseKey = `communicationChannels.tutorials.${normalized.type}`

  let steps: string[]
  switch (normalized.type) {
    case 'vhf_uhf_repeater':
      steps = repeaterSteps(normalized, t)
      break
    case 'echolink':
      steps = echolinkSteps(normalized, t)
      break
    case 'aprs':
      steps = aprsSteps(normalized, t)
      break
    default:
      return { title: normalized.name ?? '', content: '' }
  }

  return {
    title: t(`${baseKey}.title`) || normalized.name || '',
    content: steps.map((step, i) => `${i + 1}. ${step}`).join('\n\n'),
  }
}
