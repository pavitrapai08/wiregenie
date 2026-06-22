import type { DataTableWidget } from '../../types/index.js'

interface Props { widget: DataTableWidget }

export function DataTable({ widget }: Props) {
  const { title, columns, rows } = widget

  return (
    <div className="widget-card">
      <div className="widget-card__title">{title}</div>
      <div className="widget-card__body" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }} role="table" aria-label={title}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    borderBottom: '1px solid var(--color-border)',
                    whiteSpace: 'nowrap',
                    background: 'var(--color-surface-2)',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: '5px 8px',
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
