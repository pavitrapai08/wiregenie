# WireGenie — Master Build Order

This is the single source of truth for **what to build and in what sequence**.
Read this file before starting any work session. After each phase completes, fill in `docs/phase-N-log.md`.

---

## How to use this file

- Work top to bottom. Do not skip ahead to a later phase.
- Each step has a checkbox. Check it off when the step's acceptance criteria pass — not when the code is written.
- "AC" = acceptance criteria defined in `phases.md` for that feature.
- **After every phase gate passes, Claude Code fills in `docs/phase-N-log.md` automatically** — recording every file created, every decision made, deviations from plan, test results, and performance measurements. This happens before the next phase starts. No manual documentation effort required.

---

## Phase 1 — Foundation (Weeks 1–4)
**Exit condition:** Type a prompt → Generate → see a rendered wireframe. All Phase 1 ACs pass.

---

### Step 1 · Project Scaffold (Day 1–2)

- [ ] `npm create vite@latest wiregenie -- --template react-ts`
- [ ] Install all dependencies:
  ```
  npm install zustand react-router-dom lz-string html2canvas browser-image-compression pdfjs-dist file-saver @vercel/kv
  npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom playwright @types/file-saver
  ```
- [ ] Create folder skeleton (all empty folders + `.gitkeep`):
  ```
  lib/   api/auth/   api/share/
  src/types/   src/store/   src/hooks/   src/utils/
  src/components/layout/   src/components/input/
  src/components/canvas/widgets/   src/components/settings/
  src/pages/   src/styles/themes/
  tests/unit/   tests/e2e/   docs/
  ```
- [ ] Configure path aliases in `tsconfig.json` and `vite.config.ts` (`@/*` → `src/`, `@lib/*` → `lib/`)
- [ ] Create `vercel.json` with Edge Runtime config + CSP headers (from `claude.md`)
- [ ] Create `.env.example` (commit) and `.env.local` (never commit)
- [ ] Set up GitHub Actions CI: `.github/workflows/ci.yml` (lint + typecheck + vitest on PR)
- [ ] Confirm `tsc --noEmit` and `eslint .` both pass on the empty scaffold

---

### Step 2 · Types + Shared Lib (Day 2)

Create these **before** any component — everything else imports from them.

- [ ] `src/types/index.ts` — all TypeScript interfaces (Widget, WireframeLayout, Session, BrandPreset, all 12 widget props interfaces). See `claude.md` for full definition.
- [ ] `lib/widgetTypes.ts` — export `WidgetType` union (shared between Edge functions and browser)
- [ ] `lib/prompts.ts` — `buildSystemPrompt()` and `REFINEMENT_ADDENDUM`. See `phases.md` Week 2 for full implementation.

---

### Step 3 · Zustand Stores — Minimal (Day 2–3)

Only implement the fields/actions needed for Phase 1. Extend in later phases.

- [ ] `src/store/useUIStore.ts` — `generating`, `error`, `inputMode`, `sidebarTab` + setters
- [ ] `src/store/useSessionStore.ts` — `layout`, `layoutStyle`, `dashboardType`, `toggleHints`, `prompt`, `imageBase64`, `imageMediaType` + `setLayout`, `mergeWidget`, `setPrompt`, `setError`, `setGenerating`

---

### Step 4 · Input Engine — F-01 (Day 3–5)

- [ ] `src/components/input/PromptInput.tsx` — textarea, Enter/Shift+Enter, hint pills
- [ ] `src/components/input/ImageUpload.tsx` — drop zone PNG/JPG/PDF ≤10MB, pdfjs-dist for PDF, browser-image-compression
- [ ] `src/components/input/VoiceInput.tsx` — SpeechRecognition with 3s silence timer; Firefox fallback disables button
- [ ] `src/components/input/InputPanel.tsx` — tab container for the three input modes
- [ ] Unit tests: `tests/unit/inputEngine.test.ts` — cover hint pill append, file type rejection, Firefox fallback flag
- [ ] **F-01 ACs pass** ✓

---

### Step 5 · AI Generation Layer — F-02 (Week 2)

- [ ] `api/generate.ts` — Edge Runtime, rate limiting (Vercel KV), SSE→plain-text transform, error responses. See `phases.md` Week 2 for full implementation.
- [ ] `src/utils/layoutParser.ts` — incremental JSON parser: buffers plain-text chunks, emits complete Widget objects
- [ ] `src/hooks/useGenerate.ts` — fetch `/api/generate`, read stream, call `mergeWidget()` progressively, handle 429/error
- [ ] Unit tests: `tests/unit/layoutParser.test.ts` — partial chunk buffering, malformed JSON fallback
- [ ] **F-02 ACs pass** ✓

---

### Step 6 · Wireframe Canvas — F-03 (Week 3)

- [ ] `src/components/layout/ErrorBoundary.tsx` — class component, "Widget unavailable" fallback
- [ ] `src/styles/global.css` — all 3 `[data-theme]` blocks + responsive breakpoints (1024/768/640px) + `@media print` + `@media (prefers-reduced-motion)`
- [ ] `src/styles/themes/light.css`, `dark.css`, `sketch.css`
- [ ] `src/utils/themeVars.ts` — `applyTheme()`, `applyBrandPreset()`, `loadFont()`
- [ ] All 12 widget components in `src/components/canvas/widgets/` — SVG/HTML only, CSS variables, typed props
- [ ] `src/components/canvas/CanvasToolbar.tsx` — traffic-light dots, session name, download button
- [ ] `src/components/canvas/WireframeCanvas.tsx` — 2-column grid, colspan rendering, shimmer skeleton, ErrorBoundary per widget
- [ ] Unit tests: `tests/unit/widgets.test.ts` — each widget renders without throwing given valid props
- [ ] **F-03 ACs pass** ✓

---

### Step 7 · Settings Panel + App Shell (Week 4)

- [ ] `src/components/settings/SettingsPanel.tsx` — dashboard type dropdown, layout style, 6 toggles
- [ ] `src/components/settings/ComponentToggles.tsx` — 6 toggle switches, "Custom" disables all
- [ ] `src/components/layout/AppShell.tsx` — sidebar (290px) + main area layout
- [ ] `src/components/layout/Header.tsx` — logo, tabs, share/export buttons (placeholders in P1)
- [ ] `src/components/layout/Sidebar.tsx` — houses InputPanel + SettingsPanel
- [ ] `src/pages/GeneratePage.tsx` — wires AppShell + canvas + generate button
- [ ] `src/App.tsx` — React Router setup (just `/` route in Phase 1)
- [ ] `src/main.tsx` — mount app

---

### Step 8 · Phase 1 QA

- [ ] Manual test in Chrome, Firefox, Safari: prompt → generate → wireframe renders
- [ ] Test all 4 widget-name-to-type mappings (scatter, gauge, heatmap, waterfall)
- [ ] Test rate limit: 11th request shows countdown error
- [ ] Verify `ANTHROPIC_API_KEY` absent from Chrome DevTools network tab
- [ ] `tsc --noEmit` passes
- [ ] `eslint .` passes
- [ ] `npm run test` passes
- [ ] **All Phase 1 gate ACs pass**
- [ ] **Claude Code fills in `docs/phase-1-log.md`** — then Phase 2 begins

---

## Phase 2 — Refinement (Weeks 5–8)
**Exit condition:** Sessions save/restore across refresh. Refinement chat updates canvas. Version history works. All Phase 2 ACs pass.

---

### Step 9 · Chat History Hook (Week 5 — before RefinementChat)

- [ ] `src/hooks/useChatHistory.ts` — `trimChatHistory()` (rule-based summarisation, no API call)
- [ ] Unit tests: `tests/unit/chatHistory.test.ts` — trim at 8 pairs, summary bullet format, edge case 0 messages

---

### Step 10 · Refinement Chat — F-05 (Week 5)

- [ ] `src/components/chat/QuickPills.tsx` — 5 pre-built pill buttons
- [ ] `src/components/chat/RefinementChat.tsx` — textarea, Enter/Shift+Enter, sends full layout as context, calls `trimChatHistory`, handles partial `{ rows }` response
- [ ] Extend `useSessionStore` — add `chatHistory`, `mergeRows()` action
- [ ] Update `useGenerate.ts` — append `REFINEMENT_ADDENDUM` when chatHistory non-empty; call `mergeRows()` on partial response
- [ ] **F-05 ACs pass** ✓

---

### Step 11 · Component Library — F-04 (Week 5)

- [ ] `src/components/library/ComponentLibrary.tsx` — 12 tiles, `WIDGET_NAME_MAP`, colspan-aware append logic
- [ ] **F-04 ACs pass** ✓

---

### Step 12 · Session Storage (Week 6)

- [ ] `src/utils/storage.ts` — `saveSessions`, `loadSessions` (try/catch), `addSession` (cap 100, warn), `checkQuotaDebounced`
- [ ] Unit tests: `tests/unit/storage.test.ts` — corrupted data returns `[]`, quota event fires, cap warning dispatched

---

### Step 13 · Session History — F-06 (Week 6)

- [ ] `src/store/useHistoryStore.ts` — loads via `loadSessions`, `addSession`, `updateSession`, `deleteSession`, `duplicateSession`
- [ ] `src/hooks/useAutoSave.ts` — 500ms debounce, triggers on generation + chat + name/tag edit
- [ ] `src/components/history/HistoryItem.tsx` — name inline edit, tags, relative time, hover actions
- [ ] `src/components/history/HistoryPanel.tsx` — real-time search, session list
- [ ] Add History tab to Sidebar
- [ ] **F-06 ACs pass** ✓

---

### Step 14 · Version Timeline — F-07 (Week 7)

- [ ] `src/hooks/useVersionStack.ts` — `pushVersion`, `restoreVersion`, prune at 20 with warning
- [ ] `src/components/layout/ExportBar.tsx` — version badge + dropdown (restore on click)
- [ ] Wire `pushVersion()` into `useGenerate.ts` (called on stream complete + on each refinement)
- [ ] **F-07 ACs pass** ✓

---

### Step 15 · Dashboard Settings Finalisation — F-10 (Week 7)

- [ ] Verify "Custom" disables all toggles and shows hint
- [ ] Verify `toggleHints[]` wired into every `/api/generate` call
- [ ] **F-10 ACs pass** ✓

---

### Step 16 · Phase 2 QA (Week 8)

- [ ] Playwright E2E: `tests/e2e/smoke.spec.ts` — generate → refine → save → restore from history
- [ ] Unit tests for: `layoutParser`, `storage`, `useVersionStack`, `buildSystemPrompt`, `WIDGET_NAME_MAP`, `trimChatHistory`, `mergeRows`
- [ ] Browser refresh test: all session data restored exactly
- [ ] All 12 widgets in all 3 themes — no breakage
- [ ] Theme switch <100ms, session restore <500ms (time manually)
- [ ] **All Phase 2 gate ACs pass**
- [ ] **Claude Code fills in `docs/phase-2-log.md`** — then Phase 3 begins

---

## Phase 3 — Delivery (Weeks 9–12)
**Exit condition:** Client UAT passes. Export, share, dev guide, and accessibility all working. All Phase 3 ACs pass.

---

### Step 17 · Brand Presets — F-08 (Week 9)

- [ ] `src/components/settings/BrandPresetManager.tsx` — name, colour pickers, font dropdown, logo URL validation (no SVG), save/load presets
- [ ] Extend `src/utils/themeVars.ts` — `applyBrandPreset()` already written; add `loadFont()`
- [ ] Logo render with `crossOrigin="anonymous"` + `onError` initials fallback
- [ ] **F-08 ACs pass** ✓

---

### Step 18 · Export & Share — F-09, F-14 (Week 10)

- [ ] `src/utils/exportUtils.ts` — `exportPNG()` (html2canvas 2×), `exportPDF()` (window.print)
- [ ] `src/utils/shareUtils.ts` — `generateShareUrl()` (btoa/encodeURIComponent), `decodeShareUrl()` (symmetric), throws `PAYLOAD_TOO_LARGE`
- [ ] Wire export buttons in `ExportBar.tsx` — PNG download, PDF print, copy share link + "Copied!" toast
- [ ] `src/pages/ShareView.tsx` — decodes `?wg=` param, read-only canvas, "Powered by WireGenie" footer
- [ ] Add `/share` route to `src/App.tsx`
- [ ] **F-09 + F-14 ACs pass** ✓

---

### Step 19 · Dev Implementation Guide — F-13 (Week 11)

- [ ] `api/guide.ts` — Edge Runtime, SSE→plain-text stream (same pattern as `api/generate.ts`), Markdown system prompt
- [ ] `src/utils/devGuide.ts` — `fetchGuide()`, accumulates streamed Markdown, updates state
- [ ] Collapsible guide panel below canvas — fires non-blocking after generation completes
- [ ] "Export as .md" button using `file-saver`
- [ ] **F-13 ACs pass** ✓

---

### Step 20 · Responsive Layout + Accessibility — F-15 (Week 12)

- [ ] Verify responsive CSS at 1024px, 768px, 640px breakpoints in Chrome DevTools
- [ ] ARIA labels on all icon-only buttons
- [ ] Focus rings visible in all 3 themes
- [ ] Colour contrast ≥4.5:1 — verify with axe-core browser extension
- [ ] Touch targets ≥44px at ≤640px
- [ ] `prefers-reduced-motion` — shimmer replaced with static block
- [ ] Keyboard navigation: Tab through all controls

---

### Step 21 · Phase 3 QA + Client UAT (Week 12)

- [ ] axe-core scan: zero critical/serious violations
- [ ] PNG export correct in Chrome + Safari
- [ ] PDF print correct in Chrome + Safari
- [ ] Share link opens on iOS Safari without login
- [ ] Dev guide streams progressively; `.md` export downloads correctly
- [ ] **30-minute live client UAT session** — generate → refine → theme switch → export PNG → share link → client approves
- [ ] **All Phase 3 gate ACs pass**
- [ ] **Claude Code fills in `docs/phase-3-log.md`** — then Phase 4 begins

---

## Phase 4 — Production (Weeks 13–18)
**Exit condition:** Multi-user. Auth working. Sessions in Supabase. Load test passes. Zero secrets in browser. All Phase 4 ACs pass.

---

### Step 22 · Supabase Setup + Schema (Week 13)

- [ ] Create Supabase project; note URL, anon key, service key
- [ ] `npm install -g supabase` → `supabase init`
- [ ] `supabase/migrations/001_initial.sql` — full schema with `updated_at` triggers and RLS (from `technical-spec.md` section 5)
- [ ] `supabase db push`
- [ ] Create Storage buckets: `thumbnails-private`, `thumbnails-public`
- [ ] Add all env vars to Vercel dashboard
- [ ] **RLS integration tests pass** (User B reads 0 rows of User A)

---

### Step 23 · Serverless Functions — F-11 (Week 14)

- [ ] `api/sessions.ts` — JWT verify → upsert session (explicit `updated_at` in payload)
- [ ] `api/share.ts` — POST: create 12-char token, insert into `share_tokens`
- [ ] `api/share/[token].ts` — GET: lookup token, return 410 if expired
- [ ] `api/profiles.ts` — GET/PUT brand presets in `profiles.brand_presets`
- [ ] Upgrade `ShareView.tsx` — detect `/share/:token` path vs `?wg=` param
- [ ] **F-11 ACs pass** ✓

---

### Step 24 · Supabase Auth — F-12 (Week 15)

- [ ] `npm install @supabase/supabase-js @supabase/ssr`
- [ ] `src/utils/supabase.ts` — `createBrowserClient` with anon key
- [ ] `src/pages/auth/LoginPage.tsx`, `SignupPage.tsx`, `CallbackPage.tsx`
- [ ] `api/auth/callback.ts` — OAuth callback handler
- [ ] Configure Supabase redirect URLs (wildcard for preview URLs — in Supabase dashboard, NOT Google Console)
- [ ] localStorage import prompt — atomic (all or nothing) on first login
- [ ] Route guard: redirect to `/login` without auth
- [ ] Add auth routes to `src/App.tsx`
- [ ] **F-12 ACs pass** ✓

---

### Step 25 · Session Sync + Multi-user (Weeks 16–17)

- [ ] Replace all `saveSessions()` calls with `POST /api/sessions`; keep localStorage as optimistic cache
- [ ] `wg_sync_queue` in localStorage — retry failed syncs on next app focus
- [ ] "Sync pending" indicator in UI when queue is non-empty
- [ ] Migrate brand presets from localStorage to `PUT /api/profiles` on login
- [ ] Migrate thumbnails: upload to `thumbnails-private` bucket; store path in `sessions.thumbnail_url`
- [ ] RLS integration tests: User B reads 0 rows of User A (two real test accounts)
- [ ] Load test with k6/Artillery: 50 virtual users, 10-min ramp → p95 <3s, 0 5xx

---

### Step 26 · Production Hardening (Week 18)

- [ ] Re-run axe-core — fix any regressions from Phase 4 changes
- [ ] Verify zero API keys in Chrome DevTools network tab
- [ ] Verify CSP header present in production response headers
- [ ] Verify zero stack traces in production error responses
- [ ] Set up Vercel Analytics
- [ ] `git tag v1.0.0`
- [ ] **All Phase 4 gate ACs pass**
- [ ] **Claude Code fills in `docs/phase-4-log.md`** — then tag v1.0.0

---

## Quick Reference — File Creation Order

| Step | Files created |
|---|---|
| 1 | `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.env.example`, `.github/workflows/ci.yml` |
| 2 | `src/types/index.ts`, `lib/widgetTypes.ts`, `lib/prompts.ts` |
| 3 | `src/store/useUIStore.ts`, `src/store/useSessionStore.ts` |
| 4 | `src/components/input/PromptInput.tsx`, `ImageUpload.tsx`, `VoiceInput.tsx`, `InputPanel.tsx` |
| 5 | `api/generate.ts`, `src/utils/layoutParser.ts`, `src/hooks/useGenerate.ts` |
| 6 | `src/components/layout/ErrorBoundary.tsx`, `src/styles/global.css`, all 12 widgets, `WireframeCanvas.tsx`, `CanvasToolbar.tsx`, `src/utils/themeVars.ts` |
| 7 | `SettingsPanel.tsx`, `ComponentToggles.tsx`, `AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `GeneratePage.tsx`, `App.tsx`, `main.tsx` |
| 9 | `src/hooks/useChatHistory.ts` |
| 10 | `RefinementChat.tsx`, `QuickPills.tsx` |
| 11 | `ComponentLibrary.tsx` |
| 12 | `src/utils/storage.ts` |
| 13 | `src/store/useHistoryStore.ts`, `src/hooks/useAutoSave.ts`, `HistoryItem.tsx`, `HistoryPanel.tsx` |
| 14 | `src/hooks/useVersionStack.ts`, `ExportBar.tsx` |
| 17 | `BrandPresetManager.tsx` |
| 18 | `src/utils/exportUtils.ts`, `src/utils/shareUtils.ts`, `ShareView.tsx` |
| 19 | `api/guide.ts`, `src/utils/devGuide.ts` |
| 22 | `supabase/migrations/001_initial.sql` |
| 23 | `api/sessions.ts`, `api/share.ts`, `api/share/[token].ts`, `api/profiles.ts` |
| 24 | `src/utils/supabase.ts`, `LoginPage.tsx`, `SignupPage.tsx`, `CallbackPage.tsx`, `api/auth/callback.ts` |
