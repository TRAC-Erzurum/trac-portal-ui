import { computed, type Ref, type ComputedRef } from 'vue'

export const DEFAULT_AVATAR = import.meta.env.BASE_URL + 'default-avatar.png'

export function useAvatarUrl(picture: Ref<string | null | undefined> | ComputedRef<string | null | undefined>): ComputedRef<string> {
  return computed(() => {
    const pic = picture.value
    if (!pic) return DEFAULT_AVATAR
    if (pic.startsWith('http')) return pic
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    return `${baseUrl}${pic}`
  })
}

export function getAvatarUrl(picture?: string | null): string {
  if (!picture) return DEFAULT_AVATAR
  if (picture.startsWith('http')) return picture
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  return `${baseUrl}${picture}`
}
