---
phase: 10-evaluation-refinement-loop
plan: 01
subsystem: api
tags: [gemini, zod, typescript, evaluation, supabase]

requires:
  - phase: 09-extraction-upgrade
    provides: TypeFingerprintSchema + enriched DesignExtraction for evaluation context

provides:
  - evaluation_scores DB table (SQLite + Supabase)
  - EvaluationScore TypeScript interface
  - EvaluationResultSchema Zod (5 dimensions + critique)
  - EVALUATION_PROMPT (Agent D)
  - POST /api/evaluate — downloads both images, calls generateObject, persists row

affects: [10-02-refine-recraft, 10-03-output-tab-ui]

tech-stack:
  added: []
  patterns:
    - "Agent D uses same generateObject + getVisionProvider() pattern as Agent A"
    - "Two images passed as sequential content parts in a single user message"
    - "iteration = SELECT COUNT(*) for prompt_output_id + 1 at insert time"
    - "scores stored as JSON.stringify(EvaluationResult) in TEXT (SQLite) / JSONB (Supabase)"

key-files:
  created:
    - src/lib/schemas/evaluation-score.ts
    - src/app/api/evaluate/route.ts
  modified:
    - src/lib/schema.sql
    - src/lib/schema.postgres.sql
    - src/types/db.ts

key-decisions:
  - "GeneratedImage.provider union extended to include 'recraft' — done now to avoid a later type migration"
  - "scores column is TEXT in SQLite, JSONB in Supabase — JSON.stringify() at insert, no double-encoding"
  - "reference_image downloaded via supabase.storage.download(); generated image filename extracted from public URL"

duration: ~20min
started: 2026-04-01T00:00:00Z
completed: 2026-04-01T00:20:00Z
---

# Phase 10 Plan 01: Agent D + Evaluate API — Summary

**Created the `evaluation_scores` DB table, `EvaluationResultSchema` Zod (5 dimensions), and `POST /api/evaluate` (Agent D) — downloads both reference and generated images from Supabase Storage, calls Gemini 2.5 Flash vision via `generateObject`, and persists a structured score row. `pnpm typecheck` + `pnpm build` both exit 0. `/api/evaluate` appears as a dynamic route.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 3 completed |
| Files created | 2 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: evaluation_scores table in both schemas | Pass | SQLite TEXT scores, Supabase JSONB scores, correct FKs + index |
| AC-2: EvaluationResultSchema validates 5 dimensions | Pass | composition/typography/palette/layout/elements each with score/verdict/notes + critique |
| AC-3: POST /api/evaluate returns score row | Pass | Returns `{ id, scores, critique, iteration }` |
| AC-4: Both images passed to Agent D | Pass | referenceBuffer + generatedBuffer as sequential image content parts |
| AC-5: pnpm typecheck exits 0 | Pass | Zero errors |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/schema.sql` | Modified | `evaluation_scores` table + index |
| `src/lib/schema.postgres.sql` | Modified | `evaluation_scores` table + index (JSONB scores) |
| `src/types/db.ts` | Modified | `EvaluationScore` interface; `"recraft"` added to `GeneratedImage.provider` |
| `src/lib/schemas/evaluation-score.ts` | Created | `DimensionScoreSchema`, `EvaluationResultSchema`, `EVALUATION_PROMPT` |
| `src/app/api/evaluate/route.ts` | Created | Agent D endpoint |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `scores` stored as `JSON.stringify(result)` | Keeps TEXT/JSONB duality clean — no nested JSON-in-JSON | Plan 10-03 parses scores with `JSON.parse(row.scores)` |
| `iteration` derived from SELECT COUNT | Simple, no race condition risk for single-user tool | Accurate for sequential evaluations per output |
| `GeneratedImage.provider` extended to `"recraft"` now | Avoids a later TypeScript migration when 10-02 adds Recraft | 10-02 can use the type immediately |

## Deviations from Plan

None. All tasks executed exactly as specified.

## Next Phase Readiness

**Ready for Plan 10-02:**
- `evaluation_scores` table schema matches what `/api/refine` will need to read (critique for B2 input) and write (new iteration rows)
- `EvaluationScore.critique` field is writable — `PATCH /api/evaluation-scores/[id]` in 10-02 updates this column
- `GeneratedImage.provider` already includes `"recraft"` — no type change needed in 10-02

**Prerequisite for 10-02:**
- `RECRAFT_API_KEY` — user needs to obtain from recraft.ai before 10-02 can be applied

---
*Phase: 10-evaluation-refinement-loop, Plan: 01*
*Completed: 2026-04-01*
