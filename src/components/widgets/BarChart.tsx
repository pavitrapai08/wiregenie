import type { BarChartWidget } from '../../types/index.js'

interface Props { widget: BarChartWidget }

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']
const W = 400, H = 180, PAD_L = 36, PAD_B = 28, PAD_T = 8, PAD_R = 8

export function BarChart({ widget }: Props) {
  const { title, labels, series, stacked } = widget

  const allValues = stacked
    ? labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
    : series.flatMap((s) => s.values)
  const maxV = Math.max(...allValues, 1)

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const groupW = chartW / Math.max(labels.length, 1)
  const barPad = 0.2
  const totalBarW = groupW * (1 - barPad)
  const singleBarW = stacked ? totalBarW : totalBarW / series.length

  function yPos(v: number) {
    return PAD_T + chartH - (v / maxV) * chartH
  }

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={title}>
          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD_T + chartH - t * chartH
            return (
              <line key={t} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--color-border)" strokeDasharray="3 3" />
            )
          })}

          {/* Y axis label */}
          <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">{Math.round(maxV)}</text>
          <text x={PAD_L - 4} y={PAD_T + chartH / 2 + 4} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">{Math.round(maxV / 2)}</text>

          {/* Bars */}
          {labels.map((label, li) => {
            const groupX = PAD_L + li * groupW + groupW * (barPad / 2)
            let stackY = PAD_T + chartH

            return (
              <g key={li}>
                {stacked
                  ? series.map((s, si) => {
                      const v = s.values[li] ?? 0
                      const barH = (v / maxV) * chartH
                      const y = stackY - barH
                      stackY -= barH
                      return (
                        <rect
                          key={si}
                          x={groupX}
                          y={y}
                          width={totalBarW}
                          height={Math.max(barH, 0)}
                          fill={COLORS[si % COLORS.length]}
                          rx={2}
                        />
                      )
                    })
                  : series.map((s, si) => {
                      const v = s.values[li] ?? 0
                      const barH = (v / maxV) * chartH
                      return (
                        <rect
                          key={si}
                          x={groupX + si * singleBarW}
                          y={yPos(v)}
                          width={Math.max(singleBarW - 1, 2)}
                          height={Math.max(barH, 0)}
                          fill={COLORS[si % COLORS.length]}
                          rx={2}
                        />
                      )
                    })}
                <text x={groupX + totalBarW / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
                  {label.length > 5 ? label.slice(0, 5) + '…' : label}
                </text>
              </g>
            )
          })}
        </svg>

        {series.length > 1 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {series.map((s, si) => (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                <span style={{ width: 10, height: 10, background: COLORS[si % COLORS.length], display: 'inline-block', borderRadius: 2 }} />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
