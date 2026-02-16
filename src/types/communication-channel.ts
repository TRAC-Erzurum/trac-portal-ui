export type CommunicationChannelType = 'vhf_uhf_repeater' | 'echolink' | 'aprs'

export interface Branch {
  id: string
  name: string
  city?: string
}

export interface CommunicationChannel {
  id: string
  branchId: string
  type: CommunicationChannelType
  isActive: boolean
  branch?: Branch
  description?: string
  location?: string
  district?: string
  latitude?: number
  longitude?: number
  altitude?: number
  coverage?: string
  repeaterMode?: string
  brand?: string
  rxFrequency?: number
  txFrequency?: number
  offset?: string
  txCtcssTone?: number
  rxCtcssTone?: number
  txDcsCode?: string
  txDcsPolarity?: string
  rxDcsCode?: string
  rxDcsPolarity?: string
  echolinkNode?: string
  echolinkName?: string
  aprsFrequency?: number
  aprsIsIgate?: boolean
  aprsIsDigipeater?: boolean
  aprsIgateMode?: string
  aprsDigipeaterType?: string
  aprsPath?: string
  aprsServer?: string
  hfFrequencyRange?: string
  hfMode?: string
  dmrColorCode?: number
  dmrNetwork?: string
  dmrRepeaterId?: number
  talkgroups?: Array<{
    talkgroupId: number
    talkgroupName?: string
    timeslot: number
    isStatic: boolean
  }>
}

export interface CommunicationChannelListResponse {
  data: CommunicationChannel[]
  total: number
}
