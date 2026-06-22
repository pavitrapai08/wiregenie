# WireGenie — Technical Specification

**Version:** 1.2 (fixes applied)
**Project:** WireGenie by MCI
**Stack:** React 18 + Vite · Vercel Pro · Supabase (Postgres + Auth + Storage)
**AI:** Anthropic claude-sonnet-4-6 (streaming + vision)
**Date:** June 2026

---

## 1. Overview

WireGenie is a browser-based AI wireframe generator. It accepts three input types — text prompt, image/sketch upload, or voice dictation — and produces clean, client-ready dashboard wireframes in real time. Wireframes are rendered as styled HTML/SVG with three switchable themes. Sessions are saved with full version history and can be shared via a read-only link.

### 1.1 Core problem solved

MockGenie (the current MCI tool) is slow to update, produces foreign-language or mismatched content, and requires multiple client back-and-forth sessions. WireGenie solves all three:

| Problem | Solution |
|---|---|
| Slow updates | Streaming generation — canvas renders progressively, first content in <2s |
| Wrong language/content | English-only enforced in system prompt; placeholder labels only |
| Multiple sessions | Single-session refinement via conversational chat bar |

### 1.2 What is out of scope (do not build)

- Multi-screen flow linking
- Client comment/annotation on shared wireframes
- Approval workflow
- Developer annotation / redlines
- Any real data connections in the wireframe canvas
- Drag-and-drop reordering of widgets

---

## 2. Architecture

### 2.1 System diagram

```
Browser (React SPA)
    │
    ├─── Vercel Edge Function: /api/generate ──── Anthropic API (claude-sonnet-4-6)
    │         (transforms SSE → plain text chunks, streams to client)
    │
    ├─── Vercel Edge Function: /api/guide ───── Anthropic API (streams Markdown plain text)
    │
    ├─── Vercel Serverless: /api/sessions ───── Supabase Postgres
    ├─── Vercel Serverless: /api/share ──────── Supabase Postgres (create token)
    ├─── Vercel Serverless: /api/share/[token] ─ Supabase Postgres (retrieve token)
    ├─── Vercel Serverless: /api/profiles ───── Supabase Postgres (brand presets)
    │
    └─── localStorage (Phase 1–3 only)
              sessions, versions, brand presets, chat history, sync retry queue

Shared module (importable by both api/ and src/):
    /lib/prompts.ts        # system prompt builder — NOT in /src/lib/ (Edge Runtime boundary)
    /lib/widgetTypes.ts    # WidgetType constants
```

### 2.2 Deployment

All phases deploy to **Vercel Hobby (free) tier**. Both `/api/generate` and `/api/guide` run on Edge Runtime with a 30-second wall-clock timeout, which covers the vast majority of generations. Very complex prompts may occasionally time out — the client shows a specific error. Upgrade to Vercel Pro (60s Edge timeout) only if timeouts become frequent in production.

| Phase | What runs on Vercel |
|---|---|
| 1–3 | React SPA + Edge Functions (`/api/generate`, `/api/guide`) |
| 4 | All above + Serverless Functions (`/api/sessions`, `/api/share`, `/api/profiles`) calling Supabase |

Environment variables (set in Vercel dashboard — never in repo):

| Variable | Used in | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `api/generate.ts`, `api/guide.ts` | Never in `src/` |
| `SUPABASE_URL` | `api/*.ts` | Safe to expose URL |
| `SUPABASE_ANON_KEY` | Client via `VITE_SUPABASE_ANON_KEY` | Safe — gated by RLS |
| `SUPABASE_SERVICE_KEY` | `api/*.ts` only | Never in `src/` |
| `KV_REST_API_URL` | `api/generate.ts` | Vercel KV for rate limiting |
| `KV_REST_API_TOKEN` | `api/generate.ts` | Vercel KV for rate limiting |
| `VITE_APP_URL` | Client | e.g. `https://wiregenie.vercel.app` |
| `VITE_SUPABASE_URL` | Client | Same value as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Same value as SUPABASE_ANON_KEY |

### 2.3 Shared module boundary

Code shared between `api/` (Edge Runtime) and `src/` (browser) must live in `/lib/` at project root — **not** in `/src/utils/`. The Vercel Edge Runtime cannot resolve imports that cross the `api/` → `src/` directory boundary. Violating this rule causes a deploy-time unresolved module error. Browser-only utilities live in `src/utils/` and must never be imported from `api/`.

```
/lib/
├── prompts.ts      # buildSystemPrompt(), REFINEMENT_ADDENDUM — importable by api/generate.ts
└── widgetTypes.ts  # WidgetType union — importable by both layers
```

---

## 3. Frontend specification

### 3.1 Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, small bundle |
| State | Zustand | Simple, no boilerplate |
| Routing | React Router v6 | Standard, supports loaders |
| Styling | CSS Variables | Zero runtime overhead; three themes via `data-theme` swap |
| Charts | SVG inline | No library dependency in wireframe canvas |
| Export PNG | `html2canvas` | Browser-native, no server needed |
| Export PDF | Browser print API | No library; uses `@media print` CSS |
| PDF upload parsing | `pdfjs-dist` | Render PDF page 1 to canvas for vision input |
| Markdown export | `file-saver` | Download `.md` file from dev guide |
| Compression | `lz-string` | localStorage LZ compression |
| Rate limiting | `@vercel/kv` | Redis-compatible sliding window in Edge Runtime (free on Vercel Hobby) |
| Testing | Vitest + Playwright | Unit + E2E |
| Error resilience | React ErrorBoundary | Per-widget error isolation |

**Not used:** `@dnd-kit` — drag-and-drop is out of scope.

### 3.2 Application shell layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo · WireGenie by MCI · Tabs · Share · Export │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   Sidebar    │         Wireframe Canvas                 │
│   290px      │                                          │
│              │   [shimmer while generating]             │
│  ┌─────────┐ │   [wireframe renders here]               │
│  │ Input   │ │                                          │
│  │ Method  │ ├──────────────────────────────────────────┤
│  ├─────────┤ │  Refinement Chat Bar                     │
│  │Settings │ ├──────────────────────────────────────────┤
│  ├─────────┤ │  Export Bar: version badge · share · PDF │
│  │Generate │ │                                          │
│  └─────────┘ │                                          │
└──────────────┴──────────────────────────────────────────┘
```

Responsive behaviour:
- **≤1024px:** sidebar collapses to 48px icon rail; canvas takes full width
- **≤768px:** sidebar becomes a horizontal strip at top (48px tall)
- **≤640px:** sidebar hidden; bottom mobile nav bar appears; widget grid becomes single-column; all touch targets ≥44×44px

### 3.3 Input modes

#### Text prompt
- `<textarea>` — Enter submits, Shift+Enter inserts newline
- Hint pill chips: `+ scatter plot`, `+ heatmap`, `+ waterfall`, `+ gauge`, `+ ranking table`, `+ sparklines`
- Pill click appends widget name to current prompt without overwriting
- Inline note: "Prompt overrides all toggles — mention any widget type to include it"

#### Image/sketch upload
- Accept: `image/png`, `image/jpeg`, `application/pdf` — max 10MB
- Reject other types with inline error message, not a browser alert
- Show file preview card with filename and clear (×) button
- PDF: use `pdfjs-dist` to render page 1 to `<canvas>` at 1280px wide, export as PNG, then base64 encode
- Images: compress to <1MB using `browser-image-compression` before encoding
- Base64 payload passed to `/api/generate` as a vision content block

#### Voice input
- Use `window.SpeechRecognition` with `window.webkitSpeechRecognition` fallback
- Set `recognition.continuous = true` and `recognition.interimResults = true`
- Auto-stop at 3 seconds of silence using a **timer reset on each `onresult` event** — do NOT rely on `onend` alone
- Inject transcript into prompt textarea — do not auto-submit
- Firefox: detect missing Speech API on mount — disable mic button and show "Voice input works best in Chrome or Edge"
- Recording indicator: animated border on the zone while recording

### 3.4 Wireframe canvas

The canvas renders `WireframeLayout` JSON as a styled HTML structure. It is not an interactive dashboard — it is a visual wireframe preview.

**Canvas structure:**
```
┌─────────────────────────────────────────────────────────┐
│ [traffic light dots] filename          [edit][copy][dl] │ ← CanvasToolbar
├─────────────────────────────────────────────────────────┤
│ Dashboard Title                    [filter][filter]...  │
│ ─────────────────────────────────────────────────────── │
│ [Widget Row 1: 1 or 2 widgets summing to colspan 2]     │
│ [Widget Row 2: 1 or 2 widgets summing to colspan 2]     │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**Grid system:** 2-column grid. Each widget has a `colspan` of 1 or 2. Widgets in a row must sum to exactly 2. Valid arrangements:
- Two widgets with `colspan: 1` (50% / 50%)
- One widget with `colspan: 2` (100%)

Rows that do not sum to exactly 2 are logged with `console.warn` and skipped (not rendered) — they do not crash the canvas.

**Shimmer state:** While generating, show skeleton placeholders. Render first complete widget block as soon as it arrives via the stream.

**Theme switching:** `document.documentElement.dataset.theme = 'light' | 'dark' | 'sketch'`. Takes effect in <100ms. Does NOT trigger a re-generate.

**Error resilience:** Each widget is wrapped in a React `ErrorBoundary`. If a widget throws during render, it shows a "Widget unavailable" placeholder — the rest of the canvas continues rendering.

### 3.5 Widget specifications

All 12 widget types render as SVG or styled HTML. All text is placeholder content in English only.

| Widget | Props (required fields) | Notes |
|---|---|---|
| `kpi-card` | `label`, `value`, `delta`, `deltaDirection` ('up'\|'down'), `sparklinePoints` (number[]) | Sparkline: 16px-tall SVG polyline |
| `sparkline-row` | `items` (array of `{ label, points }`) | Full-width row of mini sparklines |
| `line-chart` | `series` (array of `{ name, points }`), `xLabels`, `dualAxis` (bool) | SVG; dual Y-axis if dualAxis |
| `bar-chart` | `groups`, `series` (array of `{ name, values }`), `stacked` (bool), `xLabels` | Grouped or stacked bars |
| `horizontal-bar` | `items` (array of `{ label, value, percent }`) | Progress-bar style; percent 0–100 |
| `donut-chart` | `segments` (array of `{ label, percent, color }`), `centerLabel` | SVG stroked circles; percent 0–100 |
| `funnel` | `stages` (array of `{ label, value, width }`) | Tapered rects; width 0–100 percent |
| `scatter-plot` | `points` (array of `{ x, y, label }`), `xAxisLabel`, `yAxisLabel` | SVG circles + axis labels |
| `heatmap` | `rows` (string[]), `cols` (string[]), `values` (number[][]) | CSS grid; values normalised 0–1 |
| `waterfall` | `bars` (array of `{ label, value, type }`) | type: 'start'\|'add'\|'subtract'\|'total' |
| `gauge-arc` | `value`, `min`, `max`, `target`, `label` | SVG arc, 180° half-circle |
| `data-table` | `columns` (string[]), `rows` (string[][]), `pageSize` (number) | HTML table; pagination is decorative |

Full TypeScript interfaces for all props defined in `src/types/index.ts` (see `claude.md`).

### 3.6 Component library panel

- 12 component tiles in a scrollable panel (sidebar)
- Each tile: icon + component name + one-line description
- Click to append a widget to the current layout:
  - If last row has exactly one `colspan: 1` widget → add new widget as `colspan: 1` to fill the row (total = 2)
  - Otherwise → create new row with new widget at `colspan: 2`
- Appended widget gets a unique `crypto.randomUUID()` ID — requires HTTPS or localhost
- All prompt-mentioned widget synonyms map to correct types (full mapping in `claude.md`)

### 3.7 Refinement chat

- Persistent chat bar below canvas; visible after first generation
- Full layout JSON included as context in every message
- Enter submits; Shift+Enter inserts newline
- Chat history scrollable at max 80px height
- **Chat history trimming (rule-based, no extra API call):**
  - Max 8 active exchange pairs (16 messages) in `chatHistory` sent to API
  - Older user messages converted to bullet-point summary prepended to system prompt
  - Full history preserved in session storage (not trimmed in storage, only in API payload)
- **Refinement mode:** `REFINEMENT_ADDENDUM` appended to system prompt instructs AI to return partial `{ rows: [...] }` containing only changed rows
- Client merges partial rows by matching `row.id` into existing layout; new IDs = appended rows
- Quick-refine pills: pre-built common instructions users can click to send instantly

### 3.8 Session history

Every session is a complete, self-contained snapshot. Loading a past session restores exact state — not a re-generation.

**Session object stored:**
- Session name (editable inline; auto-numbered to avoid duplicates: "Untitled session", "Untitled session 2", ...)
- Created/updated timestamps
- Prompt used
- Layout JSON (current)
- Layout style (light/dark/sketch)
- Dashboard type
- Version stack (max 20)
- Chat history (all turns — not trimmed in storage)
- Tags (editable as comma-separated chips)
- Thumbnail:
  - Phase 1–3: `thumbnailDataUrl` — base64 JPEG data URL stored in localStorage
  - Phase 4: `thumbnailUrl` — Supabase Storage bucket path (data URL no longer stored in DB row)

**Auto-save triggers:** first generation, every chat refinement, name edit, tag edit.

**Storage limits:**
- 80% of 5MB (4MB): show storage warning
- 100 sessions: show session cap warning
- 90 days old: prompt for auto-prune

**Session cap:** `addSession()` trims to 100; user warned before oldest is silently removed.

**`loadSessions()` error handling:** always wrapped in try/catch; returns `[]` on any error (decompression failure, JSON parse error, corrupted data) rather than throwing.

**Search:** real-time filter on name + tags as user types. No submit required.

### 3.9 Version timeline

- Every regenerate or chat refinement pushes a new immutable version
- Version badge: `v{N} — current` — clickable to open dropdown
- Dropdown row: version number + timestamp + trigger prompt (max 60 chars)
- Restoring a prior version replaces canvas layout only — chat history preserved
- Max 20 versions per session — warn before pruning oldest

### 3.10 Brand presets

- Named presets: `{ name, primaryColor, secondaryColor, fontFamily, logoUrl }`
- `logoUrl` must be a valid `https://` PNG/JPG/GIF/WEBP URL — sanitise before use; reject SVG URLs with inline error
- Logo renders at max 120×32px in dashboard header; broken/CORS-restricted URL shows initials fallback
- `crossOrigin="anonymous"` set on logo `<img>` — required for html2canvas export; logo may blank if server lacks CORS headers (document this limitation to users)
- Preset applies by CSS variable injection in <150ms — no re-generate
- Font loaded via Google Fonts `<link>` injection if not already present (loaded once per session)
- Max 10 named presets; warn before overwriting oldest
- Storage: localStorage (Phase 1–3) / `profiles.brand_presets jsonb` via `/api/profiles` (Phase 4)

### 3.11 Export

| Export type | Implementation | Filename |
|---|---|---|
| PNG | `html2canvas` at 2× pixel ratio | `{session-name}-v{N}.png` |
| PDF | `window.print()` with `@media print` CSS | Browser default |
| Share link (Phase 1–3) | Base64 URL-encoded layout in `?wg=` param | N/A |
| Share link (Phase 4) | Short token (`/share/:token`) → Supabase row | N/A |
| Dev guide | Markdown download via `file-saver` | `implementation-guide.md` |

**Share link encoding:**
```typescript
// Encode: btoa(encodeURIComponent(JSON)) handles Unicode safely
const encoded = btoa(encodeURIComponent(payload))
// Decode: decodeURIComponent(atob(encoded)) — must be symmetric
const decoded = JSON.parse(decodeURIComponent(atob(encoded)))
```

**Share view behaviour:**
- No sidebar, no chat bar, no generate controls
- Canvas renders read-only in same theme as when shared
- "Powered by WireGenie" watermark in footer
- Must work without login, without Supabase
- `/share/:token` shows "Link expired" page on 410 response

---

## 4. API specification

### 4.1 POST /api/generate (Edge Runtime — Vercel Pro, 60s timeout)

Proxies Anthropic API. Transforms SSE stream → plain text JSON chunks before sending to client.

**Request:**
```typescript
{
  prompt: string
  imageBase64?: string              // PNG/JPEG base64, no data: prefix
  imageMediaType?: 'image/png' | 'image/jpeg'
  layoutStyle: 'light' | 'dark' | 'sketch'
  dashboardType: string
  toggleHints: string[]
  chatHistory?: { role: 'user' | 'assistant', content: string }[]
}
```

**Response (success):** `text/plain; charset=utf-8` — plain JSON text chunks (NOT SSE).
The raw Anthropic SSE envelope is stripped server-side; clients never see `event:` / `data:` lines.

**Rate limiting:** 10 requests per IP per 60 seconds using Vercel KV sliding window.

**Response (rate limited):** `429 Too Many Requests`
```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests. Try again in Xs." } }
```
`Retry-After` header set to seconds remaining.

**Other error responses:**
```json
{ "error": { "code": "ANTHROPIC_ERROR", "message": "Generation failed" } }
{ "error": { "code": "INVALID_IMAGE", "message": "Image too large or unsupported format" } }
```

**System prompt structure (built in `/lib/prompts.ts`):**
- Enforces JSON-only output matching `WireframeLayout`
- Includes full props schema for all 12 widget types
- Colspan rule: rows must sum to exactly 2
- Widget name mapping for all 12 types + common synonyms
- Appends `REFINEMENT_ADDENDUM` when `chatHistory` is non-empty

### 4.2 POST /api/guide (Edge Runtime — same 30s timeout as /api/generate)

Generates a developer implementation guide in Markdown format. Separate from `/api/generate` — uses a different system prompt that outputs plain Markdown, not JSON. Uses streaming (same SSE → plain text transform) so text appears progressively within the 30s window.

**Request:**
```typescript
{ layout: WireframeLayout }
```

**Response (success):** `text/plain; charset=utf-8` — plain Markdown text streamed progressively.

**Response (error):** `502`
```json
{ "error": "Guide generation failed" }
```

No auth required. Fires in parallel with canvas render — non-blocking. Client accumulates streamed text and updates the guide panel progressively.

### 4.3 POST /api/sessions (Phase 4)

Create or update a session. JWT required.

**Headers:** `Authorization: Bearer {supabase-jwt}`
**Request:** `Session` object
**Response:** `{ id: string, updatedAt: string }`

### 4.4 GET /api/sessions/:id (Phase 4)

Retrieve a session. JWT required. Returns 403 if session belongs to different user (RLS).

**Response:** Full `Session` object

### 4.5 POST /api/share (Phase 4)

Create a share token. JWT required.

**Request:** `{ sessionId: string, layoutSnapshot: WireframeLayout }`
**Response:** `{ token: string, url: string, expiresAt: string }`

### 4.6 GET /api/share/[token] (Phase 4)

Retrieve a shared wireframe. **No auth required.** Handled by `api/share/[token].ts` — Vercel matches `/api/share/:token` to this file via dynamic routing.

**Response:** `{ layout_snapshot: WireframeLayout, session_id: string, expires_at: string }`
**Error:** `410 Gone` if token expired or not found

### 4.7 GET /api/profiles (Phase 4)

Retrieve brand presets for the authenticated user. JWT required.

**Response:** `{ brandPresets: BrandPreset[] }`

### 4.8 PUT /api/profiles (Phase 4)

Save brand presets for the authenticated user. JWT required.

**Request:** `{ brandPresets: BrandPreset[] }`
**Response:** `{ ok: true }`

---

## 5. Supabase schema

```sql
-- profiles: extends auth.users
create table profiles (
  id uuid references auth.users primary key,
  email text not null,
  name text,
  brand_presets jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- sessions: one per wireframe project
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
  thumbnail_url text,           -- Supabase Storage bucket path (NOT a base64 data URL)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- versions: immutable snapshots per session
create table versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  number integer not null,
  trigger_prompt text,          -- max 60 chars
  layout jsonb not null,
  created_at timestamptz default now()
);

-- share_tokens: read-only public access links
create table share_tokens (
  token text primary key,       -- 12-char random alphanumeric
  session_id uuid references sessions(id) on delete cascade not null,
  layout_snapshot jsonb not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- Auto-update updated_at on every row change
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

create policy "share tokens public read within expiry"
  on share_tokens for select using (expires_at > now());

-- Indexes
create index sessions_user_id_idx on sessions(user_id);
create index sessions_updated_at_idx on sessions(updated_at desc);
create index versions_session_id_idx on versions(session_id);
```

**Supabase Storage buckets:**
- `thumbnails-private` — private bucket, RLS: owner access only. Used for session thumbnail uploads (Phase 4).
- `thumbnails-public` — public bucket. Used for thumbnails embedded in share links (Phase 4).

**Thumbnail migration (Phase 1–3 → Phase 4):**
- Phase 1–3: `Session.thumbnailDataUrl` is a base64 data URL stored in localStorage only
- Phase 4: thumbnails are uploaded to Supabase Storage; `sessions.thumbnail_url` stores the bucket path (e.g. `thumbnails-private/{userId}/{sessionId}.jpg`)
- The `Session` TypeScript type has both optional fields: `thumbnailDataUrl?` (localStorage) and `thumbnailUrl?` (Supabase path)

---

## 6. Authentication (Phase 4)

Using Supabase Auth — no custom auth server.

**Flows supported:**
- Email + password: sign up, sign in, password reset (magic link, 15-min expiry, one-time use)
- Google OAuth

**Google OAuth redirect URL explanation:**
The OAuth flow is: Browser → Google → **Supabase callback URL** (fixed) → your app (`/auth/callback`). Google Cloud Console only needs the **Supabase callback URL** registered (e.g. `https://[project-id].supabase.co/auth/v1/callback`). Google never sees your Vercel app URLs.

Configure redirect URLs in **Supabase dashboard** (not Google Console):
- `http://localhost:5173/auth/callback` (local dev)
- `https://wiregenie.vercel.app/auth/callback` (production)
- `https://wiregenie-*.vercel.app/auth/callback` (PR previews — Supabase supports wildcard)

**JWT handling:**
- Supabase issues JWTs automatically
- `@supabase/ssr` stores session in httpOnly cookies (not localStorage)
- Session auto-refreshes silently on expiry
- Verified server-side in `api/*.ts` via `supabase.auth.getUser(token)`

**localStorage import on first login:**
- Detect existing localStorage sessions on first authenticated page load
- Show one-time prompt: "Import N sessions from this browser?"
- Import is **atomic** — all succeed or none imported (no partial state on failure)

---

## 7. CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint           # ESLint
      - run: npm run typecheck      # tsc --noEmit
      - run: npm run test           # Vitest unit tests
      - run: npm run test:e2e       # Playwright (on merge to main only)
```

### Vercel deployment

- `main` → production at `https://wiregenie.vercel.app`
- Any branch → preview URL (auto-generated by Vercel)
- Environment variables: set in Vercel dashboard → Settings → Environment Variables
- **Do not** use `vercel env pull` in CI — secrets stay in Vercel, not in files

---

## 8. Performance requirements

| Metric | Target |
|---|---|
| First wireframe content visible | < 2s from generate click |
| Theme switch (CSS var swap) | < 100ms |
| Brand preset apply | < 150ms |
| Session restore from history | < 500ms |
| Share link open (read-only view) | < 2s |
| PNG export (html2canvas) | < 3s |
| Supabase query p95 (Phase 4) | < 300ms |
| Vercel Edge Function first-token | < 200ms |
| Edge Function max stream duration | 30s (Vercel Hobby); 60s on Pro if needed |
| Load test: 50 concurrent users | p95 < 3s, 0 5xx errors |

**Load test note:** 50 concurrent wireframe generations = 50 simultaneous Anthropic API calls. Confirm the Anthropic account tier supports this concurrency before the load test. If rate limits are encountered, implement a server-side request queue.

---

## 9. Accessibility

- WCAG 2.1 AA compliance on the app shell and all interactive controls
- Wireframe canvas (SVG charts) is exempt — it is a design preview, not functional UI
- All buttons and inputs keyboard-accessible (Tab + Enter/Space)
- Focus rings visible in all three themes — do NOT suppress `:focus-visible`
- ARIA labels on all icon-only buttons
- Colour contrast ≥ 4.5:1 in light and dark themes (verified with axe-core)
- `@media (prefers-reduced-motion)`: shimmer replaced with static skeleton; no spinning loaders
- Touch targets ≥44×44px on all interactive elements at ≤640px viewport
- `axe-core` scan: zero critical or serious violations before each phase release

---

## 10. Browser support

| Browser | Minimum version | Notes |
|---|---|---|
| Chrome | 112+ | Full support including voice input |
| Safari | 16.4+ | Full support; voice input via webkit prefix |
| Firefox | 115+ | Full support; voice input shows disabled fallback (no mic button) |
| Edge | 112+ | Full support including voice input |
| Mobile Safari (iOS 16+) | 16.4+ | Must work for share link view |
| Chrome Android | 112+ | Must work for share link view |

---

## 11. Security

| Concern | Implementation |
|---|---|
| API keys | Stored exclusively in Vercel environment variables; never in source code or client bundle |
| Rate limiting | `/api/generate`: 10 req/IP/60s via Vercel KV sliding window |
| Supabase RLS | Row-level isolation — users cannot access other users' sessions |
| Logo URL sanitisation | Must match `https://[hostname]/[path].[png\|jpg\|gif\|webp]` — SVG rejected with inline error |
| Share tokens | 12-char random alphanumeric; 30-day expiry enforced in RLS and API |
| Session tokens | httpOnly cookies via `@supabase/ssr` — not accessible to JavaScript |
| Error responses | No stack traces in production API responses — structured JSON error objects only |
| XSS | CSP header set via `vercel.json` (see below) |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` in CSP |

### Content Security Policy (set in `vercel.json` headers config)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://api.anthropic.com https://*.supabase.co wss://*.supabase.co;
worker-src blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

**CSP directive rationale:**
- `img-src blob: https:` — `blob:` for html2canvas canvas export; `https:` for external brand preset logos
- `worker-src blob:` — pdfjs-dist runs PDF rendering in a blob: worker
- `connect-src wss://*.supabase.co` — Supabase Realtime WebSocket (Phase 4)
- `style-src https://fonts.googleapis.com` — Google Fonts stylesheet injection
- `font-src https://fonts.gstatic.com` — Google Fonts files
- `'unsafe-inline'` for scripts — required for React/Vite; tighten with nonces in a future hardening pass

---

## 12. Known limitations (document to users)

| Limitation | Detail |
|---|---|
| Logo in PNG export | Brand preset logos from CORS-restricted servers render on-screen but appear blank in PNG exports. Advise users to host logos on CORS-enabled CDNs. |
| Share link size | URL-encoded share links (Phase 3) limited to ~8KB payload. Complex wireframes show a "too large" message until Phase 4 server tokens are available. |
| Session storage | localStorage limited to ~5MB. Large session libraries with many thumbnails may trigger storage warnings. |
| Voice input | Not available in Firefox — disabled with a fallback message. |
| Vercel timeout | Edge Function max 30s (Vercel Hobby). Very complex prompts may occasionally time out — client shows "Generation timed out" error. Upgrade to Vercel Pro (60s) if this becomes frequent. |
| Concurrent generations | Only one generation per session at a time. Rapid-clicking Generate is ignored while a generation is in progress. |
