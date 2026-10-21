export type InspectorItemType = 'feat' | 'spell' | 'buff' | 'condition' | 'weapon' | 'stat' | 'ability' | 'classAbility'

/**
 * A single item that can be inspected without leaving the current page.
 * Actions are optional quick affordances shown at the bottom of the drawer.
 */
export interface InspectorItem {
  type: InspectorItemType
  id: string
  title: string
  subtitle?: string
  description: string
  breakdown?: { label: string; value: number }[]
  notes?: string[]
  tags?: string[]
  meta?: { label: string; value: string | number }[]
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }[]
}
