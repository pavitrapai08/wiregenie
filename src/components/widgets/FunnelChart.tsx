import type { FunnelChartWidget } from '../../types/index.js'

interface Props { widget: FunnelChartWidget }

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function FunnelChart({ widget }: Props) {
  const { title, stages } = widget
  const maxVal = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map((stage, i) => {
          const pct = (stage.value / maxVal) * 100
          const convRate = i > 0 ? ((stage.value / stages[i - 1].value) * 100).toFixed(0) + '%' : ''
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', marginBottom: 2 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{stage.label}</span>
                  <span style={{ fontWeight: 600 }}>{stage.value.toLocaleString()}</span>
                </div>
                <div style={{ height: 24, borderRadius: 4, background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: COLORS[i % COLORS.length],
                      transition: 'width .3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: 6,
                      fontSize: 'var(--font-size-xs)',
                      color: '#fff',
                      fontWeight: 600,
                      overflow: 'hidden',
                    }}
                  >
                    {pct > 20 ? `${pct.toFixed(0)}%` : ''}
                  </div>
                </div>
              </div>
              {convRate && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', width: 32, textAlign: 'right' }}>
                  {convRate}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
