---
phase: 10-evaluation-refinement-loop
plan: 03
subsystem: ui
tags: [output-tab, evaluation, refinement, typescript, react]

requires:
  - phase: 10-01
    provides: POST /api/evaluate returning { id, scores, critique, iteration }
  - phase: 10-02
    provides: POST /api/refine + PATCH /api/evaluation-scores/[id]

provides:
  - Evaluation loop UI in Output Tab (Evaluate button → verdict chips → critique → Refine)
  - VerdictChip component (green/amber/red by verdict)
  - EvalPhase state machine integrated into existing output-tab.tsx

affects: [v0.2-milestone-complete]

tech-stack:
  added: []
  patterns:
    - "EvalPhase state machine: idle → evaluating → scored → refining → error"
    - "500ms debounce auto-save for critique via PATCH"
    - "Refine resets evalPhase to idle and updates image URL in-place (no re-fetch)"
    - "/api/generated-images returns single object — evaluate() reads .id directly (not array)"

key-files:
  modified:
    - src/app/projects/[id]/output-tab.tsx

key-decisions:
  - "EvaluationScores + EvaluationData interfaces local to output-tab.tsx — not imported from lib"
  - "Critique auto-save is fire-and-forget — no loading state on save, silent background write"
  - "disabled={evalPhase === 'evaluating'} removed from Evaluate button — TypeScript narrows the union type inside the guard, making the comparison unreachable"

duration: ~20min
started: 2026-04-01T01:00:00Z
completed: 2026-04-01T01:20:00Z
---

# Phase 10 Plan 03: Output Tab UI — Summary

**Extended Output Tab with the full evaluation + refinement loop: Evaluate button → 5 verdict chips (match/partial/miss) → editable critique textarea (auto-saved) → Refine → updated image in-place with iteration badge. All existing generate/regenerate/download behaviour preserved. `pnpm typecheck` + `pnpm build` both exit 0.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~20 min |
| Tasks | 3 completed |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Evaluate button calls /api/evaluate | Pass | evalPhase transitions idle → evaluating → scored |
| AC-2: 5 verdict chips with colour coding | Pass | green (match) / amber (partial) / red (miss) with score + notes |
| AC-3: Critique textarea auto-saved (debounced) | Pass | 500ms debounce → PATCH /api/evaluation-scores/[id] fire-and-forget |
| AC-4: Refine updates generated image in-place | Pass | evalPhase → refining → idle; image_url updated in outputs state |
| AC-5: Iteration badge on Generated label | Pass | Shows "Iteration N" when iteration > 1 |
| AC-6: Existing flow unchanged | Pass | Generate/Regenerate/Download buttons unaffected |
| AC-7: pnpm typecheck exits 0 | Pass | Zero errors after narrowing fix |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/projects/[id]/output-tab.tsx` | Modified | Full evaluation loop UI + VerdictChip + EvalPhase state machine |

## Deviations from Plan

### Auto-fixed

**1. `disabled={evalPhase === "evaluating"}` inside narrowed guard**
- **Found during:** typecheck
- **Issue:** Inside `(evalPhase === "idle" || evalPhase === "error")` guard, TypeScript correctly narrows `evalPhase` to `"idle" | "error"`. Comparing to `"evaluating"` is unreachable — TS2367 error.
- **Fix:** Removed the `disabled` prop from inside that guard (the button is already unreachable when evaluating since the block only renders for idle/error)
- **Impact:** None — correct behaviour preserved

**2. `/api/generated-images` returns single object, not array**
- **Found during:** Task 3 read
- **Issue:** Plan's `evaluate()` function was written expecting `{ id: string }[]` but the route returns a single `GeneratedImage` object
- **Fix:** Changed `(await giRes.json()) as { id: string }` (single object) — reads `.id` directly
- **Impact:** None — correct ID obtained

## Phase 10 Complete ✅

All 3 plans shipped:
- **10-01:** evaluation_scores table + Agent D (`POST /api/evaluate`)
- **10-02:** Recraft provider + `POST /api/refine` + `PATCH /api/evaluation-scores/[id]`
- **10-03:** Output Tab UI — full evaluation + refinement loop

---
*Phase: 10-evaluation-refinement-loop, Plan: 03*
*Completed: 2026-04-01*
