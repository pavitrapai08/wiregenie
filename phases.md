# WireGenie — Phase-wise Implementation Plan

**Version:** 1.2 (fixes applied)
**Total timeline:** 18 weeks across 4 phases
**Stack:** React 18 + Vite · Vercel (Hobby tier supported) · Supabase · Anthropic claude-sonnet-4-6

---

## Phase gate rule

All acceptance criteria for a phase must pass before the next phase begins. No exceptions. A feature is done when: all ACs pass, unit tests cover happy path + 2 edge cases, tested in Chrome/Firefox/Safari, reviewed by one team member, `tsc --noEmit` passes, ESLint passes.

---

## Phase 1 — Foundation (Weeks 1–4)

**Goal:** A working wireframe generator. User types a prompt (or uploads a sketch), clicks Generate, and sees a rendered wireframe. The prompt is the sole source of truth.

**Features in this phase:** F-01 Input Engine · F-02 AI Generation Layer · F-03 Wireframe Canvas

---

### Week 1 — Project scaffold + input engine

#### Tasks

**Day 1–2: Project setup**
- `npm create vite@latest wiregenie -- --template react-ts`
- Install dependencies:
  ```
  npm install zustand react-router-dom lz-string html2canvas browser-image-compression pdfjs-dist file-saver @vercel/kv @supabase/supabase-js @supabase/ssr
  npm install -D vitest playwright @types/file-saver
  ```
  Note: `@dnd-kit` is NOT installed — drag-and-drop is out of scope.
- Set up ESLint, Prettier, `tsc --noEmit` check
- Create folder structure per `claude.md` — including `/lib/` at project root
- Set up `vercel.json` with Edge Runtime config, serverless runtimes, and CSP headers (see `claude.md`)
- Create `.env.example` — commit it. Create `.env.local` — never commit it
- Set up GitHub Actions CI (lint + typecheck + vitest on every PR)

**Day 3–5: Input engine (F-01)**

Implement `src/components/input/PromptInput.tsx`:
- `<textarea>` with Enter-to-submit, Shift+Enter for newline
- Hint pill chips: `+ scatter plot`, `+ heatmap`, `+ waterfall`, `+ gauge`, `+ ranking table`, `+ sparklines`
- Pill click appends to current prompt value without overwriting
- Inline note below textarea: "Prompt overrides all toggles — mention any widget type to include it"

Implement `src/components/input/ImageUpload.tsx`:
- Drop zone accepting PNG, JPG, PDF only (reject others with inline error — not a browser alert)
- Max 10MB — reject larger with inline error
- On valid file: show preview card with filename + clear (×) button
- PDF: use `pdfjs-dist` to render page 1 to canvas at 1280px wide, export as PNG
- Compress image to <1MB using `browser-image-compression` before base64 encoding
- Store base64 string in Zustand `useSessionStore` (not in the DOM)

Implement `src/components/input/VoiceInput.tsx`:
```typescript
// Correct silence detection — use a timer, NOT onend alone
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.continuous = true
recognition.interimResults = true

let silenceTimer: ReturnType<typeof setTimeout> | null = null

recognition.onstart = () => {
  // Start 3-second fallback silence timer
  silenceTimer = setTimeout(() => recognition.stop(), 3000)
}

recognition.onresult = (event) => {
  // Reset silence timer on every new partial result
  if (silenceTimer) clearTimeout(silenceTimer)
  silenceTimer = setTimeout(() => recognition.stop(), 3000)
  const transcript = Array.from(event.results)
    .map(r => r[0].transcript)
    .join('')
  setPromptValue(transcript)  // inject into PromptInput via Zustand
}

recognition.onend = () => {
  if (silenceTimer) clearTimeout(silenceTimer)
  setRecording(false)
}
```
- Firefox: detect `!window.SpeechRecognition && !window.webkitSpeechRecognition` on mount — show "Voice input works best in Chrome or Edge" and **disable the mic button** (do not allow click)

#### Acceptance criteria — F-01

- [ ] Prompt text submits on Enter; Shift+Enter inserts newline without submitting
- [ ] Hint pills append to existing prompt without overwriting
- [ ] Upload accepts PNG, JPG, PDF ≤10MB; rejects other types with inline error message (not browser alert)
- [ ] PDF upload renders page 1 as PNG via pdfjs-dist before encoding
- [ ] Voice auto-stops at 3s silence via timer (not onend); transcript populates prompt field verbatim
- [ ] Firefox: mic button is visually disabled and non-clickable; fallback message shown
- [ ] All three modes produce identical payload schema: `{ prompt, imageBase64?, imageMediaType?, layoutStyle, dashboardType, toggleHints }`

---

### Week 2 — AI generation layer

#### Tasks

**Step 1: Create `lib/prompts.ts`** (project root `/lib/`, NOT `/src/lib/`)

This file is importable by both `api/generate.ts` (Edge Runtime) and any `src/` code. The Edge Runtime cannot import from `/src/`, so this must live at project root.

```typescript
// lib/prompts.ts

export function buildSystemPrompt(dashboardType: string, toggleHints: string[]): string {
  return `
You are a wireframe generator for MCI's WireGenie tool.

OUTPUT RULES:
- Respond with ONLY valid JSON matching the WireframeLayout schema below
- No markdown, no code fences, no explanation — raw JSON only
- All text content must be in English only
- All values must be placeholder labels: "$1.25M", "Category A", "Column Header", "28,450"
- Never use foreign language. Never use real API data. Never invent brand names.

WIRELAYOUT SCHEMA:
{
  "dashboardTitle": "string",
  "filters": ["string"],
  "rows": [
    {
      "id": "uuid-string",
      "widgets": [
        {
          "id": "uuid-string",
          "type": "widget-type",
          "title": "string",
          "colspan": 1 or 2,
          "props": { ...widget-specific props... }
        }
      ]
    }
  ]
}

COLSPAN RULE: widgets in each row must sum to EXACTLY 2.
  Valid: two widgets with colspan 1, OR one widget with colspan 2.
  Invalid: any other combination.

WIDGET TYPES (use exact strings):
kpi-card, sparkline-row, line-chart, bar-chart, horizontal-bar,
donut-chart, funnel, scatter-plot, heatmap, waterfall, gauge-arc, data-table

PROPS SCHEMA PER WIDGET TYPE:
kpi-card:       { "label": "string", "value": "string", "delta": "string", "deltaDirection": "up"|"down", "sparklinePoints": [number] }
sparkline-row:  { "items": [{ "label": "string", "points": [number] }] }
line-chart:     { "series": [{ "name": "string", "points": [number] }], "xLabels": ["string"], "dualAxis": false }
bar-chart:      { "groups": ["string"], "series": [{ "name": "string", "values": [number] }], "stacked": false, "xLabels": ["string"] }
horizontal-bar: { "items": [{ "label": "string", "value": "string", "percent": 0-100 }] }
donut-chart:    { "segments": [{ "label": "string", "percent": 0-100, "color": "#hex" }], "centerLabel": "string" }
funnel:         { "stages": [{ "label": "string", "value": "string", "width": 0-100 }] }
scatter-plot:   { "points": [{ "x": number, "y": number, "label": "string" }], "xAxisLabel": "string", "yAxisLabel": "string" }
heatmap:        { "rows": ["string"], "cols": ["string"], "values": [[0-1]] }
waterfall:      { "bars": [{ "label": "string", "value": number, "type": "start"|"add"|"subtract"|"total" }] }
gauge-arc:      { "value": number, "min": 0, "max": number, "target": number, "label": "string" }
data-table:     { "columns": ["string"], "rows": [["string"]], "pageSize": 5 }

PRIORITY ORDER (strictly enforced):
1. USER PROMPT — absolute authority. If mentioned, it must appear.
2. SECONDARY HINT (toggles): ${toggleHints.join(', ')}
3. DASHBOARD TYPE PRESET: ${dashboardType}

If the user prompt mentions any widget type, include it regardless of toggles or preset.

WIDGET NAME MAPPING:
"scatter" or "scatter plot" → scatter-plot
"gauge" → gauge-arc
"heatmap" or "heat map" → heatmap
"waterfall" → waterfall
"funnel" → funnel
"donut" or "pie" → donut-chart
"table" or "data table" → data-table
"kpi" or "metric card" → kpi-card
"sparkline" → sparkline-row
"line chart" or "trend" → line-chart
"bar chart" or "bar graph" → bar-chart
"horizontal bar" or "ranking" → horizontal-bar
`
}

export const REFINEMENT_ADDENDUM = `
REFINEMENT MODE:
You are modifying an existing wireframe layout.
Return a PARTIAL WireframeLayout with only the changed rows:
{ "rows": [{ "id": "existing-row-id-or-new-uuid", "widgets": [...] }] }
Keep existing row IDs when modifying a row. Use a new UUID only for added rows.
Omit dashboardTitle and filters unless the user explicitly asks to change them.
Colspan rule still applies: each row's colspan values must sum to exactly 2.
`
```

**Step 2: Implement `api/generate.ts`** (Vercel Edge Runtime)

```typescript
// api/generate.ts
import { buildSystemPrompt, REFINEMENT_ADDENDUM } from '../lib/prompts'
import { kv } from '@vercel/kv'

export const runtime = 'edge'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60  // seconds

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `rate:generate:${ip}`
  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, RATE_LIMIT_WINDOW)
  if (count > RATE_LIMIT_MAX) {
    const ttl = await kv.ttl(key)
    return { allowed: false, retryAfter: ttl }
  }
  return { allowed: true }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Rate limiting by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed, retryAfter } = await checkRateLimit(ip)
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED', message: `Too many requests. Try again in ${retryAfter}s.` } }),
      { status: 429, headers: { 'Retry-After': String(retryAfter), 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()
  const { prompt, imageBase64, imageMediaType, layoutStyle, dashboardType, toggleHints, chatHistory } = body

  const isRefinement = chatHistory && chatHistory.length > 0
  const systemPrompt = buildSystemPrompt(dashboardType, toggleHints) + (isRefinement ? REFINEMENT_ADDENDUM : '')

  const userContent = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: prompt }
      ]
    : prompt

  const messages = [
    ...(chatHistory ?? []).map(({ role, content }: { role: string; content: string }) => ({ role, content })),
    { role: 'user', content: userContent }
  ]

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,  // 2048 sufficient for any 2-column layout; keeps generation within 30s Hobby limit
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    return new Response(
      JSON.stringify({ error: { code: 'ANTHROPIC_ERROR', message: 'Generation failed' } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // IMPORTANT: Transform Anthropic SSE → plain text JSON chunks
  // Never pipe the raw Anthropic response body — the client expects plain text, not SSE
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(parsed.delta.text))
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  })

  return new Response(anthropicRes.body!.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

**Step 3: Implement `src/utils/layoutParser.ts`**

Incremental JSON parser that handles partial text chunks (plain text, not SSE). Buffers incoming characters and emits complete widget objects as they arrive. Falls back to full-response parse if incremental parse fails.

**Step 4: Implement `src/hooks/useGenerate.ts`**

```typescript
// src/hooks/useGenerate.ts
export function useGenerate() {
  const { setLayout, mergeRows } = useSessionStore()
  const { setGenerating } = useUIStore()

  async function generate(payload: GeneratePayload) {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 429) {
        const err = await res.json()
        // Show rate limit error with retry countdown
        setError(err.error.message)
        return
      }

      if (!res.ok) {
        setError('Generation failed. Your prompt is preserved — try again.')
        return
      }

      // Read plain text stream (already transformed from SSE by api/generate.ts)
      const reader = res.body!.getReader()
      const parser = new LayoutParser()

      parser.onWidget = (widget) => {
        // Progressive render: merge each complete widget into store as it arrives
        useSessionStore.getState().mergeWidget(widget)
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        parser.push(new TextDecoder().decode(value, { stream: true }))
      }

      // On complete: trigger auto-save
      triggerAutoSave()
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'Generation timed out — try a shorter prompt or request fewer widgets.'
        : 'Connection error. Your prompt is preserved — try again.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  return { generate }
}
```

#### Acceptance criteria — F-02

- [ ] POST to `/api/generate` streams response; first content visible within 2s
- [ ] `ANTHROPIC_API_KEY` absent from browser network tab and JS bundle (verify in Chrome DevTools)
- [ ] `api/generate.ts` sends `Content-Type: text/plain` — NOT `text/event-stream`; client reads plain JSON text
- [ ] Rate limit: 11th request within 60s returns 429 with `Retry-After` header; client shows countdown
- [ ] Text prompt mentioning "scatter plot" generates a `scatter-plot` widget — no toggle required
- [ ] Text prompt mentioning "gauge" generates a `gauge-arc` widget — no toggle required
- [ ] Text prompt mentioning "heatmap" generates a `heatmap` widget — no toggle required
- [ ] Image upload: AI identifies layout sections within 5s, begins streaming canvas output
- [ ] All generated text content is English — no foreign language, no real brand names
- [ ] Error state shown if API call fails; user can retry without losing prompt text
- [ ] If incremental JSON parse fails, falls back to full-response parse — no blank canvas
- [ ] Every row in generated layout has colspan values summing to exactly 2

---

### Week 3 — Wireframe canvas

#### Tasks

**Implement `src/components/layout/ErrorBoundary.tsx`** (do this first — used by everything below)

See `claude.md` for implementation. Wrap the entire `WireframeCanvas` and also wrap each individual widget render in its own boundary.

**Implement `src/components/canvas/WireframeCanvas.tsx`**

- Reads `WireframeLayout` from `useSessionStore`
- Renders a **2-column grid** (not 3-column); each widget spans 1 or 2 columns
- Applies `data-theme` attribute to `<html>` based on `layoutStyle` setting
- Shimmer skeleton shown during `useUIStore.generating === true`
- Each widget is wrapped in `<ErrorBoundary>` with a "Widget unavailable" fallback

**Implement all 12 widget components** (`src/components/canvas/widgets/`)

Each widget receives a strongly-typed `props` object (see per-widget interfaces in `claude.md`). Renders as inline SVG or styled HTML. All use CSS variables for colour.

Key implementation notes:
- `kpi-card`: sparkline is a 16px-tall SVG `<polyline>` — never a chart library import
- `line-chart`: SVG with viewBox; dual Y-axis if `dualAxis: true` in props
- `bar-chart`: supports `stacked: true` (stacked bars) or `false` (grouped bars)
- `donut-chart`: SVG stroked circles using `stroke-dasharray`; center label from `props.centerLabel`
- `funnel`: tapered `<div>` widths using CSS `width` percentages from `props.stages[].width`
- `gauge-arc`: 180° SVG arc; needle or filled arc showing `props.value` vs `props.max`
- `data-table`: HTML `<table>` with `table-layout: fixed`; pagination controls are decorative
- `heatmap`: CSS grid; opacity encodes `values[row][col]` normalised 0–1
- `waterfall`: SVG rects; `type` determines fill (add=green, subtract=red, total=accent)
- `scatter-plot`: SVG `<circle>` elements with X/Y axis lines and `xAxisLabel`/`yAxisLabel`

**Implement `src/utils/themeVars.ts`** (see `claude.md` for implementation)

**Implement global CSS themes** (`src/styles/global.css`)

Three `[data-theme]` blocks + responsive breakpoints + print CSS:

```css
/* Responsive breakpoints */
@media (max-width: 1024px) {
  .sidebar { width: 48px; }
  .sidebar .sidebar-content { display: none; }
  .sidebar .icon-rail { display: flex; }
}

@media (max-width: 768px) {
  .app-shell { flex-direction: column; }
  .sidebar { width: 100%; height: 48px; flex-direction: row; }
  .wireframe-canvas { padding: 12px; }
}

@media (max-width: 640px) {
  .sidebar { display: none; }
  .mobile-nav-bar { display: flex; }  /* bottom nav bar for mobile */
  .widget-grid { grid-template-columns: 1fr; }  /* stack widgets vertically on mobile */
  .input-panel { padding: 8px; }
  button, [role="button"] { min-height: 44px; min-width: 44px; }  /* touch targets */
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; background: var(--border); }
}

/* Print — for PDF export */
@media print {
  .app-header,
  .sidebar,
  .chat-area,
  .export-bar,
  .mobile-nav-bar { display: none !important; }
  .wireframe-canvas { width: 100%; box-shadow: none; }
  @page { size: A4 landscape; margin: 1cm; }
}
```

#### Acceptance criteria — F-03

- [ ] Canvas renders all 12 widget types from layout JSON without error
- [ ] `colspan: 1` gives widget 50% width; `colspan: 2` gives 100% width (2-column grid)
- [ ] All rows have colspan values summing to exactly 2 (validate in renderer — skip malformed rows with console.warn)
- [ ] Shimmer skeleton shows during generation; replaced progressively as widgets arrive
- [ ] Theme switcher (Light/Dark/Sketch) applies in <100ms — no API call, no re-render
- [ ] Download button exports canvas as PNG (2× resolution) via html2canvas
- [ ] All widgets use CSS variables for colour — theme switch changes all colours simultaneously
- [ ] No chart library imported in any widget file
- [ ] Widget render error shows "Widget unavailable" fallback (ErrorBoundary) — does NOT crash full canvas
- [ ] At 640px viewport: widgets stack vertically in a single column

---

### Week 4 — Integration, settings, and Phase 1 QA

#### Tasks

**Implement `src/components/settings/SettingsPanel.tsx`**

- Dashboard Type dropdown: Executive overview, Deep Dive, Campaign, Custom (prompt-driven)
- Layout Style dropdown: Light, Dark, Sketch — calls `applyTheme()` immediately on change
- Component toggles (6): KPI cards, Trend chart, Marketing funnel, Channel donut, Platform stacked bar, Data table
- "Custom" selection: disables all toggles + shows hint "Your prompt controls everything"
- Toggle state serialised into `toggleHints[]` array passed to `/api/generate` as secondary hint

**Implement `src/store/useSessionStore.ts`** (Zustand)

```typescript
interface SessionState {
  currentSession: Session | null
  layout: WireframeLayout | null
  layoutStyle: 'light' | 'dark' | 'sketch'
  dashboardType: string
  toggleHints: string[]
  prompt: string
  imageBase64: string | null
  imageMediaType: string | null
  generating: boolean
  error: string | null
  setLayout: (layout: WireframeLayout) => void
  mergeWidget: (widget: Widget) => void          // for progressive streaming render
  mergeRows: (rows: WireframeRow[]) => void      // for refinement diff merge
  setLayoutStyle: (style: 'light' | 'dark' | 'sketch') => void
  setPrompt: (prompt: string) => void
  setError: (error: string | null) => void
}
```

**Phase 1 QA pass**

Test every AC across Chrome, Firefox, Safari. Fix all failures before Phase 2 begins.

#### Acceptance criteria — Phase 1 gate (all must pass)

- [ ] All F-01 ACs pass (input engine)
- [ ] All F-02 ACs pass (AI generation)
- [ ] All F-03 ACs pass (wireframe canvas)
- [ ] Text, image, and voice inputs all produce a rendered wireframe with English-only placeholders
- [ ] Prompt mentioning any widget type generates that widget — no toggle required (test: scatter, gauge, heatmap, waterfall)
- [ ] Style switcher applies in <100ms without re-generating
- [ ] Rate limit enforced: 10 requests/60s per IP
- [ ] Zero TypeScript errors (`tsc --noEmit`)
- [ ] Zero ESLint errors
- [ ] Vitest: all unit tests pass

---

## Phase 2 — Refinement (Weeks 5–8)

**Goal:** Sessions are saved and restorable. Users can refine wireframes conversationally. Version history is tracked. 12 component types are accessible from a library.

**Features:** F-04 Component Library · F-05 Refinement Chat · F-06 Session History · F-07 Version Timeline · F-10 Dashboard Settings

---

### Week 5 — Refinement chat + component library

#### F-05: Refinement Chat

**Implement `src/components/chat/RefinementChat.tsx`**

- Appears below canvas after first generation
- `<textarea>` — Enter submits, Shift+Enter newline
- Full `WireframeLayout` JSON included as context in every message to `/api/generate`
- Chat history scrollable, max 80px height display
- Chat history management:

```typescript
// src/hooks/useChatHistory.ts

const MAX_ACTIVE_TURNS = 8  // 8 user+assistant pairs = 16 messages

export function trimChatHistory(history: ChatMessage[]): {
  active: ChatMessage[]
  summaryPrefix: string
} {
  if (history.length <= MAX_ACTIVE_TURNS * 2) {
    return { active: history, summaryPrefix: '' }
  }

  const older = history.slice(0, history.length - MAX_ACTIVE_TURNS * 2)
  const active = history.slice(history.length - MAX_ACTIVE_TURNS * 2)

  // Rule-based summarisation — no extra API call, no added latency
  const userMessages = older
    .filter(m => m.role === 'user')
    .map(m => `• ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`)
  const summaryPrefix = `Earlier in this session the user made these refinements:\n${userMessages.join('\n')}\n\n`

  return { active, summaryPrefix }
}
```

- When sending to `/api/generate`, include `summaryPrefix` at the start of the system prompt and pass only `active` as `chatHistory`
- AI response (refinement mode): returns partial `{ rows: [...] }` — merge into current layout using `mergeRows()`:

```typescript
// Merge partial AI response into existing layout
function mergeRows(existing: WireframeLayout, partial: { rows: WireframeRow[] }): WireframeLayout {
  const updated = { ...existing, rows: [...existing.rows] }
  for (const newRow of partial.rows) {
    const idx = updated.rows.findIndex(r => r.id === newRow.id)
    if (idx >= 0) {
      updated.rows[idx] = newRow           // update existing row
    } else {
      updated.rows.push(newRow)            // append new row
    }
  }
  return updated
}
```

**Implement `src/components/chat/QuickPills.tsx`**

Pre-built pills that populate and auto-send:
- "swap funnel → gauge"
- "add scatter plot for ROAS vs spend"
- "move data table to top"
- "add heatmap by day of week"
- "add waterfall chart for revenue"

#### F-04: Component Library

**Implement `src/components/library/ComponentLibrary.tsx`**

- Grid of 12 component tiles: icon + name + 1-line description
- Clicking a tile appends a default widget JSON block to the current layout:
  - If last row has one `colspan: 1` widget → append new widget as `colspan: 1` to that row (total = 2)
  - Otherwise → create a new row with the new widget at `colspan: 2`
- Appended widget gets a `crypto.randomUUID()` ID — requires HTTPS or localhost; warn in README for plain HTTP dev

```typescript
export const WIDGET_NAME_MAP: Record<string, WidgetType> = {
  'scatter': 'scatter-plot',
  'scatter plot': 'scatter-plot',
  'gauge': 'gauge-arc',
  'heatmap': 'heatmap',
  'heat map': 'heatmap',
  'waterfall': 'waterfall',
  'funnel': 'funnel',
  'donut': 'donut-chart',
  'pie': 'donut-chart',
  'table': 'data-table',
  'data table': 'data-table',
  'kpi': 'kpi-card',
  'metric card': 'kpi-card',
  'sparkline': 'sparkline-row',
  'line chart': 'line-chart',
  'trend': 'line-chart',
  'bar chart': 'bar-chart',
  'horizontal bar': 'horizontal-bar',
  'ranking': 'horizontal-bar',
}
```

#### Acceptance criteria — F-04 + F-05

- [ ] Enter submits chat message; Shift+Enter inserts newline
- [ ] Each refinement message produces a visible canvas update within 2s
- [ ] Quick-refine pills populate input and auto-send without requiring Enter
- [ ] Chat history trimmed at 8 active exchange pairs; older context summarised as rule-based bullet list (no extra API call)
- [ ] All 12 component library types render correctly in Light, Dark, and Sketch themes
- [ ] Clicking a library component: fills last row if it has space (to sum to 2), else creates a new row
- [ ] No row in the layout ever has colspan values summing to anything other than 2

---

### Week 6 — Session history

#### F-06: Session History

**Implement `src/utils/storage.ts`** (see `claude.md` for full implementation)

Key behaviours:
- `loadSessions()` has try/catch — returns `[]` on any parse/decompression error (never crashes app)
- `saveSessions()` fires `checkQuotaDebounced()` — 500ms debounce prevents duplicate warning events
- Session list capped at 100; dispatches `wg:session-cap-warning` when adding session #100+

```typescript
const SESSION_CAP = 100

export function addSession(sessions: Session[], newSession: Session): Session[] {
  const updated = [newSession, ...sessions]
  if (updated.length > SESSION_CAP) {
    window.dispatchEvent(new CustomEvent('wg:session-cap-warning', { detail: { count: updated.length } }))
    return updated.slice(0, SESSION_CAP)   // trim, oldest removed silently after warning
  }
  return updated
}
```

**Implement `src/store/useHistoryStore.ts`** (Zustand)

- Loads sessions from localStorage on init — inside try/catch via `loadSessions()`
- `addSession(session)` — uses `addSession()` from storage.ts; warns at cap
- `updateSession(id, partial)` — merges, saves
- `deleteSession(id)` — removes, saves
- `duplicateSession(id)` — deep copy with name ` (copy)`, v1 version stack

**Auto-save behaviour (`src/hooks/useAutoSave.ts`):**

```typescript
// Debounced 500ms — triggers on:
// 1. First generation complete
// 2. Every chat refinement complete
// 3. Session name change
// 4. Tag change
```

**Thumbnail generation:**

```typescript
import html2canvas from 'html2canvas'

export async function generateThumbnail(canvasEl: HTMLElement): Promise<string> {
  const canvas = await html2canvas(canvasEl, {
    scale: 0.3,      // ~400×300px
    useCORS: true,   // required for brand preset logo images
    logging: false,
  })
  return canvas.toDataURL('image/jpeg', 0.6)
}
// Note: CORS-restricted logo images will silently blank in the thumbnail — this is acceptable
// Note: thumbnail stored as data URL in localStorage (Phase 1-3); stored in Supabase Storage in Phase 4
```

**Session naming:** Auto-generate unique session names using an incrementing counter appended to "Untitled session" when the name would duplicate an existing session name (e.g., "Untitled session", "Untitled session 2", "Untitled session 3").

**Implement `src/components/history/HistoryPanel.tsx`** — search by name + tags (real-time)
**Implement `src/components/history/HistoryItem.tsx`** — inline name editing, tags, duplicate/delete on hover

#### Acceptance criteria — F-06

- [ ] Session auto-saves on first generation and on every chat refinement
- [ ] Browser refresh: session restored exactly — prompt, layout, version count, chat history
- [ ] Session name editable inline; change persists after refresh
- [ ] Tags editable as comma-separated chips; change persists after refresh
- [ ] Search filters in real time by name and tags
- [ ] Duplicate creates copy with " (copy)" suffix and v1 version counter
- [ ] Storage warning shown when localStorage reaches 80% (4MB) — dispatched once per save cycle, not per event
- [ ] Session cap warning shown when session count reaches 100
- [ ] Auto-prune prompt shown for sessions older than 90 days
- [ ] `loadSessions()` returning corrupted data logs a warning and returns `[]` — app does not crash

---

### Week 7 — Version timeline + dashboard settings

#### F-07: Version Timeline

**Implement `src/hooks/useVersionStack.ts`**

```typescript
export function useVersionStack() {
  const { currentSession, updateSession } = useHistoryStore()

  function pushVersion(layout: WireframeLayout, triggerPrompt: string) {
    const session = currentSession!
    const nextNum = (session.versions.at(-1)?.number ?? 0) + 1
    const newVersion: Version = {
      id: crypto.randomUUID(),
      number: nextNum,
      timestamp: new Date().toISOString(),
      triggerPrompt: triggerPrompt.slice(0, 60),
      layout,
    }
    let versions = [...session.versions, newVersion]
    if (versions.length > 20) {
      window.dispatchEvent(new CustomEvent('wg:version-prune-warning'))
      versions = versions.slice(-20)
    }
    updateSession(session.id, { versions, layout })
  }

  function restoreVersion(versionId: string) {
    const version = currentSession!.versions.find(v => v.id === versionId)!
    // Restore layout only — never touch chat history
    updateSession(currentSession!.id, { layout: version.layout })
  }

  return { pushVersion, restoreVersion }
}
```

**Implement version badge + dropdown in `src/components/layout/ExportBar.tsx`**

- Badge shows `v{N} — current`
- Click opens dropdown with scrollable version list
- Each row: `v{N}` · timestamp · trigger prompt (max 60 chars, ellipsis)
- Click row: call `restoreVersion(id)` — updates canvas layout without touching chat history

#### F-10: Dashboard Settings finalisation

- Ensure "Custom (prompt-driven)" disables all 6 toggles and shows hint text
- Ensure toggle state serialises as `toggleHints[]` array into every `/api/generate` call
- Ensure layout style dropdown calls `applyTheme()` immediately — no API call

#### Acceptance criteria — F-07 + F-10

- [ ] Version badge increments on every regenerate and chat refinement
- [ ] Version dropdown shows number, timestamp, trigger prompt for all stored versions
- [ ] Restoring prior version changes canvas layout without affecting chat history
- [ ] Version stack pruned at 20; user warned before oldest is dropped
- [ ] Selecting "Custom" dashboard type disables all toggles
- [ ] Settings persist when switching between Generate and History tabs
- [ ] Layout style change applies in <100ms without API call

---

### Week 8 — Phase 2 integration + QA

- Connect all Phase 2 components into the full app flow
- Write Vitest unit tests for: `layoutParser`, `storage`, `useVersionStack`, `buildSystemPrompt`, widget name mapping, `trimChatHistory`, `mergeRows`
- Write Playwright E2E smoke test: generate → refine → save → restore from history
- Fix all AC failures
- Performance check: theme switch <100ms, session restore <500ms

#### Acceptance criteria — Phase 2 gate

- [ ] All F-04, F-05, F-06, F-07, F-10 ACs pass
- [ ] Session fully restored after browser refresh (prompt + layout + versions + chat)
- [ ] All 12 widget types render in all 3 themes without breakage
- [ ] Playwright E2E: generate → refine → save → restore passes
- [ ] `loadSessions()` corrupted data test: returns `[]`, does not throw

---

## Phase 3 — Delivery (Weeks 9–12)

**Goal:** Client-ready. Brand presets, export (PNG/PDF/share link), dev implementation guide, responsive layout, accessibility compliance.

**Features:** F-08 Brand Presets · F-09 Export & Share · F-13 Dev Implementation Guide · F-14 Share View · F-15 Responsive & Accessibility

---

### Week 9 — Brand presets

#### F-08: Brand Presets

**Implement `src/components/settings/BrandPresetManager.tsx`**

- Form: Name, Primary Colour (colour picker), Secondary Colour (colour picker), Font (dropdown: DM Sans / Inter / Roboto), Logo URL (text input)
- Logo URL validation: `https://[hostname]/[path].[png|jpg|gif|webp]` — reject SVG URLs with inline error
- Save creates preset in localStorage (max 10); warn before overwriting oldest
- Preset selector dropdown in Settings — selecting a preset calls `applyBrandPreset()`
- Preview: mini canvas thumbnail updates instantly as colours change (CSS var injection preview)

**Logo render logic:**
```typescript
function LogoDisplay({ preset }: { preset: BrandPreset | null }) {
  const [logoError, setLogoError] = useState(false)
  if (!preset?.logoUrl || logoError) {
    return <div className="logo-initials">{preset?.name?.slice(0, 2).toUpperCase() ?? 'WG'}</div>
  }
  return (
    <img
      src={preset.logoUrl}
      alt={preset.name}
      style={{ maxWidth: 120, maxHeight: 32, objectFit: 'contain' }}
      onError={() => setLogoError(true)}
      crossOrigin="anonymous"  // required for html2canvas CORS; may silently blank if server lacks CORS headers
    />
  )
}
// Note: if the logo server doesn't send CORS headers, the logo will render
// correctly on-screen but appear blank in PNG exports (html2canvas limitation).
// Document this limitation to users.
```

#### Acceptance criteria — F-08

- [ ] Preset applies to canvas in <150ms without regenerating wireframe
- [ ] Logo renders at max 120×32px; invalid/broken URL shows initials fallback
- [ ] SVG logo URLs rejected with inline error (not browser alert)
- [ ] Preset persists across sessions and browser refreshes
- [ ] Up to 10 named presets; user warned before oldest overwritten
- [ ] Font change loads Google Fonts link only once per session

---

### Week 10 — Export and share

#### F-09: Export & Share

**PNG export:**
```typescript
export async function exportPNG(canvasEl: HTMLElement, sessionName: string, version: number) {
  const canvas = await html2canvas(canvasEl, {
    scale: 2,
    useCORS: true,
    logging: false,
  })
  const link = document.createElement('a')
  link.download = `${sessionName.replace(/\s+/g, '-')}-v${version}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
```

**PDF export:**
```typescript
export function exportPDF() { window.print() }
// @media print CSS in global.css hides all UI except .wireframe-canvas
```

**Share link (Phase 3 — URL-encoded):**
```typescript
export function generateShareUrl(layout: WireframeLayout, layoutStyle: string): string {
  const payload = JSON.stringify({ layout, layoutStyle })
  // btoa requires ASCII — use encodeURIComponent first to handle Unicode
  const encoded = btoa(encodeURIComponent(payload))
  if (encoded.length > 8000) {
    throw new Error('PAYLOAD_TOO_LARGE')
  }
  return `${import.meta.env.VITE_APP_URL}/share?wg=${encoded}`
}

// Decode symmetrically:
export function decodeShareUrl(encoded: string): { layout: WireframeLayout; layoutStyle: string } {
  return JSON.parse(decodeURIComponent(atob(encoded)))
}
```

If `PAYLOAD_TOO_LARGE` thrown, show: "Wireframe too large for URL sharing. Server-based sharing is available in Phase 4."

**Copy-to-clipboard with toast:**
```typescript
async function copyShareLink(url: string) {
  await navigator.clipboard.writeText(url)
  setToastMessage('Copied!')
  setTimeout(() => setToastMessage(null), 2000)
}
```

#### F-14: Share View (Phase 3)

**Route:** `/share` (reads `?wg=` query param)

**Implement `src/pages/ShareView.tsx`:**
- Decode `?wg=` param using `decodeShareUrl()`
- Canvas renders read-only in decoded theme
- No sidebar, no chat bar, no generate controls
- "Powered by WireGenie" watermark in footer
- Must work without login, without Supabase

#### Acceptance criteria — F-09 + F-14

- [ ] PNG exports at 2× resolution; filename `{session-name}-v{N}.png`
- [ ] PDF prints correctly in Chrome and Safari with no clipped content
- [ ] Share link opens read-only within 2s; no login required
- [ ] Share link works in Chrome, Firefox, Safari, and mobile Safari (iOS 16+)
- [ ] Copy-to-clipboard shows "Copied!" toast for 2s then resets
- [ ] Oversized layouts show "too large" message with Phase 4 explanation
- [ ] Share view has no edit controls or chat visible

---

### Week 11 — Dev implementation guide

#### F-13: Dev Implementation Guide Generator

This uses a **separate** `/api/guide` endpoint — NOT `/api/generate`. The guide endpoint uses a Markdown output format, which is incompatible with the JSON-only `/api/generate` system prompt.

**Implement `api/guide.ts`** (Edge Runtime — streams Markdown plain text, same pattern as `/api/generate`):

Using Edge Runtime (30s) instead of Node.js (10s on Hobby). Uses streaming so the guide text
appears progressively, well within the 30s window.

```typescript
// api/guide.ts
export const runtime = 'edge'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { layout } = await req.json()

  const prompt = `You are a developer implementation guide generator for MCI's WireGenie tool.

Given this wireframe layout JSON:
${JSON.stringify(layout)}

Generate a developer implementation guide in Markdown format with:
1. Component list (each widget type present, use the exact type name)
2. Recommended chart library for each (Recharts, Chart.js, or D3 — be specific)
3. Data schema for each widget (TypeScript interface with realistic field names)
4. Suggested API endpoints to feed each chart (RESTful, with example response shape)
5. Responsive breakpoints for the layout (mobile/tablet/desktop)

Format as Markdown. Be specific and practical.`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,  // guide is shorter than a layout; 1500 tokens well within 30s
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!anthropicRes.ok) {
    return new Response(JSON.stringify({ error: 'Guide generation failed' }), { status: 502 })
  }

  // Same SSE → plain text transform as /api/generate
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(parsed.delta.text))
          }
        } catch { /* skip malformed lines */ }
      }
    }
  })

  return new Response(anthropicRes.body!.pipeThrough(transformStream), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
```

Client-side (`src/utils/devGuide.ts`) reads the plain text stream and accumulates Markdown:
```typescript
const res = await fetch('/api/guide', { method: 'POST', body: JSON.stringify({ layout }) })
const reader = res.body!.getReader()
let guide = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  guide += new TextDecoder().decode(value, { stream: true })
  setGuideText(guide)  // update state progressively so panel fills in as it streams
}
```

**Implement `src/utils/devGuide.ts`** — calls `/api/guide`, stores result in session state

**Implement collapsible panel below canvas:**
- Fires immediately after first generation completes — parallel, non-blocking
- Collapsed by default — clicking "Dev Implementation Guide ▾" expands
- Toggle does not trigger re-generation
- "Export as .md" button:
  ```typescript
  import { saveAs } from 'file-saver'
  saveAs(new Blob([guideText], { type: 'text/markdown' }), 'implementation-guide.md')
  ```

#### Acceptance criteria — F-13

- [ ] Guide generation fires in parallel with canvas render — wireframe visible before guide completes
- [ ] Guide is Markdown text (not JSON) — served from `/api/guide` (Edge Runtime, streaming), not `/api/generate`
- [ ] Guide lists every widget type present in the wireframe
- [ ] Guide includes chart library recommendation for each widget type
- [ ] Markdown export produces valid `.md` file using file-saver
- [ ] Panel collapsed by default; toggle does not trigger re-generation

---

### Week 12 — Responsive layout + accessibility + Phase 3 QA

#### F-15: Responsive & Accessibility

Responsive CSS already added in Week 3 (see `global.css` above). Accessibility checklist:

- All `<button>` elements with icons only have `aria-label`
- All `<input>` and `<textarea>` have associated `<label>` (or `aria-label`)
- Focus rings visible in all three themes — do not suppress `:focus-visible`
- Colour contrast ≥ 4.5:1 in light and dark themes (verify with axe-core)
- `@media (prefers-reduced-motion: reduce)`: shimmer replaced with static grey block (already in global.css)
- Min touch target 44×44px on all interactive elements at ≤640px (already in global.css)
- Keyboard navigation: Tab through all controls, Enter/Space activates buttons

**Client UAT — conduct before Phase 3 gate:**
- 30-minute live client session: generate → refine → switch theme → export PNG → share link
- All steps complete without errors or blank states
- Client approves the wireframe at end of session

#### Acceptance criteria — Phase 3 gate

- [ ] All F-08, F-09, F-13, F-14, F-15 ACs pass
- [ ] Client UAT passes without errors; client approves wireframe in-call
- [ ] PNG and PDF exports correct in Chrome and Safari
- [ ] Share link opens on iOS Safari without login
- [ ] axe-core scan: zero critical or serious violations on app shell
- [ ] Dev guide served from `/api/guide` (separate from `/api/generate`)

---

## Phase 4 — Production (Weeks 13–18)

**Goal:** Multi-user production deployment. Supabase Postgres for persistence. Supabase Auth. Server-side share tokens. RLS data isolation.

---

### Week 13 — Supabase setup + schema

**Set up Supabase project:**
1. Create project at `supabase.com`
2. Install Supabase CLI: `npm install -g supabase` → `supabase init`
3. Create `supabase/migrations/001_initial.sql` using exact SQL from `technical-spec.md` section 5
   - This includes `update_updated_at()` trigger function for sessions and profiles
4. Run: `supabase db push`
5. Create Storage buckets:
   - `thumbnails-private` — private bucket, RLS: owner access only
   - `thumbnails-public` — public bucket for share view thumbnails

**Write RLS integration tests** (`tests/unit/rls.test.ts`):
- User A creates a session → User B attempts to read → expect 0 rows
- Share token readable anonymously before expiry → expect data
- Share token returns 0 rows after `expires_at` (create a token with past expiry to test)

#### Acceptance criteria

- [ ] All 4 tables created with triggers, indexes, and RLS policies
- [ ] RLS integration test: User B reads 0 rows of User A's sessions
- [ ] Share token readable anonymously before expiry; returns 0 rows after
- [ ] Both Storage buckets created with correct policies

---

### Week 14 — Vercel serverless functions (F-11)

**Implement `api/sessions.ts`** (Node.js 20.x):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return new Response('Unauthorized', { status: 401 })

  if (req.method === 'POST') {
    const session = await req.json()
    const { data, error } = await supabase
      .from('sessions')
      .upsert({ ...session, user_id: user.id, updated_at: new Date().toISOString() })
      .select('id, updated_at')
      .single()
    if (error) return new Response(JSON.stringify({ error: { code: 'DB_ERROR', message: 'Save failed' } }), { status: 500 })
    return new Response(JSON.stringify(data))
  }
  // GET, DELETE handlers follow same pattern
}
```

**Implement `api/share.ts`** (Node.js 20.x — handles POST /api/share):
```typescript
function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => chars[b % chars.length])
    .join('')
}
```

**Implement `api/share/[token].ts`** (Node.js 20.x — handles GET /api/share/:token):
```typescript
// Dynamic route — Vercel matches /api/share/:token to this file
export default async function handler(req: Request) {
  const url = new URL(req.url)
  const token = url.pathname.split('/').pop()

  const { data, error } = await supabase
    .from('share_tokens')
    .select('layout_snapshot, session_id, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data || error) {
    return new Response(JSON.stringify({ error: { code: 'EXPIRED', message: 'Link expired' } }), { status: 410 })
  }
  return new Response(JSON.stringify(data))
}
```

**Implement `api/profiles.ts`** (Node.js 20.x — handles GET/PUT brand presets):
```typescript
// GET /api/profiles — returns brand presets for authenticated user
// PUT /api/profiles — saves brand presets for authenticated user
export default async function handler(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return new Response('Unauthorized', { status: 401 })

  if (req.method === 'GET') {
    const { data } = await supabase.from('profiles').select('brand_presets').eq('id', user.id).single()
    return new Response(JSON.stringify({ brandPresets: data?.brand_presets ?? [] }))
  }

  if (req.method === 'PUT') {
    const { brandPresets } = await req.json()
    await supabase.from('profiles').upsert({ id: user.id, brand_presets: brandPresets })
    return new Response(JSON.stringify({ ok: true }))
  }
}
```

**Upgrade share link flow in UI:**
- Try URL-encoded share first (Phase 3 approach)
- If payload >8KB, `POST /api/share` → receive token → build `/share/:token` URL

**Upgrade `src/pages/ShareView.tsx`:**
- Detect `?wg=` param (URL-encoded) vs `/share/:token` URL path
- For token path: call `GET /api/share/:token` — show "Link expired" page on 410

#### Acceptance criteria — F-11

- [ ] `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_KEY` absent from browser network tab
- [ ] Sessions persist in Supabase — survive Vercel cold starts
- [ ] Share token expires after 30 days; expired token returns 410 and shows "Link expired" page
- [ ] All API functions return structured error JSON — no stack traces in production responses
- [ ] `/api/share/[token].ts` dynamic route resolves correctly in Vercel production

---

### Week 15 — Supabase Auth (F-12)

**Implement `src/utils/supabase.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

**Implement auth pages:** `/login`, `/signup`, `/reset-password`, `/auth/callback`

**Google OAuth setup — important clarification:**
Google Cloud Console only needs **one fixed redirect URI**: the Supabase callback URL (e.g. `https://[project-id].supabase.co/auth/v1/callback`). Google never sees your Vercel app URLs — the OAuth flow is: Browser → Google → Supabase callback → your app (`/auth/callback`). Configure wildcard redirect in Supabase dashboard (Site URL + Redirect URLs), not in Google Cloud Console.

Explicit redirect URLs to whitelist in **Supabase dashboard**:
- `http://localhost:5173/auth/callback`
- `https://wiregenie.vercel.app/auth/callback`
- `https://wiregenie-*.vercel.app/auth/callback` (Supabase supports wildcards; use for PR previews)

**localStorage import prompt** (shown once on first login):
```typescript
async function importAll(sessions: Session[]) {
  // POST all sessions to /api/sessions — if ANY fail, roll back and keep localStorage
  const results = await Promise.allSettled(
    sessions.map(s => fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(s),
    }))
  )
  const anyFailed = results.some(r => r.status === 'rejected')
  if (anyFailed) {
    showError('Import failed — your local sessions are preserved')
    return
  }
  clearLocalSessions()  // only clear after all succeed
}
```

#### Acceptance criteria — F-12

- [ ] Login with valid credentials sets httpOnly session cookie via `@supabase/ssr`
- [ ] Expired session auto-refreshes silently
- [ ] Password reset link expires in 15 minutes; second click shows error
- [ ] Google OAuth tested on production Vercel URL — note: configure Supabase redirect URLs (not Google Console) for wildcard preview URLs
- [ ] localStorage import: all sessions imported atomically or none (no partial state)
- [ ] User redirected to `/login` without authentication

---

### Weeks 16–17 — Session sync + multi-user testing

- Replace `localStorage.saveSessions()` calls with `POST /api/sessions` calls
- Optimistic UI: write to localStorage immediately, sync to Supabase in background
- **Retry queue:** if Supabase sync fails, add to a pending retry queue (stored in localStorage `wg_sync_queue`). Retry on next app focus event. Show "Sync pending" indicator until resolved.
- Conflict resolution: compare `session.updatedAt` (client) vs `updated_at` from Supabase upsert response — server timestamp wins
- Write integration tests for all RLS policies using two real test user accounts
- Load test: k6 or Artillery — 50 virtual users, 10-minute ramp, measure p95
  - Note: ensure Anthropic API account is on a tier supporting 50+ concurrent requests; coordinate with Anthropic account management if needed

#### Acceptance criteria

- [ ] Sessions sync to Supabase within 1s of every save event
- [ ] Same sessions visible on second browser/device after login
- [ ] RLS confirmed: User B sees 0 rows from User A
- [ ] Sync failure shows "Sync pending" indicator — no silent data loss
- [ ] Load test: 50 concurrent users, p95 <3s, zero 5xx errors

---

### Week 18 — Phase 4 QA + production hardening

- Re-run axe-core — fix any regressions
- Final security review:
  - Zero API keys in Chrome DevTools network tab
  - Zero stack traces in production error responses
  - CSP header present and correct in response headers (verify in DevTools → Network → Response Headers)
  - All Supabase OAuth redirect URLs verified in Supabase dashboard
- Set up Vercel Analytics
- Tag release: `git tag v1.0.0`

#### Acceptance criteria — Phase 4 gate

- [ ] Zero API keys visible in browser devtools
- [ ] Supabase RLS: User B reads 0 rows of User A's sessions
- [ ] Load test: 50 concurrent users, p95 <3s, zero 5xx errors
- [ ] Google OAuth works on production Vercel URL
- [ ] axe-core: zero critical/serious violations
- [ ] Expired share token returns 410 and shows "Link expired" page
- [ ] Sessions survive Vercel cold start — restored from Supabase
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All Playwright E2E tests pass on production URL
- [ ] CSP header verified in production response headers
- [ ] Sync retry queue drains correctly after a simulated network failure

---

## Summary

| Phase | Weeks | Features | Gate |
|---|---|---|---|
| 1 — Foundation | 1–4 | F-01 Input · F-02 AI Gen · F-03 Canvas | Prompt → wireframe works end-to-end |
| 2 — Refinement | 5–8 | F-04 Library · F-05 Chat · F-06 History · F-07 Versions · F-10 Settings | Session save/restore + refinement chat working |
| 3 — Delivery | 9–12 | F-08 Brand · F-09 Export · F-13 Dev Guide · F-14 Share · F-15 A11y | Client UAT passes |
| 4 — Production | 13–18 | F-11 API · F-12 Auth · Multi-user sync · RLS | Load test passes; zero secrets in browser |

**Total: 15 features · 18 weeks · React + Vercel (Hobby tier) + Supabase**
