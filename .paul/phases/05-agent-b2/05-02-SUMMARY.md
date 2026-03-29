---
phase: 05-agent-b2
plan: 02
subsystem: ui
tags: [streaming, react, next.js, blueprint-selector, generation-ui]

# Dependency graph
requires:
  - phase: 05-agent-b2/05-01
    provides: POST /api/rewrite streaming endpoint; X-Output-Id header; prompt_outputs DB save
  - phase: 03-agent-b1
    provides: grammar_blueprints table; GrammarBlueprint rows

provides:
  - GET /api/blueprints — lists grammar blueprints for a project (id, name, created_at)
  - Generation panel in PromptTab — blueprint selector, Generate button, streaming display, outputId state
  - outputId stored in component state — ready for Export Panel (05-03)
affects: [05-03-export-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Browser ReadableStream + TextDecoder for plain-text SSE consumption (no library needed)
    - IIFE pattern in JSX for conditional rendering with local variable (avoids prop drilling)
    - noUncheckedIndexedAccess guard — extract array[0] to const before use

key-files:
  created:
    - src/app/api/blueprints/route.ts
  modified:
    - src/app/projects/[id]/prompt-tab.tsx

key-decisions:
  - "GET /api/blueprints returns only (id, name, created_at) — minimal payload, no raw_prompts exposed"
  - "Generation panel appended to existing PromptTab — no new tab, no page restructure"
  - "Native <select> styled with Input tokens — avoids shadcn Select component uncertainty"
  - "loadBlueprints() called non-blocking after schema load — generation panel degrades gracefully if blueprint fetch fails"

patterns-established:
  - "noUncheckedIndexedAccess: extract array[n] to guard variable before use in both logic and JSX"
  - "IIFE in JSX for single-element conditional rendering requiring a local const"

# Metrics
duration: ~25min
started: 2026-03-29T00:00:00Z
completed: 2026-03-29T00:00:00Z
---

# Phase 5 Plan 02: Generation UI Summary

**Blueprint selector + Generate button + streaming prompt display added to the Prompt tab; GET `/api/blueprints` serves the selector; streamed output and `outputId` are stored in component state for Plan 05-03.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Started | 2026-03-29 |
| Completed | 2026-03-29 |
| Tasks | 4 completed (incl. checkpoint) |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Blueprints list endpoint | Pass | GET /api/blueprints returns array ordered by created_at DESC |
| AC-2: Missing project → 404 | Pass | Returns `{ error: "Project not found" }` |
| AC-3: Empty blueprints → [] | Pass | Returns 200 with empty array |
| AC-4: Blueprint selector visible | Pass | Pre-selects most recent (index 0, DESC order) |
| AC-5: No blueprints → informative message | Pass | Dashed empty state with Blueprint tab reference; Generate disabled |
| AC-6: Generate button streams output | Pass | POST /api/rewrite called; chunks accumulate in promptText state |
| AC-7: Generating state visible | Pass | Button shows "Generating…", disabled during stream |
| AC-8: Complete state | Pass | Button resets to "Generate", enabled after stream closes |
| AC-9: outputId stored | Pass | X-Output-Id header captured before body consumed; displayed below prompt |
| AC-10: Generation error handled | Pass | Non-2xx response sets generationError; button re-enables |
| AC-11: TypeScript strict mode passes | Pass | `pnpm typecheck` exits 0 |
| AC-12: Next.js build passes | Pass | `pnpm build` exits 0; `/api/blueprints` in manifest |

## Accomplishments

- `src/app/api/blueprints/route.ts` — GET handler returns `{ id, name, created_at }[]` for a project; 400/404 guards; minimal payload (no raw_prompts)
- `src/app/projects/[id]/prompt-tab.tsx` — generation panel appended below Elements: `BlueprintOption` type, 6 new state variables (`blueprints`, `selectedBlueprintId`, `generationPhase`, `promptText`, `outputId`, `generationError`), `loadBlueprints()` called non-blocking after schema loads, `generate()` streams via `ReadableStream` reader, IIFE pattern for single-blueprint display
- Human checkpoint approved — streaming display, selector, outputId label all verified live

## Task Commits

No per-task commits (will be included in Phase 5 transition commit).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/api/blueprints/route.ts` | Created | List blueprints for blueprint selector |
| `src/app/projects/[id]/prompt-tab.tsx` | Modified | Generation panel: selector + Generate + stream display |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| GET /api/blueprints returns minimal fields only | raw_prompts not needed in selector; keeps payload small | All blueprint list consumers use same lean endpoint |
| Native `<select>` instead of shadcn Select | Avoids component availability uncertainty; styled consistently with Input tokens | No new import or component dependency |
| `loadBlueprints()` non-blocking | Generation panel gracefully shows empty state if fetch fails; schema editor still works | Schema and generation concerns stay decoupled |
| IIFE in JSX for single-blueprint display | Needs a local `const bp = blueprints[0]` guard inside JSX — IIFE is cleaner than pulling into render scope | Pattern for future guarded array access in JSX |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential TS strict compliance fix |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One auto-fixed TS error, no scope creep.

### Auto-fixed Issues

**1. TypeScript — `noUncheckedIndexedAccess` on `data[0]` and `blueprints[0]`**
- **Found during:** Task 2 qualify (typecheck)
- **Issue:** Both `data[0].id` (in `loadBlueprints`) and `blueprints[0].name` (in JSX single-blueprint display) fail strict TS because array element access returns `T | undefined`
- **Fix:**
  - `loadBlueprints`: extracted `const first = data[0]; if (first) setSelectedBlueprintId(first.id)`
  - JSX: wrapped single-blueprint display in IIFE with `const bp = blueprints[0]; if (!bp) return null`
- **Files:** `src/app/projects/[id]/prompt-tab.tsx`
- **Verification:** `pnpm typecheck` exits 0

## Issues Encountered

None beyond the auto-fixed TS error.

## Next Phase Readiness

**Ready:**
- `outputId` stored in `PromptTab` state — 05-03 can read it to load the `prompt_outputs` row for export
- `promptText` in state — 05-03 can pass it to the export panel without a second fetch
- Blueprint selector pattern established — 05-03 needs no further blueprint work
- `/api/blueprints` route available for any future consumer

**Concerns:**
- Export panel (05-03) will need to extend `PromptTab` further — the component is growing; if it becomes unwieldy, consider extracting `GenerationPanel` as a sub-component in 05-03
- `outputId` is only available after generation completes — export panel must handle the pre-generation empty state

**Blockers:**
- None

---
*Phase: 05-agent-b2, Plan: 02*
*Completed: 2026-03-29*
