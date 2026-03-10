import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import { useCookieConsentStore } from '@/stores/cookieConsent'

interface CityData {
  name: string
  districts: { name: string }[]
}

const CACHE_KEY = 'qth_cities_cache'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheData {
  data: CityData[]
  timestamp: number
}

const citiesData = ref<CityData[]>([])
const isLoading = ref(false)
const isLoaded = ref(false)

function loadFromCache(): CityData[] | null {
  const cookieStore = useCookieConsentStore()
  if (!cookieStore.isAllAllowed) return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed: CacheData = JSON.parse(cached)
    if (!parsed?.data || !parsed?.timestamp) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return parsed.data
  } catch {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {}
    return null
  }
}

function saveToCache(data: CityData[]) {
  const cookieStore = useCookieConsentStore()
  if (!cookieStore.isAllAllowed) return
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch {
    // localStorage full or disabled - ignore
  }
}

export function useQthData() {
  const cities = computed(() => citiesData.value.map(c => c.name))

  const getDistricts = (cityName: string) => {
    const cityData = citiesData.value.find(c => c.name === cityName)
    return cityData?.districts.map(d => d.name) || []
  }

  const loadCities = async () => {
    if (isLoaded.value || isLoading.value) return

    const cached = loadFromCache()
    if (cached) {
      citiesData.value = cached
      isLoaded.value = true
      return
    }

    isLoading.value = true
    try {
      const data = await api.get<CityData[]>('/qth/countries/Türkiye/cities')
      citiesData.value = data
      saveToCache(data)
      isLoaded.value = true
    } catch {
      citiesData.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    cities,
    citiesData,
    getDistricts,
    isLoading,
    isLoaded,
    loadCities
  }
}
