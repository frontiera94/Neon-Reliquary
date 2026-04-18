export type MapTool = 'pointer' | 'rect' | 'circle' | 'line' | 'label' | 'ruler' | 'fog-hide' | 'fog-reveal'

interface ShapeToolbarProps {
  activeTool: MapTool
  onToolChange: (tool: MapTool) => void
}

const TOOLS: { tool: MapTool; icon: string; label: string }[] = [
  { tool: 'pointer', icon: '↖', label: 'Pointer' },
  { tool: 'rect', icon: '▭', label: 'Rectangle' },
  { tool: 'circle', icon: '○', label: 'Circle' },
  { tool: 'line', icon: '╱', label: 'Line' },
  { tool: 'label', icon: 'T', label: 'Label' },
  { tool: 'ruler', icon: '⟺', label: 'Ruler' },
  { tool: 'fog-hide', icon: '◼', label: 'Fog Hide' },
  { tool: 'fog-reveal', icon: '◻', label: 'Fog Reveal' },
]

export function ShapeToolbar({ activeTool, onToolChange }: ShapeToolbarProps) {
  return (
    <div className="flex flex-row bg-surface-container-highest">
      {TOOLS.map(({ tool, icon, label }) => (
        <button
          key={tool}
          title={label}
          onClick={() => onToolChange(tool)}
          className={
            'px-3 py-2 font-label text-sm transition-colors' +
            (activeTool === tool
              ? ' bg-primary/20 text-primary shadow-[0_0_12px_rgba(0,218,243,0.3)]'
              : ' text-tertiary hover:text-white hover:bg-surface-container')
          }
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
