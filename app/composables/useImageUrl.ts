export const useImageUrl = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl

  const getImageUrl = (path: string) => {
    if (!path) return '/default-avatar.webp'

    if (path.startsWith('http')) return path

    if (process.env.NODE_ENV === 'development') {
      return `${baseUrl.replace('/api', '')}${path}`
    }

    return path
  }

  return {
    getImageUrl,
  }
}
