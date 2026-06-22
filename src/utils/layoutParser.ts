import type { WireframeLayout } from '../types/index.js'

/**
 * Incrementally parse a streaming JSON string into a WireframeLayout.
 * We attempt JSON.parse on each accumulated chunk. Once we get a valid
 * partial structure (at minimum { title, rows: [] }), we return it.
 * When the stream ends, we do a final strict parse.
 */
export class LayoutParser {
  private buffer = ''

  append(chunk: string): WireframeLayout | null {
    this.buffer += chunk
    return this.tryParse()
  }

  flush(): WireframeLayout | null {
    return this.tryParse(true)
  }

  reset(): void {
    this.buffer = ''
  }

  private tryParse(strict = false): WireframeLayout | null {
    const raw = this.buffer.trim()
    if (!raw) return null

    // Try exact parse first
    try {
      const parsed = JSON.parse(raw) as WireframeLayout
      if (isValidLayout(parsed)) return parsed
    } catch {
      if (strict) return null
    }

    if (strict) return null

    // Heuristic: try closing the JSON at various depths to get a partial layout
    // This lets us render progressively as rows stream in
    const closingAttempts = [']}', ']}]', ']}]}', ']}]}]']
    for (const closing of closingAttempts) {
      try {
        const partial = JSON.parse(raw + closing) as WireframeLayout
        if (isPartialLayout(partial)) return partial
      } catch {
        // try next
      }
    }

    return null
  }
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
