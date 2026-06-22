import type { ScatterPlotWidget } from '../../types/index.js'

interface Props { widget: ScatterPlotWidget }

const W = 380, H = 180, PAD = 32

export function ScatterPlot({ widget }: Props) {
  const { title, points, xLabel, yLabel } = widget

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1)
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 1)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const chartW = W - PAD * 2
  const chartH = H - PAD * 2

  function cx(x: number) { return PAD + ((x - minX) / rangeX) * chartW }
  function cy(y: number) { return PAD + chartH - ((y - minY) / rangeY) * chartH }

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label={title}>
          {/* Axes */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + chartH} stroke="var(--color-border)" strokeWidth="1" />
          <line x1={PAD} y1={PAD + chartH} x2={PAD + chartW} y2={PAD + chartH} stroke="var(--color-border)" strokeWidth="1" />

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line x1={PAD} y1={PAD + chartH - t * chartH} x2={PAD + chartW} y2={PAD + chartH - t * chartH} stroke="var(--color-border)" strokeDasharray="2 4" />
              <line x1={PAD + t * chartW} y1={PAD} x2={PAD + t * chartW} y2={PAD + chartH} stroke="var(--color-border)" strokeDasharray="2 4" />
            </g>
          ))}

          {/* Points */}
          {points.map((p, i) => (
            <circle key={i} cx={cx(p.x)} cy={cy(p.y)} r={4} fill="var(--chart-1)" opacity={0.8} />
          ))}

          {/* Axis labels */}
          {xLabel && (
            <text x={PAD + chartW / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">{xLabel}</text>
          )}
          {yLabel && (
            <text x={8} y={PAD + chartH / 2} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" transform={`rotate(-90 8 ${PAD + chartH / 2})`}>{yLabel}</text>
          )}
        </svg>
      </div>
    </div>
  )
}
