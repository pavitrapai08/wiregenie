import type { KpiCardWidget } from '../../types/index.js'

interface Props { widget: KpiCardWidget }

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const w = 80, h = 28
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="chart-svg" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({ widget }: Props) {
  const { title, value, delta, deltaPositive, sparklineData } = widget
  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            {delta && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 'var(--font-size-sm)',
                  color: deltaPositive ? 'var(--color-success)' : 'var(--color-danger)',
                  fontWeight: 500,
                }}
              >
                {deltaPositive ? '↑' : '↓'} {delta}
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
      </div>
    </div>
  )
}
