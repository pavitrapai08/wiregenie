interface Props {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

const PILLS = [
  'Add KPI cards at the top',
  'Add a filter bar above the charts',
  'Simplify — fewer widgets, more focus',
  'Replace table with a bar chart',
  'Add a trend line chart for the main metric',
]

export function QuickPills({ onSelect, disabled }: Props) {
  return (
    <div className="quick-pills" role="list">
      {PILLS.map((pill) => (
        <button
          key={pill}
          role="listitem"
          className="quick-pill"
          disabled={disabled}
          onClick={() => onSelect(pill)}
          title={pill}
        >
          {pill}
        </button>
      ))}
    </div>
  )
}
