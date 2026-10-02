const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY?.trim()

export function withCartoApiKey(url: string): string {
  if (!CARTO_API_KEY) return url

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}key=${encodeURIComponent(CARTO_API_KEY)}`
}