export interface Feat {
  id: string
  index: number
  name: string
  shortDesc: string
  fullDesc: string
  bonusValue?: number
  bonusMax?: number
  bonusLabel?: string
}

export interface ClassAbility {
  id: string
  name: string
  description: string
  isSignature?: boolean
}

export interface ResourceCounter {
  id: string
  name: string
  current: number
  max: number
}
