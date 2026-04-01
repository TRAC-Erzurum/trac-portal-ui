/** Line block containing cursor / selection (for list, quote, heading). */
export function getLineBlockBounds(text: string, selStart: number, selEnd: number) {
  const start = selStart < 0 ? 0 : selStart
  const end = selEnd < 0 ? 0 : selEnd
  const blockStart = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1
  let blockEnd = end
  const nl = text.indexOf('\n', end)
  blockEnd = nl === -1 ? text.length : nl
  return { blockStart, blockEnd }
}

export function insertWrap(
  text: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string,
): { next: string; focusStart: number; focusEnd: number } {
  const sel = text.slice(selStart, selEnd)
  const next = text.slice(0, selStart) + before + sel + after + text.slice(selEnd)
  if (sel.length === 0) {
    const pos = selStart + before.length
    return { next, focusStart: pos, focusEnd: pos }
  }
  const end = selStart + before.length + sel.length + after.length
  return { next, focusStart: end, focusEnd: end }
}

export function insertAtCursor(
  text: string,
  selStart: number,
  selEnd: number,
  chunk: string,
): { next: string; focusStart: number; focusEnd: number } {
  const next = text.slice(0, selStart) + chunk + text.slice(selEnd)
  const pos = selStart + chunk.length
  return { next, focusStart: pos, focusEnd: pos }
}

export function applyLineBlockTransform(
  text: string,
  selStart: number,
  selEnd: number,
  mapLines: (lines: string[]) => string[],
): { next: string; focusStart: number; focusEnd: number } {
  const { blockStart, blockEnd } = getLineBlockBounds(text, selStart, selEnd)
  const block = text.slice(blockStart, blockEnd)
  const lines = block.length ? block.split('\n') : ['']
  const newLines = mapLines(lines)
  const inner = newLines.join('\n')
  const next = text.slice(0, blockStart) + inner + text.slice(blockEnd)
  const focusEnd = blockStart + inner.length
  return { next, focusStart: blockStart, focusEnd }
}

export function bulletListLines(lines: string[]): string[] {
  return lines.map((line) => {
    const s = line.replace(/^\s*-\s+/, '').replace(/^\s*\d+\.\s+/, '')
    return `- ${s}`
  })
}

export function numberedListLines(lines: string[]): string[] {
  return lines.map((line, i) => {
    const s = line.replace(/^\s*-\s+/, '').replace(/^\s*\d+\.\s+/, '')
    return `${i + 1}. ${s}`
  })
}

export function quoteLines(lines: string[]): string[] {
  return lines.map((line) => {
    if (/^\s*>\s?/.test(line)) return line
    return `> ${line}`
  })
}

export function applyHeadingToFirstLine(
  text: string,
  selStart: number,
  selEnd: number,
): { next: string; focusStart: number; focusEnd: number } {
  const { blockStart, blockEnd } = getLineBlockBounds(text, selStart, selEnd)
  const block = text.slice(blockStart, blockEnd)
  const nl = block.indexOf('\n')
  const first = nl === -1 ? block : block.slice(0, nl)
  const rest = nl === -1 ? '' : block.slice(nl)
  const stripped = first.replace(/^#{1,6}\s+/, '')
  const newFirst = `## ${stripped}`
  const inner = newFirst + rest
  const next = text.slice(0, blockStart) + inner + text.slice(blockEnd)
  const focusEnd = blockStart + inner.length
  return { next, focusStart: blockStart, focusEnd }
}

export function insertLink(
  text: string,
  selStart: number,
  selEnd: number,
  placeholderText: string,
): { next: string; focusStart: number; focusEnd: number } {
  const sel = text.slice(selStart, selEnd)
  const raw = sel.trim() ? sel : placeholderText
  const label = (raw.replace(/\s+/g, ' ').trim() || placeholderText)
  const insert = `[${label}](https://)`
  const next = text.slice(0, selStart) + insert + text.slice(selEnd)
  const urlStart = selStart + label.length + 3
  return { next, focusStart: urlStart, focusEnd: urlStart + 8 }
}
