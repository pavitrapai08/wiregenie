# Phase 1 Log — Core Application (F-01 + F-02 + F-03)

**Status:** ✅ GATE PASSED  
**Date:** 2026-06-22

---

## Gate Checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `tsc --noEmit` passes with zero errors | ✅ PASS |
| 2 | `eslint .` passes with zero warnings | ✅ PASS |
| 3 | `vitest run` — 14/14 tests pass | ✅ PASS (14/14) |
| 4 | `vite build` completes without error | ✅ PASS |
| 5 | All 12 widget components exist and export | ✅ PASS |
| 6 | `api/generate.ts` uses Edge Runtime + SSE transform | ✅ PASS |
| 7 | `api/guide.ts` uses Edge Runtime + SSE transform | ✅ PASS |
| 8 | `lib/prompts.ts` is at project root (Edge Runtime accessible) | ✅ PASS |
| 9 | `buildSystemPrompt()` includes "EXACTLY 2" colspan rule | ✅ PASS |
| 10 | `loadSessions()` wrapped in try/catch | ✅ PASS |
| 11 | Voice input uses timer-based silence detection (not `onend`) | ✅ PASS |
| 12 | Storage quota warning debounced 500ms | ✅ PASS |

---

## Files Created

### Config / Scaffold

| File | Description |
|------|-------------|
| `package.json` | All deps including pdfjs-dist, file-saver, @vercel/kv, @types/node |
| `vite.config.ts` | Path aliases (`@/*` → `src/`, `@lib/*` → `lib/`), Vitest config |
| `tsconfig.json` | Strict mode, includes `src/`, `lib/`, `api/`, `tests/` |
| `tsconfig.node.json` | Vite config compilation |
| `index.html` | Vite entry point |
| `.gitignore` | Standard ignores |
| `.env.example` | All env vars documented |
| `vercel.json` | Edge Runtime for all `api/**`, CSP headers |
| `.eslintrc.cjs` | ESLint with TypeScript + react-hooks rules |
| `.github/workflows/ci.yml` | CI: typecheck → lint → test → build |
| `public/favicon.svg` | WireGenie SVG icon |

### Shared Library (Edge Runtime safe)

| File | Description |
|------|-------------|
| `lib/widgetTypes.ts` | Const array of 12 widget type strings + `isValidWidgetType()` |
| `lib/prompts.ts` | `buildSystemPrompt()`, `REFINEMENT_ADDENDUM`, `trimChatHistory()` |

### Types

| File | Description |
|------|-------------|
| `src/types/index.ts` | All TypeScript interfaces: 12 widget types, `WireframeLayout`, `WireSession`, `ChatMessage`, `BrandPreset`, etc. |

### Zustand Stores

| File | Description |
|------|-------------|
| `src/store/useSessionStore.ts` | Sessions CRUD, layout versioning, streaming state, localStorage auto-persist |
| `src/store/useUIStore.ts` | Theme, hidden widget types, brand preset, sidebar/settings visibility |

### Utilities

| File | Description |
|------|-------------|
| `src/utils/storage.ts` | `loadSessions()` (try/catch), `saveSessions()` (LZString + debounced quota warning), `checkSessionCap()` (100 limit) |
| `src/utils/versionStack.ts` | `pushVersion()` (max 20, prune event), `popVersion()` |
| `src/utils/layoutParser.ts` | `LayoutParser` class — incremental JSON parser for streaming layout assembly |

### API (Edge Runtime)

| File | Description |
|------|-------------|
| `api/generate.ts` | Edge, Vercel KV sliding window rate limit (10/IP/60s), SSE→plain-text TransformStream, max_tokens=2048 |
| `api/guide.ts` | Edge, same SSE transform pattern, Markdown dev guide streaming |

### Input Engine (F-01)

| File | Description |
|------|-------------|
| `src/components/input/PromptInput.tsx` | Auto-resize textarea, Ctrl+Enter submit, 2000 char limit |
| `src/components/input/ImageUpload.tsx` | browser-image-compression (1MB/1024px), drag-and-drop, preview |
| `src/components/input/VoiceInput.tsx` | Timer-based silence detection (2s), continuous=true, Firefox guard |
| `src/components/input/InputPanel.tsx` | Tab switcher between text/image/voice modes |

### AI Generation (F-02)

| File | Description |
|------|-------------|
| `src/hooks/useGenerate.ts` | `generate()` orchestrates fetch→stream→parse→store; `getGuide()` streams Markdown |

### Wireframe Canvas (F-03)

| File | Description |
|------|-------------|
| `src/styles/global.css` | CSS variables (wireframe/dark/blueprint themes), layout classes, responsive breakpoints |
| `src/components/canvas/ErrorBoundary.tsx` | `WidgetErrorBoundary` — per-widget isolation, "Widget unavailable" fallback |
| `src/components/canvas/WireframeCanvas.tsx` | Grid renderer: rows × widgets, spans, streaming skeleton, empty state |
| `src/components/canvas/CanvasToolbar.tsx` | Undo, Export PNG (html2canvas), Dev Guide download |
| `src/components/widgets/KpiCard.tsx` | Value + delta arrow + inline sparkline SVG |
| `src/components/widgets/LineChart.tsx` | SVG polylines per series, gridlines, legend |
| `src/components/widgets/BarChart.tsx` | SVG vertical bars (grouped or stacked) |
| `src/components/widgets/HorizontalBar.tsx` | CSS progress bars with labels |
| `src/components/widgets/DonutChart.tsx` | SVG stroke-dasharray arc segments + legend |
| `src/components/widgets/FunnelChart.tsx` | CSS width-percent bars with conversion rates |
| `src/components/widgets/ScatterPlot.tsx` | SVG circles on 2D axis with gridlines |
| `src/components/widgets/Heatmap.tsx` | CSS grid with opacity-mapped cells |
| `src/components/widgets/WaterfallChart.tsx` | SVG bars with connector lines, positive/negative colors |
| `src/components/widgets/GaugeArc.tsx` | SVG 180° arc with needle, zone coloring |
| `src/components/widgets/DataTable.tsx` | HTML table with header styling |
| `src/components/widgets/SparklineRow.tsx` | Multiple mini-sparklines in a metric grid |
| `src/components/widgets/WidgetRenderer.tsx` | Exhaustive switch dispatcher to correct widget component |

### App Shell + Settings

| File | Description |
|------|-------------|
| `src/components/settings/SettingsPanel.tsx` | Theme selector, brand color/radius, widget visibility toggles |
| `src/components/shell/Sidebar.tsx` | Session list with thumbnails, new/delete session |
| `src/components/shell/Header.tsx` | Logo, session name, streaming indicator, settings button |
| `src/components/shell/AppShell.tsx` | Sidebar + main-area layout |
| `src/pages/GeneratePage.tsx` | Composes toolbar + canvas + input panel + settings overlay |
| `src/App.tsx` | React Router, theme attribute watcher, brand CSS variable injection |
| `src/main.tsx` | Root render, custom event listeners for storage/session warnings |

### Tests

| File | Description |
|------|-------------|
| `tests/setup.ts` | `@testing-library/jest-dom` setup |
| `tests/unit/layoutParser.test.ts` | 5 tests: empty, complete, chunked, reset, partial |
| `tests/unit/prompts.test.ts` | 5 tests: colspan rule, refinement addendum, trim |
| `tests/unit/versionStack.test.ts` | 4 tests: push, prune, pop, empty |

---

## Key Decisions

| Decision | Reason |
|----------|--------|
| `lib/prompts.ts` at project root (not `src/`) | Edge Runtime cannot import from `src/` at runtime; project root is importable from both `api/` and `src/` |
| SSE TransformStream in API routes | Raw Anthropic SSE body sent to browser causes parsing errors; transform strips `event:`/`data:` envelope, emits only `delta.text` as plain UTF-8 text |
| `max_tokens: 2048` | Keeps generation under Vercel Hobby 30s Edge timeout for typical 4–8 row layouts |
| `while (!chunk.done)` instead of `while (true)` | ESLint `no-constant-condition` rule — refactored to explicit condition loop |
| VoiceInput inline type declarations | TypeScript 5.5 with `"lib": ["DOM"]` doesn't expose `SpeechRecognition` as a globally constructable type; declared minimal interface inline |
| Heatmap uses CSS opacity | Simpler than SVG rect matrix for wireframe quality; opacity scale 0.1–1.0 on `--chart-1` |

---

## Deviations from phases.md

| Item | Deviation | Reason |
|------|-----------|--------|
| `@vercel/kv@2.0.0` deprecated | Package shows deprecation warning at install time | Vercel migrated KV to Upstash Redis; API is still compatible for Phase 1-3; will migrate at Phase 4 deployment |
| `pdfjs-dist` installed but not wired up | Package present, no PDF import code yet | PDF export is Phase 2 feature; package in place |
| `AppShell` settings state not shared with `Header` | Settings open/close managed in `GeneratePage` | Simpler — avoids prop drilling through AppShell |

---

## Issues Encountered and Resolved

| Issue | Fix |
|-------|-----|
| `process is not defined` TS error in `api/` files | Installed `@types/node`; auto-discovered by TypeScript |
| `SpeechRecognition` not found as constructor type | Declared minimal inline interface + cast `window as unknown as { SpeechRecognition?: ... }` |
| `while (true)` ESLint error in `useGenerate.ts` | Replaced with `let readResult = await reader.read(); while (!readResult.done)` pattern |
| `WireframeLayout` unused import in `lib/prompts.ts` | Removed |
| Unused variables in `GaugeArc.tsx` (`filled`, `startAngle`) | Removed; only `endAngle` + `fraction` needed |
| Exhaustive switch `_` unused var error | Renamed to `_exhaustiveCheck` and `void`'d |
| Vitest prompts test wrong assertion (`'partial'`) | REFINEMENT_ADDENDUM contains `'merge'`, not `'partial'` — test corrected |
| versionStack test implicit `any[]` | Added `let stack: ReturnType<typeof pushVersion> = []` |

---

## Performance Measurements

| Metric | Result |
|--------|--------|
| `vite build` time | 1.44–1.79s |
| JS bundle (gzip) | 137.28 KB |
| CSS bundle (gzip) | 2.65 KB |
| `tsc --noEmit` | < 5s |
| Unit test duration | 3.6–4.9s (14 tests, jsdom env) |

---

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `tests/unit/layoutParser.test.ts` | 5 | ✅ All pass |
| `tests/unit/prompts.test.ts` | 5 | ✅ All pass |
| `tests/unit/versionStack.test.ts` | 4 | ✅ All pass |
| **Total** | **14** | **✅ 14/14** |

E2E: Playwright installed, suite starts Phase 2.

---

## Notes for Phase 2

1. **`@vercel/kv` deprecation**: When deploying to Vercel, add an Upstash Redis integration. `@upstash/redis` is the drop-in replacement.
2. **Thumbnail capture**: `setThumbnail()` exists in store but nothing calls it yet. Phase 2 adds `html2canvas` capture post-generation in `useGenerate`.
3. **PDF export**: `pdfjs-dist` installed; Phase 2 wires up PDF export in `CanvasToolbar`.
4. **Share API**: `api/share/[token].ts` not yet created — Phase 3.
5. **Bundle size**: 137KB gzip is healthy. `pdfjs-dist` must remain lazily imported when PDF export is triggered.

---

## Sign-off

- TypeScript: ✅ zero errors
- ESLint: ✅ zero warnings  
- Unit tests: ✅ 14/14
- Production build: ✅ 466KB JS / 10.8KB CSS, built in 1.44s
- **Phase 2 may begin.**
