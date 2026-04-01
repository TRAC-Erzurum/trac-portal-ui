import MarkdownIt from 'markdown-it'

function createFeedbackMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  })
  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _e, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const tIndex = token.attrIndex('target')
    if (tIndex < 0) token.attrPush(['target', '_blank'])
    else token.attrs![tIndex][1] = '_blank'
    if (token.attrIndex('rel') < 0) {
      token.attrPush(['rel', 'noopener noreferrer'])
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }
  return md
}

let cached: MarkdownIt | null = null

export function getFeedbackMarkdownIt(): MarkdownIt {
  if (!cached) cached = createFeedbackMarkdownIt()
  return cached
}

export function renderFeedbackMarkdown(source: string): string {
  return getFeedbackMarkdownIt().render(source.trim() || '')
}
