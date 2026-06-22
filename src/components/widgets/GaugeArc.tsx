import type { GaugeArcWidget } from '../../types/index.js'

interface Props { widget: GaugeArcWidget }

const CX = 100, CY = 90, R = 70, W = 200, H = 130, STROKE_W = 14

export function GaugeArc({ widget }: Props) {
  const { title, value, min = 0, max = 100, unit } = widget

  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  const endAngle = Math.PI - fraction * Math.PI

  function polarToXY(angle: number) {
    return {
      x: CX + R * Math.cos(angle),
      y: CY - R * Math.sin(angle),
    }
  }

  const start = polarToXY(Math.PI)
  const end = polarToXY(endAngle)
  const largeArc = fraction > 0.5 ? 1 : 0

  // Needle
  const needleAngle = Math.PI - fraction * Math.PI
  const needleTip = {
    x: CX + (R - STROKE_W - 4) * Math.cos(needleAngle),
    y: CY - (R - STROKE_W - 4) * Math.sin(needleAngle),
  }

  const color = fraction < 0.33
    ? 'var(--color-danger)'
    : fraction < 0.67
    ? 'var(--color-warning)'
    : 'var(--color-success)'

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${title}: ${value}${unit ?? ''}`}>
          {/* Background track */}
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--color-surface-2)"
            strokeWidth={STROKE_W}
            strokeLinecap="round"
          />

          {/* Value arc */}
          {fraction > 0 && (
            <path
              d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
            />
          )}

          {/* Needle */}
          <line x1={CX} y1={CY} x2={needleTip.x} y2={needleTip.y} stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={4} fill="var(--color-text)" />

          {/* Value text */}
          <text x={CX} y={CY + 22} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--color-text)">
            {value}{unit}
          </text>

          {/* Min/Max */}
          <text x={CX - R + 4} y={CY + 18} fontSize="9" fill="var(--color-text-muted)">{min}</text>
          <text x={CX + R - 4} y={CY + 18} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">{max}</text>
        </svg>
      </div>
    </div>
  )
}
