export const useErrorMessage = () => {
  const { t } = useI18n()

  const getErrorMessage = (error: any): string => {
    if (!error) return t('error.internal')

    if (typeof error === 'string') {
      return t(error)
    }

    if (error instanceof Error) {
      return getErrorMessage(error.message)
    }

    if (error.response?.data?.message) {
      return getErrorMessage(error.response.data.message)
    }

    return t('error.internal')
  }

  return {
    getErrorMessage,
  }
}
