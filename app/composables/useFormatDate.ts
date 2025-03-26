export const useFormatDate = () => {
  const formatDate = (date: string | Date | null) => {
    return date
      ? new Date(date).toLocaleString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-'
  }

  const formatTime = (date: string | Date | null) => {
    return date
      ? new Date(date).toLocaleString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-'
  }

  const formatDuration = (startDate: string | Date, endDate: string | Date) => {
    if (!startDate || !endDate) return '-'

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffInMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    const days = Math.floor(diffInMinutes / (60 * 24))
    const hours = Math.floor((diffInMinutes % (60 * 24)) / 60)
    const minutes = diffInMinutes % 60

    let result = ''
    if (days > 0) result += `${days} gün `
    if (hours > 0) result += `${hours} saat `
    if (minutes > 0) result += `${minutes} dakika`

    return result.trim() || '0 dakika'
  }

  return {
    formatDate,
    formatTime,
    formatDuration,
  }
}
