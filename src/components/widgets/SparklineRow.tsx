import type { SparklineRowWidget } from '../../types/index.js'

interface Props { widget: SparklineRowWidget }

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span style={{ width: 60, display: 'inline-block' }} />
  const w = 60, h = 20
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const last = data[data.length - 1]
  const first = data[0]
  const color = last >= first ? 'var(--color-success)' : 'var(--color-danger)'

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function SparklineRow({ widget }: Props) {
  const { title, metrics } = widget

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
          {metrics.map((metric, i) => {
            const last = metric.trend[metric.trend.length - 1] ?? 0
            const prev = metric.trend[metric.trend.length - 2] ?? last
            const isPos = last >= prev
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{metric.label}</div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{metric.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MiniSparkline data={metric.trend} />
                  <span style={{ fontSize: 10, color: isPos ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {isPos ? '↑' : '↓'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
