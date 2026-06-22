import type { WaterfallChartWidget } from '../../types/index.js'

interface Props { widget: WaterfallChartWidget }

const W = 400, H = 180, PAD_L = 12, PAD_B = 28, PAD_T = 8, PAD_R = 12

export function WaterfallChart({ widget }: Props) {
  const { title, items } = widget

  // Compute running totals
  let running = 0
  const computed = items.map((item) => {
    const start = item.isTotal ? 0 : running
    const end = item.isTotal ? item.value : running + item.value
    running = item.isTotal ? item.value : running + item.value
    return { ...item, start, end }
  })

  const allVals = computed.flatMap((c) => [c.start, c.end])
  const minV = Math.min(...allVals, 0)
  const maxV = Math.max(...allVals, 1)
  const range = maxV - minV || 1

  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const barW = Math.max(chartW / items.length - 4, 8)

  function yPos(v: number) {
    return PAD_T + chartH - ((v - minV) / range) * chartH
  }

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={title}>
          {/* Zero line */}
          <line x1={PAD_L} y1={yPos(0)} x2={W - PAD_R} y2={yPos(0)} stroke="var(--color-border-strong)" strokeWidth="1" />

          {computed.map((c, i) => {
            const x = PAD_L + i * (chartW / items.length) + (chartW / items.length - barW) / 2
            const y1 = yPos(Math.max(c.start, c.end))
            const y2 = yPos(Math.min(c.start, c.end))
            const barH = Math.max(Math.abs(y2 - y1), 2)
            const isPos = c.end >= c.start
            const color = c.isTotal
              ? 'var(--chart-1)'
              : isPos
              ? 'var(--color-success)'
              : 'var(--color-danger)'

            return (
              <g key={i}>
                <rect x={x} y={y1} width={barW} height={barH} fill={color} rx={2} opacity={0.85} />
                {/* Connector line to next bar */}
                {i < computed.length - 1 && !c.isTotal && (
                  <line
                    x1={x + barW}
                    y1={yPos(c.end)}
                    x2={x + barW + (chartW / items.length - barW)}
                    y2={yPos(c.end)}
                    stroke="var(--color-border)"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                )}
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--color-text-muted)">
                  {c.label.length > 5 ? c.label.slice(0, 5) + '…' : c.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
