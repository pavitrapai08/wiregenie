import type { LineChartWidget } from '../../types/index.js'

interface Props { widget: LineChartWidget }

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const W = 400, H = 180, PAD_L = 36, PAD_B = 28, PAD_T = 8, PAD_R = 8

export function LineChart({ widget }: Props) {
  const { title, xLabels, series } = widget

  const allValues = series.flatMap((s) => s.values)
  const minV = Math.min(...allValues, 0)
  const maxV = Math.max(...allValues, 1)
  const range = maxV - minV || 1

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  function xPos(i: number) {
    return PAD_L + (i / Math.max(xLabels.length - 1, 1)) * chartW
  }
  function yPos(v: number) {
    return PAD_T + chartH - ((v - minV) / range) * chartH
  }

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={title}>
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD_T + chartH - t * chartH
            const v = minV + t * range
            return (
              <g key={t}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--color-border)" strokeDasharray="3 3" />
                <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">
                  {Math.round(v)}
                </text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={i}
              x={xPos(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="9"
              fill="var(--color-text-muted)"
            >
              {label.length > 6 ? label.slice(0, 6) + '…' : label}
            </text>
          ))}

          {/* Series lines */}
          {series.map((s, si) => {
            const pts = s.values.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')
            return (
              <g key={si}>
                <polyline
                  points={pts}
                  fill="none"
                  stroke={COLORS[si % COLORS.length]}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.values.map((v, i) => (
                  <circle
                    key={i}
                    cx={xPos(i)}
                    cy={yPos(v)}
                    r={3}
                    fill={COLORS[si % COLORS.length]}
                  />
                ))}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        {series.length > 1 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {series.map((s, si) => (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                <span style={{ width: 12, height: 3, background: COLORS[si % COLORS.length], display: 'inline-block', borderRadius: 2 }} />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
