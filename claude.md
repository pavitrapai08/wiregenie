# WireGenie — Claude Code Instructions (CLAUDE.md)

## What this project is

WireGenie is an AI-powered wireframe generator built for MCI. It takes prompts, uploaded sketches/images, or voice input and generates clean, client-ready dashboard wireframes instantly. It replaces the slow, error-prone MockGenie workflow.

**The single most important rule:** The prompt is always the source of truth. Toggles are presets only. If the user's prompt mentions any widget type (scatter plot, gauge, heatmap, waterfall, funnel, etc.), that widget must appear in the generated wireframe — no toggle required.

---

## Confirmed tech stack (do not deviate)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| State management | Zustand |
| Routing | React Router v6 |
| Styling | CSS Variables (no CSS-in-JS, no Tailwind) |
| Charts in wireframe | SVG inline only (no chart library) |
| AI | Anthropic claude-sonnet-4-6 (streaming + vision) |
| API proxy | Vercel Serverless Functions (Edge Runtime for /api/generate) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email/password + Google OAuth) |
| File storage | Supabase Storage |
| Deployment | Vercel (Hobby tier is supported — see timeout notes below) |
| CI | GitHub Actions (Vitest + ESLint on PR, Playwright E2E on main) |
| Export | html2canvas (PNG), browser print API (PDF) |
| PDF upload parsing | pdfjs-dist |
| Markdown export | file-saver |
| Rate limiting | @vercel/kv (Redis-compatible sliding window) |
| Session persistence | localStorage (Phase 1–3), Supabase Postgres (Phase 4) |

**Removed from stack:** `@dnd-kit/core` — drag-and-drop reordering is out of scope for all phases.

---

## Project structure

Files are annotated with the phase they are first created: `[P1]` `[P2]` `[P3]` `[P4]`.

```
wiregenie/
│
├── lib/                             # Shared — importable by BOTH api/ and src/
│   ├── prompts.ts          [P1]    # System prompt builder (must stay here — Edge Runtime boundary)
│   └── widgetTypes.ts      [P1]    # WidgetType constants
│
├── api/                             # Vercel serverless / Edge functions
│   ├── generate.ts         [P1]    # Edge Runtime — streams layout JSON (SSE → plain text)
│   ├── guide.ts            [P3]    # Edge Runtime — streams Markdown implementation guide
│   ├── sessions.ts         [P4]    # Node.js 20.x — session CRUD (Supabase)
│   ├── share.ts            [P4]    # Node.js 20.x — POST: create share token
│   ├── share/
│   │   └── [token].ts      [P4]    # Node.js 20.x — GET: retrieve token (dynamic route)
│   ├── profiles.ts         [P4]    # Node.js 20.x — GET/PUT brand presets
│   └── auth/
│       └── callback.ts     [P4]    # Supabase OAuth callback
│
├── src/
│   ├── main.tsx            [P1]
│   ├── App.tsx             [P1]
│   │
│   ├── types/
│   │   └── index.ts        [P1]    # All TS types + per-widget props interfaces
│   │
│   ├── store/                       # Zustand stores
│   │   ├── useSessionStore.ts [P1] # Current session, layout, generating state
│   │   ├── useHistoryStore.ts [P2] # All saved sessions (localStorage)
│   │   └── useUIStore.ts      [P1] # Sidebar tab, input mode, error state
│   │
│   ├── hooks/
│   │   ├── useGenerate.ts     [P1] # Calls /api/generate, drives progressive render
│   │   ├── useAutoSave.ts     [P2] # Debounced save to localStorage / Supabase
│   │   ├── useVersionStack.ts [P2] # Push / restore versions
│   │   └── useChatHistory.ts  [P2] # Trim + summarise chat turns
│   │
│   ├── utils/                       # Browser-only utilities (NOT shared with api/)
│   │   ├── layoutParser.ts    [P1] # Incremental JSON parser for streamed layout chunks
│   │   ├── themeVars.ts       [P1] # CSS variable injection — theme + brand preset
│   │   ├── storage.ts         [P2] # localStorage helpers with LZ compression
│   │   ├── exportUtils.ts     [P3] # PNG (html2canvas) + PDF (window.print)
│   │   ├── shareUtils.ts      [P3] # Encode/decode share URL payload
│   │   ├── devGuide.ts        [P3] # Calls /api/guide, accumulates streamed Markdown
│   │   └── supabase.ts        [P4] # Supabase browser client (anon key only)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       [P1]
│   │   │   ├── Header.tsx         [P1]
│   │   │   ├── Sidebar.tsx        [P1]
│   │   │   ├── ExportBar.tsx      [P2]
│   │   │   └── ErrorBoundary.tsx  [P1] # Wraps canvas + each widget individually
│   │   │
│   │   ├── input/
│   │   │   ├── InputPanel.tsx     [P1] # Tabs: Prompt / Image / Voice
│   │   │   ├── PromptInput.tsx    [P1]
│   │   │   ├── ImageUpload.tsx    [P1]
│   │   │   └── VoiceInput.tsx     [P1]
│   │   │
│   │   ├── canvas/
│   │   │   ├── WireframeCanvas.tsx [P1]
│   │   │   ├── CanvasToolbar.tsx   [P1]
│   │   │   └── widgets/
│   │   │       ├── KpiCard.tsx        [P1]
│   │   │       ├── LineChart.tsx      [P1]
│   │   │       ├── BarChart.tsx       [P1]
│   │   │       ├── HorizontalBar.tsx  [P1]
│   │   │       ├── DonutChart.tsx     [P1]
│   │   │       ├── FunnelChart.tsx    [P1]
│   │   │       ├── ScatterPlot.tsx    [P1]
│   │   │       ├── Heatmap.tsx        [P1]
│   │   │       ├── WaterfallChart.tsx [P1]
│   │   │       ├── GaugeArc.tsx       [P1]
│   │   │       ├── DataTable.tsx      [P1]
│   │   │       └── SparklineRow.tsx   [P1]
│   │   │
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx      [P1]
│   │   │   ├── ComponentToggles.tsx   [P1]
│   │   │   └── BrandPresetManager.tsx [P3]
│   │   │
│   │   ├── library/
│   │   │   └── ComponentLibrary.tsx   [P2]
│   │   │
│   │   ├── chat/
│   │   │   ├── RefinementChat.tsx     [P2]
│   │   │   └── QuickPills.tsx         [P2]
│   │   │
│   │   └── history/
│   │       ├── HistoryPanel.tsx       [P2]
│   │       └── HistoryItem.tsx        [P2]
│   │
│   ├── pages/
│   │   ├── GeneratePage.tsx    [P1] # Main app page
│   │   ├── ShareView.tsx       [P3] # Read-only shared wireframe
│   │   └── auth/
│   │       ├── LoginPage.tsx   [P4]
│   │       ├── SignupPage.tsx  [P4]
│   │       └── CallbackPage.tsx [P4]
│   │
│   └── styles/
│       ├── global.css          [P1] # CSS vars (3 themes) + responsive + print
│       └── themes/
│           ├── light.css       [P1]
│           ├── dark.css        [P1]
│           └── sketch.css      [P1]
│
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     [P4]
│
├── tests/
│   ├── unit/                   [P1] # Vitest — add tests alongside each feature
│   └── e2e/                    [P2] # Playwright — smoke test added in Phase 2
│
├── docs/                            # Phase completion logs — filled in as each phase ships
│   ├── phase-1-log.md          # Filled in after Phase 1 gate passes
│   ├── phase-2-log.md          # Filled in after Phase 2 gate passes
│   ├── phase-3-log.md          # Filled in after Phase 3 gate passes
│   └── phase-4-log.md          # Filled in after Phase 4 gate passes
│
├── .env.example                [P1]
├── vercel.json                 [P1]
├── vite.config.ts              [P1]
├── tsconfig.json               [P1]
└── BUILD_ORDER.md                   # Master linear build sequence — see this file for what to build next
```

**Two critical naming rules:**
1. `lib/` at project root = code shared between Edge Runtime (`api/`) and browser (`src/`). Never put files here unless they are genuinely needed in `api/`.
2. `src/utils/` = browser-only helper functions. **Not** `src/lib/` — that name is reserved for the root `/lib/` concept and causes confusion.

**Path aliases** — configured in both `tsconfig.json` and `vite.config.ts`:
```ts
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),      // @/utils/storage → src/utils/storage
    '@lib': path.resolve(__dirname, './lib'),   // @lib/prompts → lib/prompts (browser only)
  }
}
// Note: api/ Edge functions use relative imports (../lib/prompts) — Vite aliases don't apply there
```
```json
// tsconfig.json — compilerOptions.paths
{
  "@/*": ["./src/*"],
  "@lib/*": ["./lib/*"]
}
```

---

## Environment variables

### .env.example (commit this — it documents what is needed)
```
# Anthropic — server-side only, never exposed to browser
ANTHROPIC_API_KEY=

# Supabase — service key is server-side only
SUPABASE_URL=
SUPABASE_ANON_KEY=        # safe to expose, gated by RLS
SUPABASE_SERVICE_KEY=     # server-side only — never in client bundle

# Vercel KV — for rate limiting on /api/generate
KV_REST_API_URL=
KV_REST_API_TOKEN=

# App
VITE_APP_URL=             # e.g. https://wiregenie.vercel.app
VITE_SUPABASE_URL=        # same value as SUPABASE_URL, prefixed for Vite client exposure
VITE_SUPABASE_ANON_KEY=   # same value as SUPABASE_ANON_KEY, prefixed for Vite
```

**Rules:**
- `ANTHROPIC_API_KEY` — only used in `api/generate.ts`. Never import in any `src/` file.
- `SUPABASE_SERVICE_KEY` — only used in `api/*.ts` serverless functions. Never in `src/`.
- `VITE_SUPABASE_ANON_KEY` — prefixed with `VITE_` so Vite exposes it to the client. Safe because Supabase RLS enforces data access.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — only used in `api/generate.ts` for rate limiting.
- Never `.gitignore`-exempt any file containing real keys. Use Vercel dashboard for all production secrets.

---

## AI generation — how it works

### SSE stream transformation (critical — read carefully)

`api/generate.ts` calls the Anthropic API which responds with **Server-Sent Events (SSE)**, not raw JSON. Each SSE event looks like:

```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"{\""}}
```

**The `api/generate.ts` function must NOT pipe the raw Anthropic response body to the client.** It must transform the SSE stream, extract the `text_delta` fields, and send only the raw JSON text chunks to the client as a plain `text/plain` stream. The client (`useGenerate.ts` + `layoutParser.ts`) then handles incremental JSON parsing of the plain text.

This means:
- `api/generate.ts` → strips SSE envelope → sends plain JSON text chunks → `Content-Type: text/plain`
- `useGenerate.ts` → reads `ReadableStream` of plain text → feeds to `layoutParser.ts`
- `layoutParser.ts` → buffers plain text chunks → emits complete widget objects

### The system prompt (built in `lib/prompts.ts`)

The system prompt has three tiers, applied in strict priority order:

1. **User prompt** (highest priority) — always honoured as-is
2. **Component toggles** (secondary hint) — prefixed with "Secondary layout hint (prompt overrides):"
3. **Dashboard type preset** (lowest priority) — only applied if prompt gives no layout direction

The system prompt enforces:
- Output must be valid JSON matching the `WireframeLayout` type
- All text content in English only — no foreign language, no live data
- All values must be placeholder labels (e.g. "$1.25M", "Column Header", "Category A")
- Widget type vocabulary: kpi-card, sparkline-row, line-chart, bar-chart, horizontal-bar, donut-chart, funnel, scatter-plot, heatmap, waterfall, gauge-arc, data-table
- **Colspan rule: widgets in each row must sum to exactly 2**

**Refinement mode addendum** (appended to system prompt when `chatHistory` is non-empty):
```
REFINEMENT MODE:
You are modifying an existing wireframe layout.
Return a PARTIAL WireframeLayout containing only changed rows:
{ "rows": [{ "id": "existing-row-id-or-new-uuid", "widgets": [...] }] }
Keep existing row IDs when modifying a row. Use a new UUID only for added rows.
Omit dashboardTitle and filters unless the user explicitly asks to change them.
```

### Rate limiting

`api/generate.ts` enforces a sliding-window rate limit using Vercel KV:
- **10 requests per IP per 60 seconds** in production
- Returns `429 Too Many Requests` with `Retry-After` header when exceeded
- Client (`useGenerate.ts`) shows "Rate limit reached. Try again in X seconds." with countdown

### Streaming

- Endpoint: `api/generate.ts` uses Vercel Edge Runtime (60s timeout on Vercel Pro)
- The endpoint transforms Anthropic SSE → plain text JSON chunks → streams to client
- Client buffers chunks in `layoutParser.ts`; emits complete widget objects as they arrive
- Show shimmer skeleton until first complete widget block arrives, then render progressively
- On stream complete, trigger auto-save

### Image/sketch input

- Accept PNG, JPG, PDF up to 10MB
- Compress images to <1MB using `browser-image-compression` before base64 encoding
- Convert to base64 before sending to `/api/generate`
- PDF: use `pdfjs-dist` to render first page to canvas at 1280px wide, export as PNG, then base64 encode
- Pass to Claude as vision content block alongside the text prompt

### Voice input

- Use `window.SpeechRecognition` (with `webkitSpeechRecognition` fallback)
- Set `recognition.continuous = true` and `recognition.interimResults = true`
- Auto-stop using a **3-second silence timer** (reset on each `onresult` event) — do NOT rely on `onend` alone for silence detection
- Inject transcript into prompt textarea — do not auto-submit
- Show fallback message on Firefox: "Voice input works best in Chrome or Edge" — disable the mic button entirely; do not allow click

---

## Layout JSON schema (`WireframeLayout` type)

```typescript
// src/types/index.ts

export type WidgetType =
  | 'kpi-card'
  | 'sparkline-row'
  | 'line-chart'
  | 'bar-chart'
  | 'horizontal-bar'
  | 'donut-chart'
  | 'funnel'
  | 'scatter-plot'
  | 'heatmap'
  | 'waterfall'
  | 'gauge-arc'
  | 'data-table'

// --- Per-widget props interfaces ---

export interface KpiCardProps {
  label: string
  value: string
  delta: string
  deltaDirection: 'up' | 'down'
  sparklinePoints: number[]
}

export interface SparklineRowProps {
  items: { label: string; points: number[] }[]
}

export interface LineChartProps {
  series: { name: string; points: number[] }[]
  xLabels: string[]
  dualAxis: boolean
}

export interface BarChartProps {
  groups: string[]
  series: { name: string; values: number[] }[]
  stacked: boolean
  xLabels: string[]
}

export interface HorizontalBarProps {
  items: { label: string; value: string; percent: number }[]
}

export interface DonutChartProps {
  segments: { label: string; percent: number; color: string }[]
  centerLabel: string
}

export interface FunnelProps {
  stages: { label: string; value: string; width: number }[]  // width: 0–100 percent
}

export interface ScatterPlotProps {
  points: { x: number; y: number; label: string }[]
  xAxisLabel: string
  yAxisLabel: string
}

export interface HeatmapProps {
  rows: string[]
  cols: string[]
  values: number[][]  // values[row][col], normalised 0–1
}

export interface WaterfallProps {
  bars: { label: string; value: number; type: 'start' | 'add' | 'subtract' | 'total' }[]
}

export interface GaugeArcProps {
  value: number
  min: number
  max: number
  target: number
  label: string
}

export interface DataTableProps {
  columns: string[]
  rows: string[][]
  pageSize: number
}

export type WidgetProps =
  | KpiCardProps
  | SparklineRowProps
  | LineChartProps
  | BarChartProps
  | HorizontalBarProps
  | DonutChartProps
  | FunnelProps
  | ScatterPlotProps
  | HeatmapProps
  | WaterfallProps
  | GaugeArcProps
  | DataTableProps

// --- Layout types ---

export interface Widget {
  id: string           // uuid — never duplicate
  type: WidgetType
  title: string
  colspan: 1 | 2       // 2-column grid; widgets in a row must sum to exactly 2
  props: WidgetProps
}

export interface WireframeRow {
  id: string
  widgets: Widget[]    // colspan values must sum to exactly 2
}

export interface WireframeLayout {
  dashboardTitle: string
  filters: string[]    // e.g. ["Date Range: Last 30 Days", "Market: All"]
  rows: WireframeRow[]
}

export interface Version {
  id: string
  number: number       // 1-indexed
  timestamp: string    // ISO
  triggerPrompt: string  // truncated at 60 chars
  layout: WireframeLayout
}

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  prompt: string
  layoutStyle: 'light' | 'dark' | 'sketch'
  dashboardType: string
  layout: WireframeLayout
  versions: Version[]        // max 20, oldest pruned with user warning
  chatHistory: ChatMessage[] // all turns; trimmed to 8 active turns in system prompt
  tags: string[]
  thumbnailDataUrl?: string  // Phase 1–3: base64 JPEG stored in localStorage
  thumbnailUrl?: string      // Phase 4: Supabase Storage path (replaces thumbnailDataUrl)
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface BrandPreset {
  id: string
  name: string
  primaryColor: string    // hex
  secondaryColor: string  // hex
  fontFamily: 'DM Sans' | 'Inter' | 'Roboto'
  logoUrl?: string        // sanitised — must be https:// PNG/JPG/GIF/WEBP URL only; no SVG
}
```

---

## Theming — CSS variables

All three themes are pure CSS variable swaps. No re-render. No API call. Applied by toggling a `data-theme` attribute on `<html>`.

```css
/* global.css */
[data-theme="light"] {
  --bg: #F5F6FA;
  --surface: #FFFFFF;
  --border: #E2E5EF;
  --border2: #C8CCDB;
  --accent: #1B6EF3;
  --accent-soft: #EEF3FE;
  --accent2: #00A97F;
  --text: #1A1D2E;
  --muted: #6B7080;
  --muted2: #9DA3B8;
}

[data-theme="dark"] {
  --bg: #0F1117;
  --surface: #1A1D27;
  --border: #2E3350;
  --border2: #3E4468;
  --accent: #1B6EF3;
  --accent-soft: #1a2340;
  --accent2: #00A97F;
  --text: #E8EAF0;
  --muted: #8B90A8;
  --muted2: #5A6080;
}

[data-theme="sketch"] {
  --bg: #F9F9F9;
  --surface: #FFFFFF;
  --border: #CCCCCC;
  --border2: #AAAAAA;
  --accent: #111111;
  --accent-soft: #F0F0F0;
  --accent2: #333333;
  --text: #111111;
  --muted: #555555;
  --muted2: #888888;
}
```

Brand preset overrides inject on top of the active theme:
```typescript
// src/utils/themeVars.ts
export function applyBrandPreset(preset: BrandPreset) {
  const root = document.documentElement
  root.style.setProperty('--accent', preset.primaryColor)
  root.style.setProperty('--accent2', preset.secondaryColor)
  loadFont(preset.fontFamily)
}

function loadFont(family: string) {
  const id = `gfont-${family.replace(' ', '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600&display=swap`
  document.head.appendChild(link)
}
```

---

## Session storage (Phase 1–3: localStorage)

```typescript
// src/utils/storage.ts
import LZString from 'lz-string'

const SESSIONS_KEY = 'wg_sessions'
const BRAND_PRESETS_KEY = 'wg_brand_presets'
const QUOTA_WARN_BYTES = 4 * 1024 * 1024   // 4MB = 80% of 5MB
const SESSION_CAP = 100

export function saveSessions(sessions: Session[]): void {
  const compressed = LZString.compress(JSON.stringify(sessions))
  try {
    localStorage.setItem(SESSIONS_KEY, compressed)
    checkQuotaDebounced()
  } catch (e) {
    window.dispatchEvent(new CustomEvent('wg:quota-exceeded'))
  }
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const decompressed = LZString.decompress(raw)
    return JSON.parse(decompressed ?? '[]')
  } catch {
    // Corrupted storage — return empty rather than crashing the app
    console.warn('WireGenie: localStorage sessions corrupted, resetting.')
    return []
  }
}

// Debounced — prevents multiple rapid saves from firing multiple warnings
let quotaTimer: ReturnType<typeof setTimeout> | null = null
function checkQuotaDebounced() {
  if (quotaTimer) clearTimeout(quotaTimer)
  quotaTimer = setTimeout(() => {
    let total = 0
    for (const key in localStorage) {
      total += (localStorage.getItem(key) ?? '').length * 2
    }
    if (total > QUOTA_WARN_BYTES) {
      window.dispatchEvent(new CustomEvent('wg:storage-warning', { detail: { bytes: total } }))
    }
  }, 500)
}
```

- Auto-save triggers: on first generation, on every chat refinement, on name/tag edit
- Warn user when localStorage usage reaches 80% of 5MB
- Warn user when session count reaches 100 (cap) — prompt to delete old sessions
- Auto-prune sessions older than 90 days (prompt user first)
- Thumbnails stored as data URLs — compress aggressively (max 400×300px, quality 0.6)
- **Phase 4:** thumbnails stored in Supabase Storage; `Session.thumbnailUrl` is a Storage bucket path, not a data URL

---

## Supabase schema (Phase 4)

```sql
-- supabase/migrations/001_initial.sql

create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  name text,
  brand_presets jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null default 'Untitled session',
  prompt text,
  layout_style text default 'light',
  dashboard_type text default 'executive',
  layout jsonb not null,
  chat_history jsonb default '[]',
  tags text[] default '{}',
  thumbnail_url text,           -- Supabase Storage path (NOT a data URL)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  number integer not null,
  trigger_prompt text,
  layout jsonb not null,
  created_at timestamptz default now()
);

create table share_tokens (
  token text primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  layout_snapshot jsonb not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- Auto-update updated_at on row changes
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- Row Level Security
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table versions enable row level security;
alter table share_tokens enable row level security;

create policy "users own their profile"
  on profiles for all using (auth.uid() = id);

create policy "users own their sessions"
  on sessions for all using (auth.uid() = user_id);

create policy "users own their versions"
  on versions for all using (
    session_id in (select id from sessions where user_id = auth.uid())
  );

create policy "share tokens are public read within expiry"
  on share_tokens for select using (expires_at > now());

-- Indexes
create index sessions_user_id_idx on sessions(user_id);
create index sessions_updated_at_idx on sessions(updated_at desc);
create index versions_session_id_idx on versions(session_id);
```

---

## Vercel configuration

```json
// vercel.json
{
  "functions": {
    "api/generate.ts": { "runtime": "edge" },
    "api/guide.ts": { "runtime": "edge" },
    "api/sessions.ts": { "runtime": "nodejs20.x" },
    "api/share.ts": { "runtime": "nodejs20.x" },
    "api/share/[token].ts": { "runtime": "nodejs20.x" },
    "api/profiles.ts": { "runtime": "nodejs20.x" }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.anthropic.com https://*.supabase.co wss://*.supabase.co; worker-src blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

**CSP notes:**
- `img-src blob: https:` — `blob:` is required for html2canvas canvas export; `https:` allows brand preset logos from any HTTPS domain
- `worker-src blob:` — required for pdfjs-dist PDF worker
- `connect-src wss://*.supabase.co` — required for Supabase Realtime (Phase 4)
- `font-src https://fonts.gstatic.com` — required for Google Fonts loaded by brand preset font injection

**Edge Runtime timeout:** Both `api/generate.ts` and `api/guide.ts` run on Edge Runtime, which has a **30-second wall-clock timeout on the Hobby (free) tier**. This is sufficient for the vast majority of generations. Very complex prompts may occasionally time out — the client shows a specific "Generation timed out" error with a suggestion to simplify the prompt. Upgrade to Vercel Pro (60s) only if timeout errors become frequent in production. All other serverless functions (`/api/sessions`, `/api/share`, `/api/profiles`) run Node.js 20.x and are not affected by the Edge timeout.

---

## React error boundaries

Wrap the entire canvas and each individual widget in error boundaries to prevent a single widget's render error from crashing the whole app.

```typescript
// src/components/layout/ErrorBoundary.tsx
import React from 'react'

interface Props { fallback?: React.ReactNode; children: React.ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State { return { hasError: true } }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="widget-error">Widget failed to render</div>
      )
    }
    return this.props.children
  }
}
```

Usage in `WireframeCanvas.tsx`:
```tsx
{widget && (
  <ErrorBoundary fallback={<div className="widget-error">Widget unavailable</div>}>
    <WidgetComponent {...widget} />
  </ErrorBoundary>
)}
```

---

## What is explicitly out of scope — do not build

- Multi-screen flow linking between wireframes
- Client comment or annotation on shared wireframes
- Approval workflow or sign-off stamps
- Developer annotation / redline overlays on wireframes
- Any real data connections or API integrations in the wireframe canvas
- Drag-and-drop reordering of widgets

If asked to build any of the above, decline and note it is out of scope per the build assessment.

---

## Definition of done — every feature

A feature is complete when:
1. All acceptance criteria from `phases.md` pass
2. Unit tests cover the happy path + at least 2 edge cases (Vitest)
3. Tested manually in Chrome, Firefox, and Safari
4. Reviewed by one other team member before merge
5. No TypeScript errors (`tsc --noEmit` passes)
6. No ESLint errors

---

## Key constraints to never violate

- `ANTHROPIC_API_KEY` never in any `src/` file — only `api/` serverless functions
- `SUPABASE_SERVICE_KEY` never in any `src/` file — only `api/` serverless functions
- `lib/prompts.ts` at project root — never moved into `src/lib/` (Edge Runtime boundary)
- `api/generate.ts` transforms Anthropic SSE → plain text chunks — never pipes raw SSE body to client
- Generated wireframe content must be English only — enforce in system prompt
- Placeholder values only in wireframes — no live data, no real API calls from canvas
- Style theme changes must apply in <100ms — no API call, no re-render
- Version stack max 20 per session — warn user before pruning oldest
- Chat history: keep max 8 most-recent turns active; summarise older turns as rule-based bullet list
- localStorage warned at 80% capacity; warned at 100-session cap; auto-prune at 90 days
- colspan values in every row must sum to **exactly 2**
- No SVG logo URLs in brand presets — reject with inline error
- Vercel Hobby tier is supported; upgrade to Pro only if 30s Edge timeout becomes a recurring issue
