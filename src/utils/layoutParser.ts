import type { WireframeLayout } from '../types/index.js'

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

  // Strip markdown code fences — Claude sometimes wraps JSON in ```json ... ```
  private stripFences(raw: string): string {
    // Complete fence: ```json\n{...}\n```
    const complete = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)```\s*$/)
    if (complete) return complete[1].trim()

    // Opening fence only (stream not finished yet): ```json\n{...
    const opening = raw.match(/^```(?:json)?\s*\n?([\s\S]*)$/)
    if (opening) return opening[1].trim()

    return raw
  }

  private tryParse(strict = false): WireframeLayout | null {
    const raw = this.stripFences(this.buffer.trim())
    if (!raw) return null

    // Try exact parse first
    try {
      const parsed = JSON.parse(raw) as WireframeLayout
      if (isValidLayout(parsed)) return parsed
    } catch {
      if (strict) return null
    }

    if (strict) return null

    // Heuristic: close incomplete JSON to get a partial layout for progressive rendering
    const closingAttempts = [']}', ']}]', ']}]}', ']}]}]', '}']
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
