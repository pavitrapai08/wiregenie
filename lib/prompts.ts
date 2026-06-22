// Edge Runtime safe — no Node/browser-only APIs
import type { ChatMessage } from '../src/types/index.js'

export const REFINEMENT_ADDENDUM = `
IMPORTANT — REFINEMENT MODE:
Return ONLY the rows that need to change. Use the exact same row IDs from the current layout for rows being updated.
For new rows, generate new unique IDs. Do NOT return rows that are unchanged.
Your response must be valid JSON in the shape: { "rows": [...] }
The client will merge your response into the existing layout by matching row.id.
`

const WIDGET_SCHEMA = `
Each widget object MUST have these fields:
  id: string (unique, e.g. "w1", "w2")
  type: one of [kpi_card, line_chart, bar_chart, horizontal_bar, donut_chart, funnel_chart, scatter_plot, heatmap, waterfall_chart, gauge_arc, data_table, sparkline_row]
  title: string
  colspan: 1 or 2  ← CRITICAL: each row's widgets colspan values MUST sum to EXACTLY 2

Per-type required fields:
  kpi_card:       value(string), delta?(string), deltaPositive?(boolean), sparklineData?(number[])
  line_chart:     xLabels(string[]), series([{name,values:number[]}])
  bar_chart:      labels(string[]), series([{name,values:number[]}]), stacked?(boolean)
  horizontal_bar: rows([{label,value,max?}])
  donut_chart:    segments([{label,value}]), centerLabel?(string)
  funnel_chart:   stages([{label,value}])
  scatter_plot:   points([{x,y,label?}]), xLabel?(string), yLabel?(string)
  heatmap:        xLabels(string[]), yLabels(string[]), values(number[][])
  waterfall_chart:items([{label,value,isTotal?}])
  gauge_arc:      value(number), min?(number), max?(number), unit?(string)
  data_table:     columns(string[]), rows((string|number)[][])
  sparkline_row:  metrics([{label,value:string,trend:number[]}])
`

export function buildSystemPrompt(isRefinement = false): string {
  const base = `CRITICAL OUTPUT RULE: Respond with ONLY raw JSON. No markdown code fences, no \`\`\`json, no explanation text before or after. Your entire response must be parseable by JSON.parse().

You are WireGenie, an expert wireframe layout designer.

Generate a dashboard wireframe layout as a JSON object. Example structure:
{
  "title": "Dashboard Title",
  "description": "Optional description",
  "rows": [
    {
      "id": "row-1",
      "widgets": [
        { "id": "w1", "type": "kpi_card", "title": "Revenue", "colspan": 1, "value": "$1.2M", "delta": "+12%", "deltaPositive": true },
        { "id": "w2", "type": "kpi_card", "title": "Users", "colspan": 1, "value": "24.5K", "delta": "+8%", "deltaPositive": true }
      ]
    }
  ]
}

GRID RULES — read carefully:
1. The grid is exactly 2 columns wide.
2. Every row's widgets must have colspan values that sum to EXACTLY 2.
   Valid combinations: [colspan:1, colspan:1] or [colspan:2] — nothing else is valid.
3. colspan: 2 means the widget fills the full row width.
4. colspan: 1 means the widget takes half the width (pair it with another colspan:1).

${WIDGET_SCHEMA}

GENERAL RULES:
- Use realistic placeholder data (numbers, labels) matching the business context.
- Aim for 4–8 rows for a typical dashboard.
- Choose widget types that best communicate the data story.
- Vary widget types; avoid putting the same type in consecutive rows.
- REMINDER: Output raw JSON only — no markdown fences, no commentary.`

  return isRefinement ? base + '\n' + REFINEMENT_ADDENDUM : base
}

const MAX_HISTORY_PAIRS = 8

export function trimChatHistory(history: ChatMessage[]): {
  trimmedHistory: ChatMessage[]
  summaryPrefix: string
} {
  const pairs: Array<[ChatMessage, ChatMessage]> = []
  let i = 0
  while (i + 1 < history.length) {
    if (history[i].role === 'user' && history[i + 1].role === 'assistant') {
      pairs.push([history[i], history[i + 1]])
      i += 2
    } else {
      i++
    }
  }

  if (pairs.length <= MAX_HISTORY_PAIRS) {
    return { trimmedHistory: history, summaryPrefix: '' }
  }

  const toSummarise = pairs.slice(0, pairs.length - MAX_HISTORY_PAIRS)
  const kept = pairs.slice(pairs.length - MAX_HISTORY_PAIRS)

  const bullets = toSummarise
    .map(([u, a]) => {
      const userSnip = u.content.slice(0, 120)
      const assistSnip = a.content.slice(0, 80)
      return `• User: "${userSnip}…" → AI: "${assistSnip}…"`
    })
    .join('\n')

  const summaryPrefix = `[Earlier conversation summary]\n${bullets}\n\n`
  const trimmedHistory = kept.flatMap(([u, a]) => [u, a])

  return { trimmedHistory, summaryPrefix }
}
