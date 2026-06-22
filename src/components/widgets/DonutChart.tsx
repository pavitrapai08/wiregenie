import type { DonutChartWidget } from '../../types/index.js'

interface Props { widget: DonutChartWidget }

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']
const R = 50, STROKE_W = 18, CX = 80, CY = 80, SIZE = 160

export function DonutChart({ widget }: Props) {
  const { title, segments, centerLabel } = widget
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const circumference = 2 * Math.PI * R

  let cumulative = 0
  const arcs = segments.map((seg, i) => {
    const fraction = seg.value / total
    const dashArray = fraction * circumference
    const dashOffset = circumference - cumulative * circumference
    cumulative += fraction
    return { ...seg, dashArray, dashOffset, color: COLORS[i % COLORS.length] }
  })

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{ flexShrink: 0 }} role="img" aria-label={title}>
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE_W}
              strokeDasharray={`${arc.dashArray} ${circumference}`}
              strokeDashoffset={arc.dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          ))}
          {centerLabel && (
            <text x={CX} y={CY + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text)">
              {centerLabel}
            </text>
          )}
        </svg>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-xs)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>{seg.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{((seg.value / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
