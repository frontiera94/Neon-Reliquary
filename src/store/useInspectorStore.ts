import { create } from 'zustand'
import type { InspectorItem } from '../types/inspector'

export interface InspectorStore {
  isOpen: boolean
  currentItem: InspectorItem | null
  openInspector: (item: InspectorItem) => void
  closeInspector: () => void
}

/**
 * Ephemeral UI store for the lateral inspector drawer.
 * Kept separate from character/session state so opening a rule reference never
 * mutates gameplay or triggers a persistence write.
 */
export const useInspectorStore = create<InspectorStore>((set) => ({
  isOpen: false,
  currentItem: null,
  openInspector: (item) => set({ isOpen: true, currentItem: item }),
  closeInspector: () => set({ isOpen: false, currentItem: null }),
}))
