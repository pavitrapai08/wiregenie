import type { HorizontalBarWidget } from '../../types/index.js'

interface Props { widget: HorizontalBarWidget }

export function HorizontalBar({ widget }: Props) {
  const { title, rows } = widget
  const maxVal = Math.max(...rows.map((r) => r.max ?? r.value), 1)

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ gap: 8, display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, i) => {
          const effectiveMax = row.max ?? maxVal
          const pct = Math.min((row.value / effectiveMax) * 100, 100)
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{row.value.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 4,
                    background: `var(--chart-${(i % 6) + 1})`,
                    transition: 'width .3s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
