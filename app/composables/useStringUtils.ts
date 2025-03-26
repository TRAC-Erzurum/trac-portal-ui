export const useStringUtils = () => {
  const normalizeString = (str: string) => {
    if (!str) return ''
    return str
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
  }

  const compareGlobal = (str1: string, str2: string) => {
    if (!str1 || !str2) return false
    return normalizeString(str1) === normalizeString(str2)
  }

  return {
    compareGlobal,
    normalizeString,
  }
}
