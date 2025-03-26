export const useCallSignFormatter = () => {
  const parseCallSign = (originalCallSign: string) => {
    if (!originalCallSign) {
      return { prefix: '', callSign: '', suffix: '' }
    }

    const parts = originalCallSign.split('/')
    let prefix = ''
    let callSign = ''
    let suffix = ''

    if (parts.length === 1) {
      callSign = parts[0] || ''
    } else if (parts.length === 2) {
      if (parts[1]?.length === 1) {
        callSign = parts[0] || ''
        suffix = parts[1] || ''
      } else {
        prefix = parts[0] || ''
        callSign = parts[1] || ''
      }
    } else if (parts.length === 3) {
      prefix = parts[0] || ''
      callSign = parts[1] || ''
      suffix = parts[2] || ''
    }

    return { prefix, callSign, suffix }
  }

  const buildCallSign = (callSignParts: { prefix: string; callSign: string; suffix: string }) => {
    return [callSignParts.prefix, callSignParts.callSign, callSignParts.suffix]
      .filter(Boolean)
      .join('/')
  }

  return {
    parseCallSign,
    buildCallSign,
  }
}
