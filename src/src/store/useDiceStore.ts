import { create } from 'zustand'
import type { DiceRoll, RollResult } from '../types/dice'

interface DiceStore {
  isOpen: boolean
  isRolling: boolean
  pendingRoll: DiceRoll | null
  lastResult: RollResult | null
  history: RollResult[]
  openRoll: (roll: DiceRoll) => void
  setResult: (result: RollResult) => void
  setRolling: (v: boolean) => void
  close: () => void
  clearHistory: () => void
}

export const useDiceStore = create<DiceStore>((set) => ({
  isOpen: false,
  isRolling: false,
  pendingRoll: null,
  lastResult: null,
  history: [],

  openRoll: (roll) => set({ isOpen: true, isRolling: true, pendingRoll: roll, lastResult: null }),

  setResult: (result) =>
    set((s) => ({
      isRolling: false,
      lastResult: result,
      history: [result, ...s.history].slice(0, 50),
    })),

  setRolling: (v) => set({ isRolling: v }),

  close: () => set({ isOpen: false, pendingRoll: null }),

  clearHistory: () => set({ history: [] }),
}))
