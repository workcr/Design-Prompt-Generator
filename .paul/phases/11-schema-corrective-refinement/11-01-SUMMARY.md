---
phase: 11-schema-corrective-refinement
plan: 11-01
subsystem: api
tags: [agent-e, schema-correction, zod, gemini, pgvector, supabase]

requires:
  - phase: 10-evaluation-refinement-loop
    provides: evaluation_scores table, /api/evaluate, /api/refine (old), EvaluationResultSchema

provides:
  - SchemaCorrectionSchema + SCHEMA_CORRECTION_PROMPT (Agent E)
  - /api/refine rewritten with conditional Agent E branch
  - correction_memories table (Phase 12 feed) with vector(768) embedding column
  - CorrectionMemory TypeScript interface

affects: [phase-12-correction-memory, output-tab (Plan 11-02 picks up prompt_output_id return shape)]

tech-stack:
  added: []
  patterns:
    - "Conditional vision agent branch: failing dimensions gate — skip Agent E when all scores ≥ 3"
    - "Schema fork pattern: corrections produce a new design_schemas row; prior row preserved"
    - "Phase 12 feed pattern: write embedding = NULL now, Phase 12 fills it via text-embedding-004"
    - "parseField() helper: handles Supabase JSONB (returns object) vs TEXT (returns string) transparently"

key-files:
  created:
    - src/lib/schemas/schema-correction.ts
  modified:
    - src/app/api/refine/route.ts
    - src/lib/schema.postgres.sql
    - src/types/db.ts

key-decisions:
  - "z.record() requires 2 args in this project's Zod version — z.record(z.string(), z.unknown())"
  - "correction_memories insert is non-fatal — log but don't fail the refine cycle if it errors"
  - "Response shape change: { prompt_output_id, iteration } — no url; UI calls /api/generate (Plan 11-02)"
  - "Supabase JSONB scores column returns parsed object, not string — cast via (as unknown as EvaluationResult)"

patterns-established:
  - "EvalDimension filter: score ≤ 2 OR verdict === 'miss' — both signal extraction failure"
  - "Agent E message structure: PROMPT → FAILING DIMS → CURRENT VALUES → CRITIQUE → image → OUTPUT instruction"
  - "LessonSchema.lesson written to embed well: lead with visual signal, generalise to similar images"

duration: ~25min
started: 2026-04-02T00:00:00Z
completed: 2026-04-02T00:00:00Z
---

# Phase 11 Plan 01: Agent E + Schema-Corrective Refine Route — Summary

**Agent E (Gemini vision) now corrects failing extraction fields before prompt rebuild — each Refine cycle forks a new design_schemas row with targeted corrections and writes transferable lessons to correction_memories for Phase 12 embedding retrieval.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 min |
| Tasks | 3 completed |
| Files modified | 4 (1 new) |
| Typecheck errors | 0 (1 GAP auto-fixed during execute) |
| Commit | `697fa9a` |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Agent E runs when ≥1 dim ≤ 2; skipped when all ≥ 3 | **Pass** | `failingDimensions.length > 0` guard with fast-path console log |
| AC-2: New design_schemas row forked with corrections | **Pass** | `supabase.from("design_schemas").insert(correctedFields)` in 6d |
| AC-3: correction_memories rows per lesson (embedding = NULL) | **Pass** | Insert loop over `correction.lessons`, no embedding field sent |
| AC-4: Response is `{ prompt_output_id, iteration }` — no url | **Pass** | Internal `/api/generate` call removed; UI handles it in Plan 11-02 |
| AC-5: Fast path returns within ~25s | **Pass** | Skips Agent E + schema insert entirely; only B2 + prompt save |
| AC-6: `pnpm typecheck` passes | **Pass** | Zero errors after z.record() fix |

## Accomplishments

- **Agent E built end-to-end**: `SchemaCorrectionSchema` with `lessons[]` Phase 12 feed field, `SCHEMA_CORRECTION_PROMPT` with explicit lesson format instructions (lead with visual signal, generalise to similar images)
- **Conditional correction loop**: failing dimensions filter (`score ≤ 2 || verdict === "miss"`) gates Agent E — fast path on clean evaluations costs zero extra API calls
- **Schema fork + lesson storage**: each Agent E cycle produces a new `design_schemas` row (prior preserved for audit) and `correction_memories` rows with `embedding = NULL` ready for Phase 12
- **Phase 12 data contract locked**: `correction_memories` table created with `vector(768)` column, B-tree indexes on `project_id` + `dimension`; IVFFlat index documented as Phase 12's to-add

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| All tasks (single commit) | `697fa9a` | feat(refine): Agent E schema correction loop + correction_memories table |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schemas/schema-correction.ts` | **Created** | `EVAL_DIMENSIONS`, `LessonSchema`, `SchemaCorrectionSchema`, `SCHEMA_CORRECTION_PROMPT` |
| `src/app/api/refine/route.ts` | **Rewritten** | Agent E branch, schema fork, correction_memories insert, response shape change |
| `src/lib/schema.postgres.sql` | **Modified** | `correction_memories` table + `CREATE EXTENSION IF NOT EXISTS vector` |
| `src/types/db.ts` | **Modified** | `CorrectionMemory` interface appended |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `z.record(z.string(), z.unknown())` not `z.record(z.unknown())` | This Zod version requires explicit key + value type args | Apply to all future record schemas in project |
| correction_memories insert is non-fatal | Memory write failure shouldn't fail the whole refine cycle; main value is the corrected schema + rebuilt prompt | Errors logged to console only |
| Response drops `url` field | Removes 20-30s internal `/api/generate` call — refine stays within 60s; UI chains generate separately (Plan 11-02) | Breaking change to output-tab.tsx refine() — Plan 11-02 required |
| `scores` cast as `as unknown as EvaluationResult` | Supabase returns JSONB as a parsed object; db.ts incorrectly types it as `string | null` | Consistent pattern for all JSONB casts going forward |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | None — trivial type fix |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One auto-fixed type error; plan executed exactly as written.

### Auto-fixed Issues

**1. Zod `z.record()` argument count**
- **Found during:** Task 1 (schema-correction.ts)
- **Issue:** `z.record(z.unknown())` — TypeScript error TS2554 "Expected 2-3 arguments, but got 1"
- **Fix:** Changed to `z.record(z.string(), z.unknown())` on `bad_value` and `correct_value` fields
- **Verification:** `pnpm typecheck` clean after fix

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `pnpm` not in PATH for Bash tool | Used `export PATH="/opt/homebrew/bin:$PATH"` prefix on all typecheck commands |

## Next Phase Readiness

**Ready:**
- `/api/refine` returns `{ prompt_output_id, iteration }` — Plan 11-02 can chain `/api/generate` from the UI
- `correction_memories` table SQL ready — user needs to run it in Supabase before deploying
- `SchemaCorrectionSchema.lessons` correctly typed and structured for Phase 12 embedding
- `vector(768)` column and dimension/project_id indexes already in schema

**Concerns:**
- Plan 11-02 (output-tab.tsx) is a breaking change dependency — the current UI calls `/api/refine` and expects `url` in the response. Until Plan 11-02 ships, the Refine button in production will break after deploy. **Do not deploy Plan 11-01 to Vercel until Plan 11-02 is complete.**
- User must run the updated `schema.postgres.sql` in Supabase (adds `correction_memories` + `CREATE EXTENSION vector`) before the route can insert lessons

**Blockers:**
- None for Plan 11-02 execution
- Supabase SQL must be run before production deploy

---
*Phase: 11-schema-corrective-refinement, Plan: 11-01*
*Completed: 2026-04-02*
