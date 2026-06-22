import { useSessionStore } from '../../store/useSessionStore.js'
import type { WidgetType } from '../../types/index.js'

interface Tile {
  type: WidgetType
  label: string
  icon: string
  description: string
}

const TILES: Tile[] = [
  { type: 'kpi_card',       label: 'KPI Card',       icon: '▣', description: 'Key metric with delta' },
  { type: 'line_chart',     label: 'Line Chart',     icon: '↗', description: 'Trend over time' },
  { type: 'bar_chart',      label: 'Bar Chart',      icon: '▐', description: 'Category comparison' },
  { type: 'horizontal_bar', label: 'Horizontal Bar', icon: '▬', description: 'Ranked list' },
  { type: 'donut_chart',    label: 'Donut Chart',    icon: '◎', description: 'Part-to-whole' },
  { type: 'funnel_chart',   label: 'Funnel',         icon: '▽', description: 'Conversion stages' },
  { type: 'scatter_plot',   label: 'Scatter Plot',   icon: '⁙', description: 'Correlation view' },
  { type: 'heatmap',        label: 'Heatmap',        icon: '▦', description: 'Matrix intensity' },
  { type: 'waterfall_chart',label: 'Waterfall',      icon: '⌇', description: 'Running totals' },
  { type: 'gauge_arc',      label: 'Gauge',          icon: '◑', description: 'Progress arc' },
  { type: 'data_table',     label: 'Data Table',     icon: '▤', description: 'Tabular data' },
  { type: 'sparkline_row',  label: 'Sparkline Row',  icon: '∿', description: 'Mini trend metrics' },
]

export function ComponentLibrary() {
  const { activeSessionId, sessions, appendWidget, generationStatus } = useSessionStore()

  const session = sessions.find((s) => s.id === activeSessionId)
  const hasLayout = !!session?.layout
  const isStreaming = generationStatus === 'streaming'

  function handleAppend(type: WidgetType) {
    if (!activeSessionId || !hasLayout || isStreaming) return
    appendWidget(activeSessionId, type)
  }

  return (
    <div className="component-library">
      {!hasLayout && (
        <p className="component-library__hint">
          Generate a wireframe first, then click a widget to append it.
        </p>
      )}
      <div className="library-grid">
        {TILES.map((tile) => (
          <button
            key={tile.type}
            className="library-tile"
            disabled={!hasLayout || isStreaming}
            onClick={() => handleAppend(tile.type)}
            title={tile.description}
            aria-label={`Append ${tile.label}`}
          >
            <span className="library-tile__icon">{tile.icon}</span>
            <span className="library-tile__label">{tile.label}</span>
            <span className="library-tile__desc">{tile.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
