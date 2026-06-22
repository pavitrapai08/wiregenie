import type { WireframeLayout } from '../types/index.js'

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

  // Extract the JSON object from the buffer, stripping any leading/trailing
  // text (markdown fences, commentary, etc.)
  private extractJSON(raw: string): string {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1) return raw
    if (end === -1 || end < start) return raw.slice(start) // truncated — return from first {
    return raw.slice(start, end + 1)
  }

  private tryParse(strict: boolean): WireframeLayout | null {
    const raw = this.extractJSON(this.buffer.trim())
    if (!raw || raw[0] !== '{') return null

    // Try exact parse first
    try {
      const parsed = JSON.parse(raw) as WireframeLayout
      if (isValidLayout(parsed)) return parsed
      // Parsed OK but missing required fields — not usable
      if (strict) return null
    } catch {
      // Not complete JSON yet — fall through to heuristic recovery
    }

    // Heuristic: close incomplete JSON to render partial layout progressively.
    // Also used in flush() as fallback when JSON was truncated by token limit.
    const closingAttempts = ['}', ']}', ']}]', ']}]}', ']}]}]', ']}]}]}']
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
