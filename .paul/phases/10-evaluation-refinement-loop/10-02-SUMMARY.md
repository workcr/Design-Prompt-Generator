---
phase: 10-evaluation-refinement-loop
plan: 02
subsystem: api
tags: [recraft, refine, evaluation, typescript, supabase]

requires:
  - phase: 10-01
    provides: evaluation_scores table + EvaluationScore type

provides:
  - Recraft.ai provider in env.ts + generate/route.ts
  - POST /api/refine — critique-aware B2 rewrite → image generation
  - PATCH /api/evaluation-scores/[id] — save user critique edits

affects: [10-03-output-tab-ui]

tech-stack:
  added:
    - RECRAFT_API_KEY (optional env var — set when key available)
  patterns:
    - "Recraft uses direct REST (not AI SDK) — consistent with Gemini image gen pattern from Phase 6"
    - "IMAGE_GEN_PROVIDER enum extended to 3 values: nano_banana_2 | replicate | recraft"
    - "/api/refine uses generateText (non-streaming) then calls /api/generate via internal fetch"
    - "Critique appended to buildRewriteInput() output as REFINEMENT FEEDBACK section — prompt-rewrite.ts unchanged"

key-files:
  created:
    - src/app/api/refine/route.ts
    - src/app/api/evaluation-scores/[id]/route.ts
  modified:
    - src/lib/env.ts
    - src/app/api/generate/route.ts

key-decisions:
  - "/api/refine calls /api/generate via internal fetch — avoids duplicating 60+ lines of image gen logic"
  - "Critique appended outside buildRewriteInput() — shared function unchanged; critique is refine-specific"
  - "RECRAFT_API_KEY is optional in Zod schema — deploy and existing providers work without it"

duration: ~20min
started: 2026-04-01T00:30:00Z
completed: 2026-04-01T00:50:00Z
---

# Phase 10 Plan 02: Refine Pipeline + Recraft Provider — Summary

**Added Recraft as a third image gen provider, created `POST /api/refine` (critique-aware B2 rewrite → image in one call), and `PATCH /api/evaluation-scores/[id]` for saving critique edits. `pnpm typecheck` + `pnpm build` both exit 0. All 5 new routes appear in build output.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 3 completed |
| Files created | 2 |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Recraft provider wired end-to-end | Pass | recraftv3 branch in generate/route.ts; downloads + uploads to Supabase Storage |
| AC-2: RECRAFT_API_KEY optional | Pass | `z.string().optional()` — absent key only errors if provider=recraft is actually invoked |
| AC-3: POST /api/refine returns new image | Pass | Returns `{ prompt_output_id, generated_image_id, url, iteration }` |
| AC-4: Critique in B2 rewrite input | Pass | Appended as `REFINEMENT FEEDBACK` section after `buildRewriteInput()` output |
| AC-5: PATCH saves critique | Pass | Updates critique field, returns `{ id, critique }` |
| AC-6: pnpm typecheck exits 0 | Pass | Zero errors |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/env.ts` | Modified | `"recraft"` in IMAGE_GEN_PROVIDER enum; `RECRAFT_API_KEY` optional; return type updated |
| `src/app/api/generate/route.ts` | Modified | Recraft branch added; `else` → `else if (replicate)` + `else (recraft)` |
| `src/app/api/refine/route.ts` | Created | Critique-aware B2 rewrite → generateText → /api/generate → return |
| `src/app/api/evaluation-scores/[id]/route.ts` | Created | PATCH critique field |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `/api/refine` calls `/api/generate` via internal fetch | Avoids duplicating 60+ lines of multi-provider image gen logic | If origin detection fails (edge cases), image gen step throws — acceptable |
| Critique appended outside `buildRewriteInput()` | The shared function is stable and used by `/api/rewrite`; critique is refine-specific | `prompt-rewrite.ts` unchanged; no regression risk |
| Recraft as REST-only (not AI SDK) | Consistent with Gemini image gen pattern established in Phase 6; Recraft API is not in AI SDK | No new AI SDK package needed |

## Deviations from Plan

None. All tasks executed exactly as specified.

## Next Phase Readiness

**Ready for Plan 10-03 (Output Tab UI):**
- `POST /api/evaluate` → returns `{ id, scores, critique, iteration }` — UI reads this to render verdict chips
- `PATCH /api/evaluation-scores/[id]` → UI calls this when user edits critique textarea
- `POST /api/refine` → UI calls this when user clicks Refine button — returns `{ url, iteration }` for side-by-side update
- All response shapes are stable — UI plan can be written against these contracts

**Prerequisite for Recraft generation:**
- Set `RECRAFT_API_KEY` in Vercel env vars + `.env.local`
- Set `IMAGE_GEN_PROVIDER=recraft` to activate (or leave unset to keep nano_banana_2 as default)

---
*Phase: 10-evaluation-refinement-loop, Plan: 02*
*Completed: 2026-04-01*
