export const useTruncate = () => {
  const shouldShowTooltip = (text: string, element: HTMLElement) => {
    return element?.scrollWidth > element?.clientWidth
  }

  return {
    shouldShowTooltip,
  }
}
