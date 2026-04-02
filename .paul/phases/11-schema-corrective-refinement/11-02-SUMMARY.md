---
phase: 11-schema-corrective-refinement
plan: 02
subsystem: ui
tags: [react, state-machine, refine, two-step, output-tab]

requires:
  - phase: 11-schema-corrective-refinement
    plan: 11-01
    provides: /api/refine returns { prompt_output_id, iteration } — no url

provides:
  - 2-step refine() function in output-tab.tsx
  - refineStep state ("correcting" | "generating" | null)
  - Fix: activeOutput.id updated to new prompt_output_id after refine

affects: [phase-12-correction-memory]

tech-stack:
  added: []
  patterns:
    - "2-step async UI: chain dependent fetches with distinct loading labels via sub-state"
    - "Fix activeOutput.id on refine: update o.id alongside image_url so next Evaluate uses correct output"

key-files:
  modified:
    - src/app/projects/[id]/output-tab.tsx

key-decisions:
  - "refineStep is component-local — no persistence, resets on output switch and error"
  - "Both fetch error paths use content-type check before res.json() (timeout resilience)"

patterns-established:
  - "Multi-step fetch: set sub-state label before each await, null it in both success + catch"

duration: ~10min
started: 2026-04-02T00:00:00Z
completed: 2026-04-02T00:00:00Z
---

# Phase 11 Plan 02: Output Tab 2-Step Refine UI — Summary

**Rewired refine() to chain POST /api/refine → POST /api/generate with "Correcting extraction…" → "Generating…" labels; fixed latent bug where activeOutput.id wasn't updated after a refine cycle.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10 min |
| Tasks | 1 completed |
| Files modified | 1 |
| Typecheck errors | 0 |
| Commit | `54b4c36` |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Two-step loading labels | **Pass** | refineStep drives label — "correcting" → "Correcting extraction…", "generating" → "Generating…" |
| AC-2: Image updates + iteration increments | **Pass** | setOutputs updates image_url + image_provider; iteration from refineData |
| AC-3: activeOutput.id tracks new prompt_output_id | **Pass** | o.id updated to refineData.prompt_output_id in setOutputs |
| AC-4: Error handling — each step fails cleanly | **Pass** | content-type check before res.json() on both refineRes and genRes |
| AC-5: TypeScript passes | **Pass** | pnpm typecheck clean |

## Accomplishments

- **2-step refine flow**: POST /api/refine (Agent E + B2) then POST /api/generate — each with its own timeout budget and loading label
- **Latent bug fixed**: `activeOutput.id` now updates to `refineData.prompt_output_id` so the next Evaluate correctly queries the new generated image (was silently using the stale output ID before)
- **Timeout resilience**: both fetch error paths guard against non-JSON responses (Vercel HTML error pages)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Rewrite refine() | `54b4c36` | feat(output-tab): 2-step refine flow — correcting → generating |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/projects/[id]/output-tab.tsx` | Modified | refineStep state, 2-step refine(), updated button label, handleSelectChange reset |

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Next Phase Readiness

**Ready:**
- Phase 11 complete — full schema-corrective refinement loop is live
- correction_memories table populated by /api/refine whenever dimensions fail
- Vercel deploy unblocked — both Plan 11-01 + 11-02 shipped together

**Concerns:**
- Phase 12 (embedding compute) requires a Google `text-embedding-004` API call after each Agent E correction. The embedding model needs confirming is accessible with the existing GEMINI_API_KEY (it should be, same Google AI Studio key).

**Blockers:**
- None

---
*Phase: 11-schema-corrective-refinement, Plan: 11-02*
*Completed: 2026-04-02*
