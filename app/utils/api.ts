export const useApi = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const { $auth } = useNuxtApp()

  const defaultOptions = {
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const handleResponse = async (response: Response) => {
    console.debug('API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      isAuthCheck: response.url.includes('/auth/check'),
    })

    if (!response.ok) {
      console.debug('API error:', response.status, response.statusText)
      let errorMessage = response.statusText || 'Unknown error'

      if (response.status === 401) {
        console.debug('401, logging out')
        if (
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')
        ) {
          await $auth?.logout()
        }
        errorMessage = 'Unauthorized'
      }

      try {
        const json = await response.json()
        console.error('API error details:', json)

        if (json.message) {
          errorMessage = json.message
        }
      } catch (e) {
        console.error('Failed to parse error response:', e)
      }

      throw new Error(errorMessage)
    }

    try {
      const text = await response.text()
      if (!text) {
        console.debug('Empty response')
        return {}
      }

      console.debug('Response will be parsed as JSON')
      const parsedData = JSON.parse(text)

      if (response.url.includes('/auth/check')) {
        console.debug('Auth check response data:', parsedData)
      }

      return parsedData
    } catch (e) {
      console.error('Failed to parse response:', e)
      return {}
    }
  }

  return {
    get: async (endpoint: string, options?: { params?: Record<string, any> }) => {
      let url = `${baseUrl}${endpoint}`

      // Add query parameters if provided
      if (options?.params) {
        const searchParams = new URLSearchParams()
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString())
          }
        })
        const queryString = searchParams.toString()
        if (queryString) {
          url += `?${queryString}`
        }
      }

      console.debug('API GET Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
        })
        return handleResponse(response)
      } catch (error) {
        console.error('API GET Request failed:', error)
        throw error
      }
    },

    post: async (endpoint: string, data: Record<string, unknown>) => {
      const url = `${baseUrl}${endpoint}`
      console.debug('API POST Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
          method: 'POST',
          body: JSON.stringify(data),
        })

        return handleResponse(response)
      } catch (error) {
        console.error('API POST Request failed:', error)
        throw error
      }
    },

    put: async (endpoint: string, data: Record<string, unknown>) => {
      const url = `${baseUrl}${endpoint}`
      console.debug('API PUT Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
          method: 'PUT',
          body: JSON.stringify(data),
        })

        return handleResponse(response)
      } catch (error) {
        console.error('API PUT Request failed:', error)
        throw error
      }
    },

    patch: async (endpoint: string, data: Record<string, unknown>) => {
      const url = `${baseUrl}${endpoint}`
      console.debug('API PATCH Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
          method: 'PATCH',
          body: JSON.stringify(data),
        })

        return handleResponse(response)
      } catch (error) {
        console.error('API PATCH Request failed:', error)
        throw error
      }
    },

    upload: async (endpoint: string, formData: FormData) => {
      const url = `${baseUrl}${endpoint}`
      console.debug('API UPLOAD Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
          method: 'POST',
          headers: {},
          body: formData,
        })

        return handleResponse(response)
      } catch (error) {
        console.error('API UPLOAD Request failed:', error)
        throw error
      }
    },

    delete: async (endpoint: string) => {
      const url = `${baseUrl}${endpoint}`
      console.debug('API DELETE Request:', url)
      try {
        const response = await fetch(url, {
          ...defaultOptions,
          method: 'DELETE',
        })

        return handleResponse(response)
      } catch (error) {
        console.error('API DELETE Request failed:', error)
        throw error
      }
    },
  }
}
