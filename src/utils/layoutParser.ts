import type { WireframeLayout, WireframeRow, WidgetDef } from '../types/index.js'

export class LayoutParser {
  private buffer = ''

  append(chunk: string): WireframeLayout | null {
    this.buffer += chunk
    return this.tryParse(false)
  }

  flush(): WireframeLayout | null {
    return this.tryParse(true)
  }

  reset(): void {
    this.buffer = ''
  }

  private extractJSON(raw: string): string {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1) return raw
    if (end === -1 || end < start) return raw.slice(start)
    return raw.slice(start, end + 1)
  }

  private tryParse(strict: boolean): WireframeLayout | null {
    const raw = this.extractJSON(this.buffer.trim())
    if (!raw || raw[0] !== '{') return null

    try {
      const parsed = JSON.parse(raw) as WireframeLayout
      if (isValidLayout(parsed)) return normalizeLayout(parsed)
      if (strict) return null
    } catch {
      // incomplete JSON — fall through
    }

    const closingAttempts = ['}', ']}', ']}]', ']}]}', ']}]}]', ']}]}]}']
    for (const closing of closingAttempts) {
      try {
        const partial = JSON.parse(raw + closing) as WireframeLayout
        if (isPartialLayout(partial)) return normalizeLayout(partial)
      } catch {
        // try next
      }
    }

    return null
  }
}

/**
 * Enforce the 2-column grid constraint at runtime.
 * If a row's colspans don't sum to 2, split or merge widgets so they do.
 *
 * Rules applied in order:
 *  1. Single widget with colspan ≠ 2 → force colspan 2
 *  2. Two widgets → force each to colspan 1
 *  3. Three+ widgets → chunk into pairs, each pair becomes colspan 1+1
 *     (any leftover single widget gets colspan 2)
 */
function normalizeLayout(layout: WireframeLayout): WireframeLayout {
  return {
    ...layout,
    rows: layout.rows.flatMap(normalizeRow),
  }
}

function normalizeRow(row: WireframeRow): WireframeRow[] {
  const widgets = row.widgets
  if (!widgets || widgets.length === 0) return [row]

  const colspanSum = widgets.reduce((s, w) => s + (w.colspan ?? 1), 0)

  // Already valid — nothing to do
  if (colspanSum === 2) return [row]

  // Single widget: must span full row
  if (widgets.length === 1) {
    return [{ ...row, widgets: [{ ...widgets[0], colspan: 2 }] }]
  }

  // Two widgets: force half each
  if (widgets.length === 2) {
    return [
      {
        ...row,
        widgets: widgets.map((w) => ({ ...w, colspan: 1 as const })),
      },
    ]
  }

  // 3+ widgets: chunk into pairs of colspan:1, last odd widget gets its own row at colspan:2
  const result: WireframeRow[] = []
  for (let i = 0; i < widgets.length; i += 2) {
    const pair = widgets.slice(i, i + 2) as WidgetDef[]
    if (pair.length === 2) {
      result.push({
        id: i === 0 ? row.id : `${row.id}-${i}`,
        widgets: pair.map((w) => ({ ...w, colspan: 1 as const })),
      })
    } else {
      // Leftover single widget
      result.push({
        id: `${row.id}-${i}`,
        widgets: [{ ...pair[0], colspan: 2 as const }],
      })
    }
  }
  return result
}

function isPartialLayout(obj: unknown): obj is WireframeLayout {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  return typeof o['title'] === 'string' && Array.isArray(o['rows'])
}

function isValidLayout(obj: unknown): obj is WireframeLayout {
  if (!isPartialLayout(obj)) return false
  const o = obj as WireframeLayout
  return o.rows.every(
    (row) => typeof row.id === 'string' && Array.isArray(row.widgets)
  )
}
