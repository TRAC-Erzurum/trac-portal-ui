export const useCardStyles = () => {
  const getIconColor = (index: number) => {
    const colors = ['primary', 'success', 'info', 'warning', 'error', 'secondary']
    return colors[index % colors.length]
  }

  return {
    getIconColor,
  }
}
