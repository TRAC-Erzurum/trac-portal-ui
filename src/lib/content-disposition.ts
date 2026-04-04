/**
 * Parse filename from Content-Disposition (RFC 5987 filename* and quoted filename).
 */
export function getFilenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null
  const star = header.match(/filename\*=(?:UTF-8|'UTF-8')''([^;\s]+)/i)
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^["']|["']$/g, '')
    try {
      return decodeURIComponent(raw)
    } catch {
      // fall through
    }
  }
  const quoted = header.match(/filename="((?:\\.|[^"\\])*)"/i)
  if (quoted?.[1]) return quoted[1].replace(/\\"/g, '"')
  const plain = header.match(/filename=([^;\s]+)/i)
  if (plain?.[1]) return plain[1].trim().replace(/^["']|["']$/g, '')
  return null
}
