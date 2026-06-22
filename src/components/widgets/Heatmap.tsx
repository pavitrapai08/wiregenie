import type { HeatmapWidget } from '../../types/index.js'

interface Props { widget: HeatmapWidget }

export function Heatmap({ widget }: Props) {
  const { title, xLabels, yLabels, values } = widget

  const flatValues = values.flat()
  const minV = Math.min(...flatValues, 0)
  const maxV = Math.max(...flatValues, 1)
  const range = maxV - minV || 1

  function opacity(v: number): number {
    return 0.1 + ((v - minV) / range) * 0.9
  }

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ overflow: 'auto' }}>
        <div style={{ display: 'grid', gap: 2 }}>
          {/* X labels header */}
          <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${xLabels.length}, 1fr)`, gap: 2 }}>
            <div />
            {xLabels.map((l, i) => (
              <div key={i} style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.length > 4 ? l.slice(0, 4) : l}
              </div>
            ))}
          </div>

          {/* Rows */}
          {yLabels.map((yLabel, yi) => (
            <div key={yi} style={{ display: 'grid', gridTemplateColumns: `60px repeat(${xLabels.length}, 1fr)`, gap: 2 }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {yLabel}
              </div>
              {xLabels.map((_, xi) => {
                const v = values[yi]?.[xi] ?? 0
                return (
                  <div
                    key={xi}
                    title={`${yLabel} × ${xLabels[xi]}: ${v}`}
                    style={{
                      height: 18,
                      borderRadius: 2,
                      background: `var(--chart-1)`,
                      opacity: opacity(v),
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
