---
phase: 05-agent-b2
plan: 01
subsystem: api
tags: [streaming, vercel-ai-sdk, ollama, sqlite, prompt-engineering]

# Dependency graph
requires:
  - phase: 04-prompt-editor
    provides: PATCH /api/schemas/[id] with locked_fields; DesignSchema with locked_fields JSON column
  - phase: 03-agent-b1
    provides: grammar_blueprints table; GrammarBlueprint type; GrammarBlueprintExtraction type

provides:
  - POST /api/rewrite — streaming endpoint that merges schema + blueprint into final image-gen prompt
  - B2_REWRITE_SYSTEM_PROMPT — Agent B2 identity + rules
  - buildRewriteInput() — serialiser that marks schema sections LOCKED/unlocked for the LLM
  - prompt_outputs rows saved on stream completion with pre-generated ID
  - X-Output-Id header — client receives DB record ID before stream ends
affects: [05-02-generation-ui, 05-03-export-panel, 08-production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-generate UUID before streaming; return as response header (X-Output-Id)
    - streamText() + toTextStreamResponse() for free-text streaming (not generateObject)
    - onFinish callback for post-stream DB persistence
    - GrammarBlueprintExtraction["sequence_pattern"] indexed type (SequencePattern not exported)

key-files:
  created:
    - src/lib/schemas/prompt-rewrite.ts
    - src/app/api/rewrite/route.ts
  modified: []

key-decisions:
  - "toTextStreamResponse() not toDataStreamResponse() — AI SDK v6 API for plain text streams"
  - "GrammarBlueprintExtraction[\"sequence_pattern\"] for type-safe sequence access without exporting SequencePattern"
  - "schema_snapshot = JSON.stringify(full DesignSchema row) — captures entire schema state at generation time"
  - "blueprintId optional — falls back to latest blueprint for project if omitted"

patterns-established:
  - "Pre-generate ID pattern: randomUUID() before stream → X-Output-Id header → onFinish writes row with known ID"
  - "buildRewriteInput() marks each schema section LOCKED or unlocked based on lockedFields array"

# Metrics
duration: ~30min
started: 2026-03-29T00:00:00Z
completed: 2026-03-29T00:00:00Z
---

# Phase 5 Plan 01: Agent B2 Backend Summary

**Streaming POST `/api/rewrite` built — merges edited design schema (with locked fields) and grammar blueprint into a final image-generation prompt via Agent B2; output saved to `prompt_outputs` on stream completion.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-03-29 |
| Completed | 2026-03-29 |
| Tasks | 4 completed |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: System prompt file created | Pass | `B2_REWRITE_SYSTEM_PROMPT` and `buildRewriteInput()` exported from `src/lib/schemas/prompt-rewrite.ts` |
| AC-2: Route file created | Pass | POST handler at `/api/rewrite` |
| AC-3: Missing schema → 400 | Pass | Returns `{ error: "No design schema found for this project" }` |
| AC-4: Missing blueprint → 400 | Pass | Returns `{ error: "No grammar blueprint found" }` |
| AC-5: blueprintId lookup works | Pass | Named blueprint loaded; 404 if not found |
| AC-6: Streaming response returned | Pass | `toTextStreamResponse()` returns SSE stream |
| AC-7: X-Output-Id header present | Pass | Pre-generated UUID injected into response headers |
| AC-8: prompt_outputs row on completion | Pass | `onFinish` inserts with pre-generated `outputId` |
| AC-9: Locked fields passed to buildRewriteInput | Pass | `schema.locked_fields` parsed; sections marked LOCKED/unlocked |
| AC-10: TypeScript strict mode passes | Pass | `pnpm typecheck` exits 0 |
| AC-11: Next.js build passes | Pass | `pnpm build` exits 0; `/api/rewrite` in route manifest |

## Accomplishments

- `src/lib/schemas/prompt-rewrite.ts` — `B2_REWRITE_SYSTEM_PROMPT` instructs Agent B2 as a professional prompt engineer with 7 strict output rules; `buildRewriteInput()` serialises all 6 schema sections (frame, palette, layout, type_scale, text_fields, elements) with LOCKED/unlocked status + full grammar blueprint sub-fields (summary, sequence template, compression, density, sentence structure, qualifier placement, characteristic phrases, style vocabulary)
- `src/app/api/rewrite/route.ts` — validates body, verifies project, loads schema + blueprint (by ID or latest), parses locked fields, pre-generates `outputId`, calls `streamText()`, saves `prompt_outputs` row in `onFinish`, returns stream with `X-Output-Id` header
- Two auto-fixed API surface issues resolved during execution (no plan changes required)

## Task Commits

No per-task commits made during this plan (committed as part of Phase 4 transition commit at `64cd189`). Files will be included in Phase 5 git commit at phase transition.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schemas/prompt-rewrite.ts` | Created | B2 system prompt + `buildRewriteInput()` serialiser |
| `src/app/api/rewrite/route.ts` | Created | Streaming POST handler — validates, loads, streams, saves |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `toTextStreamResponse()` instead of `toDataStreamResponse()` | AI SDK v6 dropped `toDataStreamResponse()` for plain text; `toTextStreamResponse()` is the correct v6 API | All future streaming routes use `toTextStreamResponse()` |
| `GrammarBlueprintExtraction["sequence_pattern"]` as type | `SequencePattern` is not exported from `grammar-blueprint.ts`; indexed access works without new export | Pattern for accessing unexported nested types |
| `schema_snapshot = JSON.stringify(full DesignSchema row)` | Captures the exact schema state at generation time — enables faithful reproduction of any past prompt | `prompt_outputs` rows are self-contained snapshots |
| `blueprintId` optional in request | Most callers will want latest blueprint; explicit ID needed for blueprint-selector UI in 05-02 | 05-02 can pass `blueprintId` once selector is built |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential API surface corrections, no scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** Two auto-fixed errors — both were AI SDK / type system API surface issues not visible until execution.

### Auto-fixed Issues

**1. AI SDK — `toDataStreamResponse()` does not exist in v6**
- **Found during:** Task 3 (route creation)
- **Issue:** Plan specified `result.toDataStreamResponse()` but AI SDK v6 only has `toTextStreamResponse()` for plain text streams; `toDataStreamResponse()` is for structured data streams and does not exist
- **Fix:** Replaced `result.toDataStreamResponse()` with `result.toTextStreamResponse()`
- **Files:** `src/app/api/rewrite/route.ts`
- **Verification:** `pnpm typecheck` exits 0

**2. TypeScript — `SequencePattern` not exported from grammar-blueprint.ts**
- **Found during:** Task 2 (prompt-rewrite.ts creation)
- **Issue:** Plan referenced `SequencePattern` import from `@/lib/schemas/grammar-blueprint` but only `GrammarBlueprintExtraction` and `GrammarBlueprintExtractionSchema` are exported
- **Fix:** Changed `type ParsedSequence = SequencePattern` to `type ParsedSequence = GrammarBlueprintExtraction["sequence_pattern"]`
- **Files:** `src/lib/schemas/prompt-rewrite.ts`
- **Verification:** `pnpm typecheck` exits 0

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Next Phase Readiness

**Ready:**
- `POST /api/rewrite` is fully operational — 05-02 can wire the Generate button to it immediately
- `X-Output-Id` header available — 05-02 can store the output ID for the export panel
- `prompt_outputs` rows saved on completion — 05-03 can load them for the export panel
- `blueprintId` param ready — 05-02 blueprint selector can pass selected ID directly

**Concerns:**
- Blueprint selector UI (deferred from 03-02) is on 05-02's plate — if user has multiple blueprints, `/api/rewrite` defaults to latest which may not be desired
- Platform syntax formatting deferred to 05-03 — the system prompt explicitly tells B2 not to add platform tags

**Blockers:**
- None

---
*Phase: 05-agent-b2, Plan: 01*
*Completed: 2026-03-29*
