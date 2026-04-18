export type MapState = {
  id: string
  secret: string
  createdAt: number
  updatedAt: number
  background: { url: string; width: number; height: number } | null
  grid: { size: number }
  tokens: Token[]
  shapes: Shape[]
  labels: Label[]
  fog: FogMask
  initiative: { order: string[]; currentIndex: number; round: number }
}

export type Token = {
  id: string
  name: string
  color: string
  initial: string
  hp: { current: number; max: number }
  pos: { x: number; y: number }
  kind: 'pc' | 'enemy' | 'npc'
  initiative: number | null
}

export type Shape =
  | { id: string; kind: 'rect'; x: number; y: number; w: number; h: number; stroke: string; fill?: string }
  | { id: string; kind: 'circle'; cx: number; cy: number; r: number; stroke: string; fill?: string }
  | { id: string; kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string }

export type Label = { id: string; x: number; y: number; text: string; color: string }

export type FogMask = {
  cols: number
  rows: number
  cells: number[]
}

export type PublicMapState = Omit<MapState, 'secret'>
