export const NET_TYPES = [
  { value: 'analog', label: 'Analog' },
  { value: 'digital', label: 'Digital' },
  { value: 'hf', label: 'HF' },
  { value: 'echo-link', label: 'EchoLink' },
] as const

export const NET_MODES = [
  { value: 'fm', label: 'FM' },
  { value: 'am', label: 'AM' },
  { value: 'ssb', label: 'SSB' },
  { value: 'cw', label: 'CW' },
  { value: 'dmr', label: 'DMR' },
  { value: 'ft8', label: 'FT8' },
  { value: 'ft4', label: 'FT4' },
  { value: 'sstv', label: 'SSTV' },
  { value: 'usb', label: 'USB' },
  { value: 'lsb', label: 'LSB' },
  { value: 'rtty', label: 'RTTY' },
] as const

export const FREQUENCIES = [
  { value: '145.600000', label: 'RV48 - 145.600 MHz' },
  { value: '145.612500', label: 'RV49 - 145.612,5 MHz' },
  { value: '145.625000', label: 'RV50 - 145.625 MHz' },
  { value: '145.637500', label: 'RV51 - 145.637,5 MHz' },
  { value: '145.650000', label: 'RV52 - 145.650 MHz' },
  { value: '145.662500', label: 'RV53 - 145.662,5 MHz' },
  { value: '145.675000', label: 'RV54 - 145.675 MHz' },
  { value: '145.687500', label: 'RV55 - 145.687,5 MHz' },
  { value: '145.700000', label: 'RV56 - 145.700 MHz' },
  { value: '145.712500', label: 'RV57 - 145.712,5 MHz' },
  { value: '145.725000', label: 'RV58 - 145.725 MHz' },
  { value: '145.737500', label: 'RV59 - 145.737,5 MHz' },
  { value: '145.750000', label: 'RV60 - 145.750 MHz' },
  { value: '145.762500', label: 'RV61 - 145.762,5 MHz' },
  { value: '145.775000', label: 'RV62 - 145.775 MHz' },
  { value: '145.787500', label: 'RV63 - 145.787,5 MHz' },
  { value: '439.150000', label: 'RU732 - 439.150 MHz' },
  { value: '439.162500', label: 'RU733 - 439.162,5 MHz' },
  { value: '439.175000', label: 'RU734 - 439.175 MHz' },
  { value: '439.187500', label: 'RU735 - 439.187,5 MHz' },
  { value: '439.200000', label: 'RU736 - 439.200 MHz' },
  { value: '439.212500', label: 'RU737 - 439.212,5 MHz' },
  { value: '439.225000', label: 'RU738 - 439.225 MHz' },
  { value: '439.237500', label: 'RU739 - 439.237,5 MHz' },
  { value: '439.250000', label: 'RU740 - 439.250 MHz' },
  { value: '439.262500', label: 'RU741 - 439.262,5 MHz' },
  { value: '439.275000', label: 'RU742 - 439.275 MHz' },
  { value: '439.287500', label: 'RU743 - 439.287,5 MHz' },
  { value: '439.300000', label: 'RU744 - 439.300 MHz' },
  { value: '439.312500', label: 'RU745 - 439.312,5 MHz' },
  { value: '439.325000', label: 'RU746 - 439.325 MHz' },
  { value: '439.337500', label: 'RU747 - 439.337,5 MHz' },
  { value: '439.350000', label: 'RU748 - 439.350 MHz' },
  { value: '439.362500', label: 'RU749 - 439.362,5 MHz' },
  { value: '439.375000', label: 'RU750 - 439.375 MHz' },
  { value: '439.387500', label: 'RU751 - 439.387,5 MHz' },
  { value: '439.400000', label: 'RU752 - 439.400 MHz' },
  { value: '439.412500', label: 'RU753 - 439.412,5 MHz' },
  { value: '439.425000', label: 'RU754 - 439.425 MHz' },
] as const

export const DEFAULT_FREQUENCY = '439.425000'
export const DEFAULT_MODE = 'fm'
export const DEFAULT_TYPE = 'analog'

export const getFrequencyLabel = (value: string): string => {
  const freq = FREQUENCIES.find(f => f.value === value)
  return freq?.label || value
}

export const getFrequencyShort = (value: string): string => {
  const freq = FREQUENCIES.find(f => f.value === value)
  if (!freq) return value
  const parts = freq.label.split(' - ')
  return parts[1]?.replace(' MHz', '') || value
}
